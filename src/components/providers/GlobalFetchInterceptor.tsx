'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Global fetch interceptor that adds:
 * 1. Cache-busting headers to prevent stale cached responses
 * 2. Retry logic for failed requests (401s and 500s)
 * 3. Automatic credential inclusion
 * 
 * This solves the race condition where fetch happens before session is ready.
 */
export function GlobalFetchInterceptor() {
  const { status } = useSession();

  useEffect(() => {
    // Only install interceptor after session status is determined
    // This prevents issues during SSR
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    let interceptorInstalled = false;

    // Retry configuration
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 300; // ms

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchWithRetry = async (
      input: RequestInfo | URL,
      init?: RequestInit,
      retriesLeft: number = MAX_RETRIES
    ): Promise<Response> => {
      // Get the URL string
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // Only intercept API calls and same-origin requests
      const isApiCall = url.startsWith('/api') || url.startsWith(window.location.origin + '/api');
      const isAuthCall = url.includes('/api/auth');
      
      // Skip interception for external URLs, auth calls, and non-API calls
      if (!isApiCall || isAuthCall) {
        return originalFetch(input, init);
      }

      // Add cache-busting and credential headers for API calls
      const modifiedInit: RequestInit = {
        ...init,
        credentials: 'same-origin',
        headers: {
          ...init?.headers,
          // Only add cache headers if not already set
          ...(!(init?.headers as Record<string, string>)?.['Cache-Control'] && {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }),
        },
      };

      try {
        const response = await originalFetch(input, modifiedInit);
        
        // Retry on 401 Unauthorized (session might not be ready)
        if (response.status === 401 && retriesLeft > 0 && !isAuthCall) {
          // Clone the response for reading (in case we need to return it)
          const clonedResponse = response.clone();
          
          // Check if it's a session-related 401
          try {
            const data = await clonedResponse.json();
            // If it's a "not authenticated" type error, retry
            if (data?.error?.includes('authenticated') || data?.error?.includes('Unauthorized') || data?.message?.includes('authenticated')) {
              await sleep(RETRY_DELAY * (MAX_RETRIES - retriesLeft + 1));
              return fetchWithRetry(input, init, retriesLeft - 1);
            }
          } catch {
            // If we can't parse JSON, still retry
            await sleep(RETRY_DELAY * (MAX_RETRIES - retriesLeft + 1));
            return fetchWithRetry(input, init, retriesLeft - 1);
          }
        }
        
        // Retry on server errors
        if (response.status >= 500 && retriesLeft > 0) {
          await sleep(RETRY_DELAY * (MAX_RETRIES - retriesLeft + 1));
          return fetchWithRetry(input, init, retriesLeft - 1);
        }
        
        return response;
      } catch (error) {
        // Retry on network errors
        if (retriesLeft > 0 && error instanceof Error && !error.name.includes('Abort')) {
          await sleep(RETRY_DELAY * (MAX_RETRIES - retriesLeft + 1));
          return fetchWithRetry(input, init, retriesLeft - 1);
        }
        throw error;
      }
    };

    // Only install the interceptor once and after session is available
    if (!interceptorInstalled && status !== 'loading') {
      window.fetch = fetchWithRetry;
      interceptorInstalled = true;
    }

    // Cleanup - restore original fetch on unmount
    return () => {
      if (interceptorInstalled) {
        window.fetch = originalFetch;
      }
    };
  }, [status]);

  // This component doesn't render anything
  return null;
}

export default GlobalFetchInterceptor;
