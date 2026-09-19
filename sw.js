/**
 * Service worker for Qibla Compass.
 *
 * Precaches the app shell so the compass still loads offline (once visited
 * at least once). Only same-origin requests are handled here — the
 * OpenStreetMap Nominatim place-search lookups always go straight to the
 * network and are never cached, since they must reflect live results.
 *
 * Bump CACHE_NAME whenever the app shell files change, so old caches get
 * cleaned up and clients pick up the new version.
 */
const CACHE_NAME = 'qibla-compass-v7';

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/qibla.js',
  './js/geolocation.js',
  './js/placeSearch.js',
  './js/prayerTimes.js',
  './js/compass.js',
  './js/app.js',
  './assets/manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests; let everything else (Nominatim,
  // Google Fonts, etc.) pass straight through to the network untouched.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Page navigations: try the network first so updates show up promptly,
  // falling back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets: cache-first, populating the cache on first fetch.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
