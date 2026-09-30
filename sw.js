// Service worker: powłoka aplikacji z cache, dane (data/*) stale-while-revalidate.
// Po zmianie app.js / style.css / danych podbij numer wersji.
const CACHE = 'wiki-drogowa-v1';
const CORE = ['./', './index.html', './style.css', './app.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.png',
  './data/registry.json', './data/wiki.json'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map(async u => { try { const r = await fetch(u, { cache: 'reload' }); if (r.ok) await c.put(u, r); } catch (err) { } }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // czcionki itp. – bez ingerencji
  const key = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(key);
    const net = fetch(req).then(async r => { if (r && r.ok) await cache.put(key, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })());
});
