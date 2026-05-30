const CACHE = 'scar-v1';
const ASSETS = [
  './',
  './index.html',
  './scar_data.js',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&family=Barlow+Condensed:wght@600;700&display=swap',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/20/35',
];

// Install: cache all core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache critical assets, ignore failures on optional ones
      return Promise.allSettled(ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app assets, network-first for map tiles
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Map tiles: network first, fall back to cache (tiles may not be cached)
  if (url.hostname.includes('arcgisonline.com') || 
      url.hostname.includes('tile.openstreetmap.org')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Cache tile for offline use
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
