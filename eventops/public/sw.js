// Service Worker for EventOps PWA (U5.4 Upgrade)
const CACHE_NAME = 'eventops-v2-manifest2026';
const OFFLINE_URL = '/offline';

const URLS_TO_PRECACHE = [
  '/', // Login
  '/dashboard', // Main dash
  '/dashboard/manifest',
  '/dashboard/meetings',
  '/manifest.json',
  OFFLINE_URL
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Pre-caching offline pages');
        return cache.addAll(URLS_TO_PRECACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle navigation requests for offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Always try the network first (Stale-While-Revalidate isn't great for Auth-heavy apps on Nav)
          // Actually, "Network First, falling back to Cache" is safer for dynamic Dashboards
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          console.log('[SW] Fetch failed; returning offline page instead.', error);

          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
  } else {
    // For static assets (CSS/JS/Images), use Stale-While-Revalidate
    // This assumes Next.js handles versioning via hashes in filenames
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
  }
});      )
    )
  );
});
