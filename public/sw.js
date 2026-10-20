self.options = {
    "domain": "5gvci.com",
    "zoneId": 12081300
}
self.lary = ""
importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')

// JPGEASY Modern Offline Service Worker
// Keeps the user on the site during connection loss / refresh instead of showing the browser offline page
const CACHE_NAME = 'jpgeasy-v2';

const PRECACHE_URLS = [
  '/',
  '/favicon.ico',
  '/favicon.png',
  '/logo-light.png',
  '/logo-dark.png',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // When connection is lost / offline:
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // If it's a page reload or navigation, serve cached page so it stays on the website instead of dino page
        if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
          const fallback = (await caches.match(event.request.url)) || (await caches.match('/'));
          if (fallback) return fallback;
        }

        return new Response('Connection lost', { status: 503, statusText: 'Offline' });
      })
  );
});
