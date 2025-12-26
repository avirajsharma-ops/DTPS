'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

const ENABLE_SW = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const enabled = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';

    // If disabled (local/dev default), ensure no SW is active and clear caches
    if (!enabled) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()));
      if ('caches' in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    // Enabled, but still do not register in development
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    // Production and enabled: register SW
    registerServiceWorker();
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });


      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              toast.info('App update available', {
                description: 'A new version is ready. Refresh to update.',
                action: {
                  label: 'Refresh',
                  onClick: () => window.location.reload(),
                },
                duration: 10000,
              });
            }
          });
        }
      });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'CACHE_UPDATED':
            break;
          case 'OFFLINE_READY':
            toast.success('App ready for offline use', {
              description: 'You can now use the app without an internet connection.',
            });
            break;
          case 'SYNC_COMPLETE':
            toast.success('Data synced', {
              description: 'Your offline changes have been synced.',
            });
            break;
          default:
            break;
        }
      });

      // Check if the service worker is controlling the page
      if (navigator.serviceWorker.controller) {
      }

      // Listen for service worker controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Optionally reload the page when a new service worker takes control
        // window.location.reload();
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      toast.success('Back online', {
        description: 'Your connection has been restored.',
      });
    };

    const handleOffline = () => {
      toast.warning('You are offline', {
        description: 'Some features may not be available.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register for background sync when available
  useEffect(() => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // Register background sync for appointments
        const syncAppointments = () => {
          return (registration as any).sync.register('background-sync-appointments');
        };

        // Register background sync for progress data
        const syncProgress = () => {
          return (registration as any).sync.register('background-sync-progress');
        };

        // Expose sync functions globally for use in other components
        (window as any).syncAppointments = syncAppointments;
        (window as any).syncProgress = syncProgress;
      });
    }
  }, []);

  return null; // This component doesn't render anything
}
