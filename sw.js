// Service worker: aplikacja działa offline po pierwszym wejściu.
// Lista plików i wersja są aktualizowane przez tools/build.py (nie edytuj ręcznie między znacznikami).
const OFFLINE = 'offline-24h';
const VERSION = 'warsztat-/*V*/11f1ebcd46/*ENDV*/';
const FILES = /*FILES*/["./", "css/app.css", "data/packs/bmw-e53/catalog.json", "data/packs/bmw-e53/pack.json", "data/packs/bmw-e53/repairs/klamka-wewn.json", "data/packs/bmw-e53/repairs/klamka-zewn-przod.json", "data/packs/bmw-e53/repairs/klamka-zewn-tyl.json", "data/packs/bmw-e53/repairs/lusterko-szklo.json", "data/packs/bmw-e53/repairs/lusterko-wymiana.json", "data/packs/bmw-e53/repairs/okno-podnosnik-przod.json", "data/packs/bmw-e53/repairs/okno-podnosnik-tyl.json", "data/packs/bmw-e53/repairs/okno-silnik.json", "data/packs/bmw-e53/repairs/okno-szyba.json", "data/packs/bmw-e53/repairs/silownik-zamka-przod.json", "data/packs/bmw-e53/repairs/tapicerka-przod.json", "data/packs/bmw-e53/repairs/tapicerka-tyl.json", "data/packs/bmw-e53/repairs/uszczelka-obwodowa.json", "data/packs/bmw-e53/repairs/uszczelka-szyby.json", "data/packs.json", "eslint.config.mjs", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "img/doors/e53-front-r.webp", "img/doors/e53-front.webp", "img/doors/e53-rear-r.webp", "img/doors/e53-rear.webp", "img/ui/garaz-e53.webp", "img/ui/start-e53.webp", "img/ui/studio.webp", "img/x5-e53.webp", "img/zones/e53-doors.webp", "img/zones/e53-hood.webp", "img/zones/e53-interior.webp", "img/zones/e53-service.webp", "img/zones/e53-tail.webp", "img/zones/e53-under.webp", "img/zones/e53-wheels.webp", "index.html", "js/art-car.js", "js/art-door.js", "js/backup.js", "js/book-ui.js", "js/catalog.js", "js/data.js", "js/icons.js", "js/install.js", "js/logo.js", "js/main.js", "js/media.js", "js/merge.js", "js/offline-ui.js", "js/offline.js", "js/photos.js", "js/plan.js", "js/prefs.js", "js/router.js", "js/safety.js", "js/screens/add.js", "js/screens/book.js", "js/screens/car.js", "js/screens/garage.js", "js/screens/home.js", "js/screens/more.js", "js/screens/plan.js", "js/screens/repair.js", "js/screens/repairs.js", "js/screens/search.js", "js/screens/sources.js", "js/screens/sync.js", "js/screens/sys.js", "js/screens/zone.js", "js/search.js", "js/spin.js", "js/store.js", "js/timer-core.js", "js/timer.js", "js/ui.js", "js/vendor/jsqr.LICENSE", "js/vendor/jsqr.js", "js/vendor/qrcode.js", "js/zones-art.js", "manifest.webmanifest"]/*ENDFILES*/;

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
  if (url.origin !== location.origin) {
    // zdjęcia z obcych stron: z pamięci "offline na dziś", a gdy jej nie ma, prosto z sieci
    if (req.destination !== 'image') return;
    e.respondWith(caches.open(OFFLINE).then(c => c.match(req.url)).then(h => h || fetch(req)));
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = (await cache.match(req, { ignoreSearch: true })) || (await (await caches.open(OFFLINE)).match(req.url));
    const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const r = await net;
    if (r) return r;
    if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
    return Response.error();
  })());
});
