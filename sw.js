const CACHE_NAME = 'nanny-ledger-v1';

// We want to aggressively cache our main local files
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event - caches the essential files immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Forces the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate Event - cleans up old caches if we ever change CACHE_NAME
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate strategy
// This checks the cache first (making it fast and offline-capable), 
// but also fetches from the network in the background to keep the cache fresh.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache valid local responses, skip caching external CDNs to avoid breaking things
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed (offline). We already returned the cachedResponse below if it exists.
        // If it doesn't exist, the app simply won't load external CDNs offline.
      });

      // Return the cached response immediately if we have it, otherwise wait for the network fetch
      return cachedResponse || fetchPromise;
    })
  );
});
