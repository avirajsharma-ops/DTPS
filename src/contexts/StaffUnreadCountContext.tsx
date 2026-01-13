'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface UnreadCounts {
  messages: number;
}

interface StaffUnreadCountContextType {
  counts: UnreadCounts;
  refreshCounts: () => Promise<void>;
  isConnected: boolean;
}

const StaffUnreadCountContext = createContext<StaffUnreadCountContextType | undefined>(undefined);

interface StaffUnreadCountProviderProps {
  children: ReactNode;
}

// Exponential backoff configuration
const INITIAL_DELAY = 1000;
const MAX_DELAY = 30000;
const MAX_RETRIES = 10;
const BACKOFF_MULTIPLIER = 2;

function calculateBackoff(attempt: number): number {
  const delay = INITIAL_DELAY * Math.pow(BACKOFF_MULTIPLIER, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, MAX_DELAY);
}

export function StaffUnreadCountProvider({ children }: StaffUnreadCountProviderProps) {
  const { data: session, status } = useSession();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to SSE stream for unread counts with resilient reconnection
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) {
      return;
    }

    const connect = () => {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/staff/unread-counts/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('[StaffUnreadCountProvider] SSE connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setCounts({
            messages: data.messages || 0
          });
        } catch (error) {
          // Ignore heartbeat or malformed messages
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Implement exponential backoff for reconnection
        if (reconnectAttemptsRef.current < MAX_RETRIES) {
          const delay = calculateBackoff(reconnectAttemptsRef.current);
          console.log(`[StaffUnreadCountProvider] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RETRIES})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.warn('[StaffUnreadCountProvider] Max retries exceeded, stopping reconnection');
        }
      };
    };

    connect();

    // Handle visibility change - reconnect when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !eventSourceRef.current) {
        console.log('[StaffUnreadCountProvider] Tab visible, reconnecting...');
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };

    // Handle online event - reconnect when network is restored
    const handleOnline = () => {
      console.log('[StaffUnreadCountProvider] Network online, reconnecting...');
      reconnectAttemptsRef.current = 0;
      connect();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      setIsConnected(false);
    };
  }, [status, session?.user]);

  // Manual refresh function
  const refreshCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/staff/unread-counts/refresh', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setCounts({
          messages: data.messages || 0
        });
      }
    } catch (error) {
      console.error('[StaffUnreadCountProvider] Error refreshing counts:', error);
    }
  }, []);

  return (
    <StaffUnreadCountContext.Provider value={{ counts, refreshCounts, isConnected }}>
      {children}
    </StaffUnreadCountContext.Provider>
  );
}

export function useStaffUnreadCounts() {
  const context = useContext(StaffUnreadCountContext);
  if (context === undefined) {
    throw new Error('useStaffUnreadCounts must be used within a StaffUnreadCountProvider');
  }
  return context;
}

// Export a hook that's safe to use outside provider (returns defaults)
export function useStaffUnreadCountsSafe() {
  const context = useContext(StaffUnreadCountContext);
  return context || { 
    counts: { messages: 0 },
    refreshCounts: async () => {},
    isConnected: false 
  };
}
