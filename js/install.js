// Podpowiedź instalacji aplikacji na ekranie głównym (iPhone: ręcznie przez Udostępnij; Android/komputer: przycisk).
import * as S from './store.js';
import { icon } from './icons.js';

let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
export const isStandalone = () => (typeof navigator !== 'undefined' && navigator.standalone === true) || (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches);
export const isIOS = (ua = navigator.userAgent, touch = navigator.maxTouchPoints) => /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && touch > 1);
export const canPromptInstall = () => !!deferred;
export async function promptInstall() { if (!deferred) return false; deferred.prompt(); const r = await deferred.userChoice; deferred = null; return r.outcome === 'accepted'; }
export function installBannerHtml() {
  if (isStandalone() || Date.now() - (S.prefs().installDismissed || 0) < 14 * 86400000) return '';
  if (isIOS()) return `<div class="note info install" data-install>${icon('download', 22)}<div><b>Dodaj Warsztat do ekranu głównego</b><p>W Safari dotknij „Udostępnij” (kwadrat ze strzałką), a potem „Do ekranu początkowego”. Aplikacja będzie działać jak zwykła, na pełnym ekranie.</p><button class="btn small" data-install-x>Nie teraz</button></div></div>`;
  if (deferred) return `<div class="note info install" data-install>${icon('download', 22)}<div><b>Zainstaluj Warsztat</b><p>Aplikacja otworzy się na pełnym ekranie i będzie działać szybciej.</p><div class="row2"><button class="btn small primary" data-install-go>Zainstaluj</button><button class="btn small" data-install-x>Nie teraz</button></div></div></div>`;
  return '';
}
export function bindInstall(root, rerender) {
  const x = root.querySelector('[data-install-x]'), g = root.querySelector('[data-install-go]');
  if (x) x.onclick = () => { S.setPref('installDismissed', Date.now()); const b = root.querySelector('[data-install]'); if (b) b.remove(); };
  if (g) g.onclick = async () => { await promptInstall(); rerender && rerender(); };
}
