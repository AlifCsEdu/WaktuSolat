/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `waktu-solat-static-${version}`;
const ASSETS = [...build, ...files]
  .filter((path) => !path.endsWith('_headers') && !path.startsWith('_'))
  .map((path) => (path.startsWith('/') ? path : `/${path}`));

// Add root and offline fallbacks if necessary
const PRECACHE_ASSETS = [
  '/',
  ...ASSETS
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Do not call self.skipWaiting() here to allow the update toast to trigger manual upgrade.
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      for (const cacheName of cacheNames) {
        if (cacheName !== CACHE_NAME) {
          await caches.delete(cacheName);
        }
      }
      await self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore non-http/s protocols
  if (!url.protocol.startsWith('http')) return;

  // Ignore API requests
  if (url.pathname.startsWith('/api/')) return;

  // Handle navigation requests (SPA routing fallback when offline)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('/')) || Response.error();
      })
    );
    return;
  }

  // Handle GeoJSON requests (Network-first caching strategy)
  if (url.pathname.endsWith('.geojson')) {
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
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);
          return cachedResponse || Response.error();
        })
    );
    return;
  }

  const isStaticAsset =
    PRECACHE_ASSETS.includes(url.pathname) ||
    url.pathname.startsWith('/_app/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/audio/') ||
    url.pathname.match(/\.(js|css|woff2|ttf|png|jpg|jpeg|svg|ico)$/) !== null;

  if (isStaticAsset) {
    // Cache-first strategy
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
  } else {
    // Stale-while-revalidate strategy for non-navigation dynamic paths
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              return cachedResponse || Response.error();
            });

          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
