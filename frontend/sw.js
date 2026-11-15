// BMTC Live Transit - PWA Service Worker
const CACHE_NAME = 'bmtc-transit-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network first for live transit APIs (/eta, /ping, /stops), cache first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Dynamic API calls bypass cache
  if (url.pathname.startsWith('/eta') || url.pathname.startsWith('/ping') || url.pathname.startsWith('/stops')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets: Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
