// Service worker: aplikacja działa offline po pierwszym wejściu.
// Lista plików i wersja są aktualizowane przez tools/build.py (nie edytuj ręcznie między znacznikami).
const VERSION = 'warsztat-/*V*/2a2a8abf52/*ENDV*/';
const FILES = /*FILES*/["./", "css/app.css", "data/packs/bmw-e53/catalog.json", "data/packs/bmw-e53/pack.json", "data/packs/bmw-e53/repairs/klamka-wewn.json", "data/packs/bmw-e53/repairs/klamka-zewn-przod.json", "data/packs/bmw-e53/repairs/klamka-zewn-tyl.json", "data/packs/bmw-e53/repairs/okno-podnosnik-przod.json", "data/packs/bmw-e53/repairs/silownik-zamka-przod.json", "data/packs/bmw-e53/repairs/tapicerka-przod.json", "data/packs/bmw-e53/repairs/tapicerka-tyl.json", "data/packs.json", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "img/doors/e53-front-r.webp", "img/doors/e53-front.webp", "img/doors/e53-rear-r.webp", "img/doors/e53-rear.webp", "img/x5-e53.webp", "index.html", "js/art-car.js", "js/art-door.js", "js/catalog.js", "js/data.js", "js/icons.js", "js/main.js", "js/spin.js", "js/store.js", "manifest.webmanifest"]/*ENDFILES*/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(f); return c.put(f, r); })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('warsztat-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // linki do źródeł idą prosto do sieci
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const r = await net;
    if (r) return r;
    if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
    return Response.error();
  })());
});
