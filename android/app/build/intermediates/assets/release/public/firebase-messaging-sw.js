// Firebase Messaging Service Worker
// This file must be in the public folder

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration - these will be replaced with actual values
// or you can use the Firebase console to auto-generate this file
const firebaseConfig = {
    apiKey: "REPLACE_WITH_YOUR_API_KEY",
    authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
    projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
    storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
    messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
    appId: "REPLACE_WITH_YOUR_APP_ID",
    measurementId: "REPLACE_WITH_YOUR_MEASUREMENT_ID"
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'DTPS Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: payload.notification?.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        image: payload.notification?.image,
        data: payload.data || {},
        tag: payload.data?.tag || 'dtps-notification',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Open'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click:', event);

    event.notification.close();

    const action = event.action;
    const data = event.notification.data || {};

    // Handle different actions
    if (action === 'close') {
        return;
    }

    // Get the URL to open
    let urlToOpen = data.clickAction || data.url || '/';

    // Ensure the URL is absolute
    if (!urlToOpen.startsWith('http')) {
        urlToOpen = self.location.origin + (urlToOpen.startsWith('/') ? '' : '/') + urlToOpen;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there's already a window open with this URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }

            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Handle push events directly (fallback)
self.addEventListener('push', (event) => {
    console.log('[firebase-messaging-sw.js] Push event received');

    if (event.data) {
        try {
            const data = event.data.json();
            console.log('[firebase-messaging-sw.js] Push data:', data);
        } catch (e) {
            console.log('[firebase-messaging-sw.js] Push text:', event.data.text());
        }
    }
});

// Service worker activation
self.addEventListener('activate', (event) => {
    console.log('[firebase-messaging-sw.js] Service Worker activated');
    event.waitUntil(self.clients.claim());
});

// Service worker installation
self.addEventListener('install', (event) => {
    console.log('[firebase-messaging-sw.js] Service Worker installed');
    self.skipWaiting();
});
