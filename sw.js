const CACHE_NAME = 'trading-journal-v8';
// Caché dedicada para imágenes de trades (modo viaje offline).
// Va separada del app shell para que NO se borre cuando se actualiza la app.
const IMG_CACHE = 'trading-journal-images-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './challenge-styles.css',
  './app.js',
  './db.js',
  './challenge.js',
  './challenge-ui.js',
  './insights.js',
  './trade-insights.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => (key === CACHE_NAME || key === IMG_CACHE) ? null : caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Imágenes: cache-first en la caché dedicada (funciona sin internet
  // una vez descargadas con "Preparar viaje offline").
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(event.request).then(hit => {
          if (hit) return hit;
          return fetch(event.request).then(res => {
            if (res && (res.ok || res.type === 'opaque')) {
              cache.put(event.request, res.clone()).catch(() => {});
            }
            return res;
          });
        })
      ).catch(() => fetch(event.request))
    );
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request).then(response => response || caches.match('./index.html')))
  );
});
