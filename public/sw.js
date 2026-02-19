// Service Worker for AdminAI PWA
const CACHE_NAME = 'adminai-v1';
const urlsToCache = [
  '/',
  '/upload',
  '/archive',
  '/help',
  '/pricing'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API calls and external resources
  if (
    event.request.url.includes('/rest/v1/') ||
    event.request.url.includes('/functions/v1/') ||
    event.request.url.includes('api.openai.com') ||
    event.request.url.includes('supabase.co/storage')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        }).catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('/').then((r) => r || new Response('Offline', { status: 503, statusText: 'Offline' }));
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
      .catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/').then((r) => r || new Response('Offline', { status: 503, statusText: 'Offline' }));
        }
        return Promise.resolve(new Response('', { status: 503, statusText: 'Offline' }));
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'AdminAI',
    body: 'Új értesítés',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'adminai-notification',
    requireInteraction: false,
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || 'AdminAI',
        body: data.body || 'Új értesítés',
        icon: data.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag || 'adminai-notification',
        requireInteraction: data.urgent || false,
        data: data.data || {},
        actions: data.actions || []
      };
    } catch (e) {
      console.error('Error parsing push data:', e);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions.length > 0 ? notificationData.actions : [
        {
          action: 'open',
          title: 'Megnyitás'
        },
        {
          action: 'dismiss',
          title: 'Elrejtés'
        }
      ]
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});
