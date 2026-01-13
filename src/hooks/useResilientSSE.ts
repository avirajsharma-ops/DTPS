'use client';

/**
 * Resilient SSE Client Hook
 * 
 * Production-grade SSE client with:
 * - Exponential backoff on connection failures
 * - Maximum retry attempts before giving up
 * - 503 handling without triggering logout
 * - Automatic reconnection on network recovery
 * - Connection health monitoring
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface ResilientSSEOptions {
  /** SSE endpoint URL */
  url: string;
  /** Initial reconnect delay in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum reconnect delay in ms (default: 30000) */
  maxDelay?: number;
  /** Maximum retry attempts before giving up (default: 10) */
  maxRetries?: number;
  /** Delay multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Heartbeat timeout - close if no message in this time (ms) */
  heartbeatTimeout?: number;
  /** Callback for all events */
  onEvent?: (event: { type: string; data: any }) => void;
  /** Callback when connected */
  onConnect?: () => void;
  /** Callback when disconnected */
  onDisconnect?: (reason: string) => void;
  /** Callback when max retries exceeded */
  onMaxRetriesExceeded?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether to auto-start connection (default: true) */
  autoStart?: boolean;
}

export interface ResilientSSEState {
  isConnected: boolean;
  isConnecting: boolean;
  retryCount: number;
  lastError: string | null;
  lastEventTime: number | null;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoff(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Resilient SSE hook with automatic reconnection
 */
export function useResilientSSE(options: ResilientSSEOptions) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<ResilientSSEState>({
    isConnected: false,
    isConnecting: false,
    retryCount: 0,
    lastError: null,
    lastEventTime: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const retryCountRef = useRef(0);

  const {
    url,
    initialDelay = 1000,
    maxDelay = 30000,
    maxRetries = 10,
    backoffMultiplier = 2,
    heartbeatTimeout = 60000,
    onEvent,
    onConnect,
    onDisconnect,
    onMaxRetriesExceeded,
    onError,
    autoStart = true,
  } = options;

  /**
   * Reset heartbeat timer
   */
  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      console.warn('[SSE] Heartbeat timeout - reconnecting');
      disconnect('heartbeat-timeout');
      scheduleReconnect();
    }, heartbeatTimeout);
  }, [heartbeatTimeout]);

  /**
   * Schedule a reconnection attempt
   */
  const scheduleReconnect = useCallback(() => {
    if (isUnmountedRef.current) return;
    
    // Check if max retries exceeded
    if (retryCountRef.current >= maxRetries) {
      console.error('[SSE] Max retries exceeded, giving up');
      setState(prev => ({ ...prev, isConnecting: false }));
      onMaxRetriesExceeded?.();
      return;
    }

    const delay = calculateBackoff(
      retryCountRef.current,
      initialDelay,
      maxDelay,
      backoffMultiplier
    );

    console.info(`[SSE] Scheduling reconnect in ${Math.round(delay)}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);

    retryTimeoutRef.current = setTimeout(() => {
      if (!isUnmountedRef.current) {
        retryCountRef.current++;
        connect();
      }
    }, delay);
  }, [initialDelay, maxDelay, maxRetries, backoffMultiplier, onMaxRetriesExceeded]);

  /**
   * Disconnect from SSE
   */
  const disconnect = useCallback((reason: string = 'manual') => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));

    onDisconnect?.(reason);
  }, [onDisconnect]);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (eventSourceRef.current?.readyState === EventSource.OPEN) return;
    if (status !== 'authenticated') return;

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      lastError: null,
    }));

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (isUnmountedRef.current) return;
        
        console.info('[SSE] Connected successfully');
        retryCountRef.current = 0; // Reset retry count on successful connection
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          retryCount: 0,
          lastError: null,
        }));

        resetHeartbeatTimer();
        onConnect?.();
      };

      eventSource.onerror = (event) => {
        if (isUnmountedRef.current) return;

        // Check if this is a 503 or other recoverable error
        // EventSource doesn't expose status codes directly, but we can check readyState
        const isClosed = eventSource.readyState === EventSource.CLOSED;
        
        if (isClosed) {
          console.warn('[SSE] Connection closed, will attempt to reconnect');
          
          setState(prev => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            retryCount: retryCountRef.current,
            lastError: 'Connection closed',
          }));

          onError?.(new Error('SSE connection closed'));
          
          // Don't treat as logout - this could be 503, network issue, etc.
          // Schedule reconnect with backoff
          scheduleReconnect();
        }
        // If readyState is CONNECTING, EventSource is auto-reconnecting
      };

      // Handle all message types
      eventSource.onmessage = (event) => {
        if (isUnmountedRef.current) return;
        
        resetHeartbeatTimer();
        setState(prev => ({ ...prev, lastEventTime: Date.now() }));
        
        try {
          const data = JSON.parse(event.data);
          onEvent?.({ type: 'message', data });
        } catch {
          onEvent?.({ type: 'message', data: event.data });
        }
      };

      // Register for specific event types
      const eventTypes = [
        'connected', 'heartbeat', 'new_message', 'user_online', 'user_offline',
        'typing_start', 'typing_stop', 'online_snapshot',
        'incoming_call', 'call_accepted', 'call_rejected', 'call_ended',
        'ice_candidate', 'missed_call', 'webrtc-signal',
        'appointment_booked', 'appointment_cancelled', 'appointment_updated',
        'task_created', 'task_updated', 'task_deleted',
        'other_platform_payment_updated', 'payment_updated', 'payment_link_updated',
      ];

      eventTypes.forEach(eventType => {
        eventSource.addEventListener(eventType, (event) => {
          if (isUnmountedRef.current) return;
          
          resetHeartbeatTimer();
          setState(prev => ({ ...prev, lastEventTime: Date.now() }));
          
          try {
            const data = JSON.parse((event as MessageEvent).data);
            onEvent?.({ type: eventType, data });
          } catch {
            onEvent?.({ type: eventType, data: (event as MessageEvent).data });
          }
        });
      });

    } catch (error) {
      console.error('[SSE] Failed to create connection:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        lastError: error instanceof Error ? error.message : 'Connection failed',
      }));
      onError?.(error instanceof Error ? error : new Error('Connection failed'));
      scheduleReconnect();
    }
  }, [url, status, resetHeartbeatTimer, onConnect, onEvent, onError, scheduleReconnect]);

  /**
   * Force reconnect (resets retry count)
   */
  const forceReconnect = useCallback(() => {
    retryCountRef.current = 0;
    disconnect('force-reconnect');
    
    // Small delay before reconnecting
    setTimeout(() => {
      if (!isUnmountedRef.current) {
        connect();
      }
    }, 500);
  }, [disconnect, connect]);

  /**
   * Reset retry count and attempt connection
   */
  const resetAndConnect = useCallback(() => {
    retryCountRef.current = 0;
    setState(prev => ({ ...prev, retryCount: 0 }));
    connect();
  }, [connect]);

  // Auto-start effect
  useEffect(() => {
    isUnmountedRef.current = false;

    if (autoStart && status === 'authenticated') {
      connect();
    }

    return () => {
      isUnmountedRef.current = true;
      disconnect('unmount');
    };
  }, [autoStart, status]); // Intentionally omit connect/disconnect to prevent loops

  // Handle online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.info('[SSE] Network online - reconnecting');
      resetAndConnect();
    };

    const handleOffline = () => {
      console.warn('[SSE] Network offline');
      disconnect('network-offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [resetAndConnect, disconnect]);

  // Handle visibility change (reconnect when tab becomes visible)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !state.isConnected && !state.isConnecting) {
        console.info('[SSE] Tab visible - checking connection');
        resetAndConnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isConnected, state.isConnecting, resetAndConnect]);

  return {
    ...state,
    connect,
    disconnect: () => disconnect('manual'),
    forceReconnect,
    resetAndConnect,
  };
}

export default useResilientSSE;
