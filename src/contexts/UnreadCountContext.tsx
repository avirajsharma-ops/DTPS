'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface UnreadCounts {
  notifications: number;
  messages: number;
}

interface UnreadCountContextType {
  counts: UnreadCounts;
  refreshCounts: () => Promise<void>;
  isConnected: boolean;
}

const UnreadCountContext = createContext<UnreadCountContextType | undefined>(undefined);

interface UnreadCountProviderProps {
  children: ReactNode;
}

export function UnreadCountProvider({ children }: UnreadCountProviderProps) {
  const { data: session, status } = useSession();
  const [counts, setCounts] = useState<UnreadCounts>({ notifications: 0, messages: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Connect to SSE stream
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) {
      return;
    }

    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      if (es) {
        es.close();
      }

      es = new EventSource('/api/client/unread-counts/stream');
      setEventSource(es);

      es.onopen = () => {
        console.log('[UnreadCountProvider] SSE connected');
        setIsConnected(true);
        reconnectAttempts = 0;
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[UnreadCountProvider] Received SSE update:', data);
          setCounts({
            notifications: data.notifications || 0,
            messages: data.messages || 0
          });
        } catch (error) {
          console.error('[UnreadCountProvider] Error parsing SSE data:', error);
        }
      };

      es.onerror = (error) => {
        console.error('[UnreadCountProvider] SSE error:', error);
        setIsConnected(false);
        es?.close();

        // Reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            console.log(`[UnreadCountProvider] Reconnecting... attempt ${reconnectAttempts}`);
            connect();
          }, delay);
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (es) {
        es.close();
      }
      setEventSource(null);
      setIsConnected(false);
    };
  }, [status, session?.user]);

  // Manual refresh function
  const refreshCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/client/unread-counts/refresh', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setCounts({
          notifications: data.notifications || 0,
          messages: data.messages || 0
        });
      }
    } catch (error) {
      console.error('[UnreadCountProvider] Error refreshing counts:', error);
    }
  }, []);

  // Fallback polling if SSE fails
  useEffect(() => {
    if (status !== 'authenticated' || isConnected) {
      return;
    }

    // Poll every 30 seconds as fallback
    const pollInterval = setInterval(async () => {
      try {
        const [notifRes, msgRes] = await Promise.all([
          fetch('/api/client/notifications/unread-count'),
          fetch('/api/client/messages/unread-count')
        ]);

        if (notifRes.ok && msgRes.ok) {
          const notifData = await notifRes.json();
          const msgData = await msgRes.json();
          setCounts({
            notifications: notifData.count || 0,
            messages: msgData.count || 0
          });
        }
      } catch (error) {
        console.error('[UnreadCountProvider] Polling error:', error);
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [status, isConnected]);

  return (
    <UnreadCountContext.Provider value={{ counts, refreshCounts, isConnected }}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCounts() {
  const context = useContext(UnreadCountContext);
  if (context === undefined) {
    throw new Error('useUnreadCounts must be used within an UnreadCountProvider');
  }
  return context;
}

// Export a hook that's safe to use outside provider (returns defaults)
export function useUnreadCountsSafe() {
  const context = useContext(UnreadCountContext);
  return context || { 
    counts: { notifications: 0, messages: 0 }, 
    refreshCounts: async () => {}, 
    isConnected: false 
  };
}
