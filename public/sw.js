// JPGEASY Service Worker Uninstaller & Cache Clearer
// Guarantees all legacy caches and service workers are purged immediately

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', () => {
  // Pass through directly to network, never cache or serve stale offline content
  return;
});
