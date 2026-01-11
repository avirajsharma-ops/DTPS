'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { type ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
}

export default function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider 
      // Refetch session when window regains focus to detect logout/login in other tabs
      refetchOnWindowFocus={true}
      // Refetch session every 5 minutes to ensure session doesn't go stale
      refetchInterval={5 * 60}
      // Also refetch when the browser comes back online
      refetchWhenOffline={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
