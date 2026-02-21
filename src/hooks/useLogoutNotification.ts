import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';

/**
 * Hook to listen for account deactivation/suspension notifications
 * Automatically logs out user if their account is deactivated
 */
export function useLogoutNotification() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only set up listener if user is authenticated
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000; // 3 seconds

    const setupConnection = () => {
      try {
        eventSource = new EventSource('/api/auth/logout-notification');

        eventSource.onopen = () => {
          console.log('[LogoutNotification] Connected to server');
          reconnectAttempts = 0;
        };

        eventSource.addEventListener('logout', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'deactivated' || data.type === 'suspended') {
              console.log('[LogoutNotification] Account deactivated/suspended, logging out');
              // Close the event source before signing out
              if (eventSource) {
                eventSource.close();
              }
              // Sign out the user
              signOut({ 
                redirect: true, 
                callbackUrl: '/auth/signin?reason=deactivated' 
              });
            }
          } catch (error) {
            console.error('Error parsing logout event:', error);
          }
        });

        eventSource.onerror = () => {
          console.log('[LogoutNotification] Connection error, attempting to reconnect');
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            setTimeout(setupConnection, RECONNECT_DELAY);
          }
        };
      } catch (error) {
        console.error('Error setting up logout notification:', error);
      }
    };

    setupConnection();

    // Cleanup on unmount or session change
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [session?.user?.id, status]);
}
