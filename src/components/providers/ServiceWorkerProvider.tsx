'use client';

import { useEffect, useRef } from 'react';

/**
 * ServiceWorkerProvider - Registers the app-shell service worker
 * 
 * This handles:
 * - Registering sw.js for caching static assets and page shells
 * - Auto-updating the service worker when a new version is available
 * - Exposing methods to communicate with the SW (cache invalidation)
 * 
 * Works alongside firebase-messaging-sw.js (separate scope for /firebase-*)
 */
export default function ServiceWorkerProvider() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        // Register with a specific scope to not conflict with firebase SW
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        registrationRef.current = registration;

        // Check for updates periodically (every 30 minutes)
        const updateInterval = setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 60 * 1000);

        // When a new SW is waiting, activate it immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available - activate immediately
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Reload page when new SW takes control (after update)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          // Don't force reload — the new SW will serve updated content on next navigation
        });

        return () => clearInterval(updateInterval);
      } catch (error) {
        // SW registration failure is non-critical — app works without it
        console.warn('[SW] Registration failed:', error);
      }
    };

    // Register after the page has loaded to not block initial render
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', () => registerSW(), { once: true });
    }
  }, []);

  return null;
}

// Utility functions to communicate with the service worker
export function clearPageCache() {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_PAGE_CACHE' });
  }
}

export function clearApiCache() {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_API_CACHE' });
  }
}

export function clearAllCaches() {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ALL_CACHES' });
  }
}

export function preCacheUrls(urls: string[]) {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_URLS',
      payload: { urls },
    });
  }
}
