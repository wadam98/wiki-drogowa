// Service worker: powłoka aplikacji i dane (stale-while-revalidate), biblioteka PDF.js z CDN.
// PDF-y (pdf/*) NIE przechodzą przez ten cache – przeglądarka PDF zapisuje je sama w 'wiki-drogowa-pdf'
// na życzenie użytkownika. Po zmianie app.js / style.css / danych podbij numer wersji.
const CACHE = 'wiki-drogowa-v2';
const KEEP = [CACHE, 'wiki-drogowa-pdf'];
const CORE = ['./', './index.html', './style.css', './app.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.png',
  './data/registry.json', './data/wiki.json', './data/fazy.json'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map(async u => { try { const r = await fetch(u, { cache: 'reload' }); if (r.ok) await c.put(u, r); } catch (err) { } }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !KEEP.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const lib = url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/pdfjs-dist@');
  if ((!same && !lib) || url.pathname.includes('/pdf/')) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(key);
    const net = fetch(req).then(async r => { if (r && r.ok && r.status === 200) await cache.put(key, r.clone()); return r; })
      .catch(() => hit || Response.error());
    return hit || net;
  })());
});
