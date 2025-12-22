// Service Worker for PWA and Push Notifications
const CACHE_NAME = 'dtps-nutrition-v1';
const STATIC_CACHE_NAME = 'dtps-static-v2';
const DYNAMIC_CACHE_NAME = 'dtps-dynamic-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/client-dashboard',
  '/auth/signin',
  '/offline',
  '/manifest.json',
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/appointments/,
  /^\/api\/meal-plans/,
  /^\/api\/progress/,
  /^\/api\/user/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle page requests
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handlePageRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Check if this API should be cached
  const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));

  if (!shouldCache) {
    return fetch(request);
  }

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('Service Worker: Network failed, trying cache for', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API calls
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This data is not available offline'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle page requests with cache-first strategy for static pages
async function handlePageRequest(request) {
  try {
    // Try cache first for static pages
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the page
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, show offline page
    console.log('Service Worker: Showing offline page');
    return caches.match('/offline');
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache static assets
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset', request.url);
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data;

  // Close the notification
  notification.close();

  // Handle different actions
  if (action === 'reply' || action === 'accept' || !action) {
    // Open or focus the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Check if app is already open
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            // Focus existing window and send message
            client.focus();
            client.postMessage({
              type: 'notification-click',
              action: action || 'default',
              notificationData: data
            });
            return;
          }
        }
        
        // Open new window if app is not open
        let url = self.location.origin;
        
        // Navigate to specific page based on notification type
        if (data && data.type === 'message' && data.conversationId) {
          url += `/chat/${data.conversationId}`;
        } else if (data && data.type === 'call') {
          url += '/messages';
        }
        
        return self.clients.openWindow(url).then((client) => {
          if (client) {
            client.postMessage({
              type: 'notification-click',
              action: action || 'default',
              notificationData: data
            });
          }
        });
      })
    );
  } else if (action === 'mark-read') {
    // Handle mark as read without opening the app
    event.waitUntil(
      fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: data.conversationId })
      }).catch((error) => {
        console.error('Failed to mark message as read:', error);
      })
    );
  } else if (action === 'decline') {
    // Handle call decline without opening the app
    event.waitUntil(
      fetch('/api/calls/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: data.callId })
      }).catch((error) => {
        console.error('Failed to decline call:', error);
      })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);

  const notification = event.notification;
  const data = notification.data;

  // Forward dismissal for call notifications to the app (treat as decline)
  if (data && data.type === 'call') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'notification-click',
            action: 'decline',
            notificationData: { ...data, reason: 'dismissed' }
          });
        }
      })
    );
  }
});

// Handle push events (for future push notification implementation)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/vercel.svg',
      badge: data.badge || '/vercel.svg',
      image: data.image,
      tag: data.tag,
      data: data.data,
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      vibrate: data.vibrate || [200, 100, 200],
      timestamp: Date.now()
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'DTPS', options)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('DTPS', {
        body: 'You have a new notification',
        icon: '/vercel.svg',
        badge: '/vercel.svg'
      })
    );
  }
});

// Handle background sync (for offline message sending)
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'send-messages') {
    event.waitUntil(sendPendingMessages());
  }
});

// Function to send pending messages when back online
async function sendPendingMessages() {
  try {
    // Get pending messages from IndexedDB or localStorage
    const pendingMessages = await getPendingMessages();
    
    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          // Remove from pending messages
          await removePendingMessage(message.id);
        }
      } catch (error) {
        console.error('Failed to send pending message:', error);
      }
    }
  } catch (error) {
    console.error('Error sending pending messages:', error);
  }
}

// Helper functions for pending messages (simplified)
async function getPendingMessages() {
  // In a real implementation, you'd use IndexedDB
  return JSON.parse(localStorage.getItem('pendingMessages') || '[]');
}

async function removePendingMessage(messageId) {
  // In a real implementation, you'd use IndexedDB
  const pending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
  const filtered = pending.filter(msg => msg.id !== messageId);
  localStorage.setItem('pendingMessages', JSON.stringify(filtered));
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync for checking missed messages
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-messages') {
    event.waitUntil(checkForMissedMessages());
  }
});

async function checkForMissedMessages() {
  try {
    const response = await fetch('/api/messages/missed');
    if (response.ok) {
      const missedMessages = await response.json();
      
      for (const message of missedMessages) {
        await self.registration.showNotification(message.senderName, {
          body: message.content,
          icon: message.senderAvatar || '/vercel.svg',
          tag: `message-${message.conversationId}`,
          data: {
            type: 'message',
            conversationId: message.conversationId,
            messageId: message.id
          }
        });
      }
    }
  } catch (error) {
    console.error('Error checking for missed messages:', error);
  }
}
