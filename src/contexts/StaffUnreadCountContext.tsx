'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

export function StaffUnreadCountProvider({ children }: StaffUnreadCountProviderProps) {
  const { data: session, status } = useSession();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0 });
  const [isConnected, setIsConnected] = useState(false);

  // Connect to SSE stream for unread counts
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

      es = new EventSource('/api/staff/unread-counts/stream');

      es.onopen = () => {
        console.log('[StaffUnreadCountProvider] SSE connected');
        setIsConnected(true);
        reconnectAttempts = 0;
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[StaffUnreadCountProvider] Received SSE update:', data);
          setCounts({
            messages: data.messages || 0
          });
        } catch (error) {
          // Ignore heartbeat messages
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        es?.close();

        // Reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
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
