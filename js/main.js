import * as S from './store.js';
import { render } from './router.js';
import './offline-ui.js';
import './screens/garage.js';
import './screens/add.js';
import './screens/more.js';
import './screens/car.js';
import './screens/sys.js';
import './screens/zone.js';
import './screens/repair.js';

/* ---------- start ---------- */
window.__warsztatOK = true;
S.init();
// Wzbogacenie indeksu napraw o postęp (liczba kroków) wymaga pack.repairs — dostarcza build.py.
render();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  // po aktualizacji aplikacji (nowy service worker przejmuje kontrolę) odśwież widok jednorazowo
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => {
    r.update();
    // automatyczne sprawdzanie nowej wersji: co 2 minuty i po powrocie do aplikacji
    const check = () => r.update().catch(() => {});
    setInterval(check, 120000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    window.addEventListener('focus', check);
  }).catch(() => {}));
}
