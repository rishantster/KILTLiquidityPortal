// Service Worker for Cache Busting - KILT Liquidity Portal
const CACHE_VERSION = '2025.01.19.002';
const CACHE_NAME = `kilt-liquidity-portal-${CACHE_VERSION}`;

// Cache-busting strategy: Clear old caches on activation
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('kilt-liquidity-portal-') && cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Force cache update for HTML files and API responses
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Never cache HTML files or API responses
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store',
        headers: {
          ...event.request.headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
    );
    return;
  }
  
  // Default network-first strategy for other resources
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Listen for version updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    // Clear all caches and force reload
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      self.registration.unregister().then(() => {
        // Force clients to reload
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.navigate(client.url));
        });
      });
    });
  }
});