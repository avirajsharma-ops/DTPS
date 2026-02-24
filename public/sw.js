// App-Shell Service Worker for DTPS
// Caches static assets + page shells for fast loads and offline support
// Works alongside firebase-messaging-sw.js (which handles push notifications)

const CACHE_VERSION = 'dtps-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/images/dtps-logo.png',
];

// URL patterns that should use cache-first strategy (static assets)
const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /^\/icons\//,
  /^\/images\//,
  /^\/fonts\//,
  /\.woff2?$/,
  /\.ttf$/,
];

// Page routes that should use stale-while-revalidate strategy
const PAGE_PATTERNS = [
  /^\/user(\/|$)/,
  /^\/client-auth\//,
];

// API routes that can be briefly cached for offline resilience (GET only)
const CACHEABLE_API_PATTERNS = [
  /^\/api\/client\/blogs/,
  /^\/api\/client\/profile/,
  /^\/api\/client\/service-plans$/,
  /^\/api\/client\/meal-plan/,
];

// API routes that should NEVER be cached
const NEVER_CACHE_API = [
  /^\/api\/auth/,
  /^\/api\/client\/onboarding/,
  /^\/api\/payment/,
  /^\/api\/firebase-config/,
];

// Install: pre-cache essential shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        // Don't fail install if some assets are missing
        return Promise.allSettled(
          PRECACHE_URLS.map((url) => cache.add(url).catch(() => {}))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('dtps-') && !name.startsWith(CACHE_VERSION))
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Helper: determine the caching strategy for a request
function getStrategy(url) {
  const pathname = new URL(url).pathname;

  // Never cache auth or payment APIs
  if (NEVER_CACHE_API.some((p) => p.test(pathname))) {
    return 'network-only';
  }

  // Static assets: cache-first (immutable)
  if (STATIC_PATTERNS.some((p) => p.test(pathname))) {
    return 'cache-first';
  }

  // Page navigations: stale-while-revalidate
  if (PAGE_PATTERNS.some((p) => p.test(pathname))) {
    return 'stale-while-revalidate';
  }

  // Cacheable GET APIs: network-first with short cache fallback
  if (CACHEABLE_API_PATTERNS.some((p) => p.test(pathname))) {
    return 'network-first';
  }

  // Everything else: network only
  return 'network-only';
}

// Helper: get the appropriate cache name
function getCacheName(strategy) {
  switch (strategy) {
    case 'cache-first':
      return STATIC_CACHE;
    case 'stale-while-revalidate':
      return PAGE_CACHE;
    case 'network-first':
      return API_CACHE;
    default:
      return null;
  }
}

// Cache-first: serve from cache, fallback to network
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // If offline and no cache, return a basic offline response
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale-while-revalidate: serve from cache immediately, update cache in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always fetch fresh version in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok && response.type !== 'opaqueredirect') {
        // Only cache HTML responses for pages, not redirects
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html') || contentType.includes('application/json')) {
          cache.put(request, response.clone());
        }
      }
      return response;
    })
    .catch((error) => {
      // Network failed — if we have a cached version, that was already returned
      // If not, return an offline page
      if (!cached) {
        return new Response(getOfflineHTML(), {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      }
      return cached;
    });

  // Return cached version immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

// Network-first: try network, fallback to cache (for API data)
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension, data URLs, etc.
  if (!request.url.startsWith('http')) return;

  // Skip cross-origin requests (CDN scripts, analytics, etc.)
  // but allow same-origin
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const strategy = getStrategy(request.url);
  const cacheName = getCacheName(strategy);

  if (strategy === 'network-only' || !cacheName) return;

  if (strategy === 'cache-first') {
    event.respondWith(cacheFirst(request, cacheName));
  } else if (strategy === 'stale-while-revalidate') {
    event.respondWith(staleWhileRevalidate(request, cacheName));
  } else if (strategy === 'network-first') {
    event.respondWith(networkFirst(request, cacheName));
  }
});

// Listen for messages from the app (e.g., cache invalidation)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_PAGE_CACHE':
      caches.delete(PAGE_CACHE);
      break;

    case 'CLEAR_API_CACHE':
      caches.delete(API_CACHE);
      break;

    case 'CLEAR_ALL_CACHES':
      caches.keys().then((names) => {
        names.filter((n) => n.startsWith('dtps-')).forEach((n) => caches.delete(n));
      });
      break;

    case 'CACHE_URLS':
      // Pre-cache specific URLs (e.g., after navigation)
      if (payload && Array.isArray(payload.urls)) {
        caches.open(PAGE_CACHE).then((cache) => {
          payload.urls.forEach((url) => cache.add(url).catch(() => {}));
        });
      }
      break;
  }
});

// Minimal offline HTML shell
function getOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>DTPS - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #374151;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
      border-radius: 12px;
      background: #E06A26;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      font-weight: bold;
    }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #6b7280; margin-bottom: 1.5rem; line-height: 1.5; }
    button {
      background: #E06A26;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:active { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">D</div>
    <h1>You're Offline</h1>
    <p>Please check your internet connection and try again.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>`;
}
