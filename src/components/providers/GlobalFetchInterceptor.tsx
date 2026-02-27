'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Global fetch interceptor that adds:
 * 1. Cache-busting headers to API routes only (not static assets/pages)
 * 2. Retry logic for failed requests (401s and 500s)
 * 3. Automatic credential inclusion
 * 
 * Optimized: Only intercepts API calls, skips static/page fetches for speed.
 */
export function GlobalFetchInterceptor() {
  const { status } = useSession();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    let interceptorInstalled = false;

    // Retry configuration — fast retries
    const MAX_RETRIES = 1; // Reduced from 2 to 1 for faster perceived response
    const RETRY_DELAY = 200; // ms (was 300)

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchWithRetry = async (
      input: RequestInfo | URL,
      init?: RequestInit,
      retriesLeft: number = MAX_RETRIES
    ): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      const isApiCall = url.startsWith('/api') || url.startsWith(window.location.origin + '/api');
      const isAuthCall = url.includes('/api/auth');
      const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);
      
      // For external URLs or non-API same-origin requests, pass through WITHOUT modification
      if (!isSameOrigin || !isApiCall) {
        return originalFetch(input, init);
      }

      // Only add cache-busting headers to mutating API calls (POST, PUT, DELETE)
      // GET requests are allowed to be cached by the service worker for offline support
      const method = (init?.method || 'GET').toUpperCase();
      const needsCacheBust = method !== 'GET' && method !== 'HEAD';

      const modifiedInit: RequestInit = {
        ...init,
        credentials: 'same-origin',
        headers: {
          ...init?.headers,
          ...(needsCacheBust ? {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          } : {}),
        },
      };

      try {
        const response = await originalFetch(input, modifiedInit);
        
        // Retry on 401 Unauthorized (session might not be ready) - skip for auth calls
        if (response.status === 401 && retriesLeft > 0 && !isAuthCall) {
          await sleep(RETRY_DELAY);
          return fetchWithRetry(input, init, retriesLeft - 1);
        }
        
        // Retry on server errors — only for GET requests
        if (response.status >= 500 && retriesLeft > 0 && method === 'GET') {
          await sleep(RETRY_DELAY);
          return fetchWithRetry(input, init, retriesLeft - 1);
        }
        
        return response;
      } catch (error) {
        // Retry on network errors (including "Failed to fetch")
        if (retriesLeft > 0 && error instanceof Error) {
          const isNetworkError = 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.name === 'TypeError' ||
            !error.name.includes('Abort');
          
          if (isNetworkError) {
            await sleep(RETRY_DELAY);
            return fetchWithRetry(input, init, retriesLeft - 1);
          }
        }
        throw error;
      }
    };

    if (!interceptorInstalled && status !== 'loading') {
      window.fetch = fetchWithRetry;
      interceptorInstalled = true;
    }

    return () => {
      if (interceptorInstalled) {
        window.fetch = originalFetch;
      }
    };
  }, [status]);

  return null;
}

export default GlobalFetchInterceptor;
