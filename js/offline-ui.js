import { $, esc } from './ui.js';
import { icon } from './icons.js';
import { fmtLeft, offlineExpire, offlineLeft, offlineMeta, saveOffline } from './offline.js';

/* ---------- offline na dziś ---------- */
export function offlineCardHtml(label) {
  const m = offlineMeta();
  return `<div class="card pad offcard" data-off><div class="offhead">${icon('download', 18)}<b>Offline na dziś</b></div>
    <p class="offp" data-offtxt>${m ? `Zapisane na urządzeniu. Wygasa za ${fmtLeft(offlineLeft(m))}.` : `Zapisuje zdjęcia, grafiki i karty (${esc(label)}) na 24 godziny, żeby działały bez zasięgu. Zrób to z Wi-Fi, zanim zejdziesz do garażu.`}</p>
    <div class="row2"><button class="btn primary" data-offsave>${icon('download', 18)} Zapisz offline</button><button class="btn" data-offdel ${m ? '' : 'hidden'}>Usuń teraz</button></div>
    <div data-offfilms></div></div>`;
}
function paintOfflineFilms(el) {
  const m = offlineMeta(); const box = $('[data-offfilms]', el); if (!box) return;
  box.innerHTML = m && m.films && m.films.length ? `<div class="offfilms"><b>Filmy do pobrania w aplikacji YouTube (Premium) przed zejściem:</b>${m.films.map(f => `<a href="https://www.youtube.com/watch?v=${esc(f.id)}" target="_blank" rel="noopener">${icon('link', 14)} ${esc(f.from)}: film ${esc(f.len || '')}</a>`).join('')}<small>YouTube nie pozwala zapisać filmu w tej aplikacji. Pobieranie jest w aplikacji YouTube z Premium (przycisk „Pobierz”).</small></div>` : '';
}
export function bindOffline(el, packId, ids) {
  const card = $('[data-off]', el); if (!card) return;
  const txt = $('[data-offtxt]', card), sv = $('[data-offsave]', card), dl = $('[data-offdel]', card);
  paintOfflineFilms(card);
  sv.onclick = async () => {
    sv.disabled = true;
    try {
      const meta = await saveOffline(packId, ids, (d, t) => { txt.textContent = `Zapisuję… ${d}/${t}`; });
      txt.textContent = `Zapisane. Wygasa za ${fmtLeft(offlineLeft(meta))}.${meta.fail ? ` Nie udało się zapisać ${meta.fail} zdjęć z obcych stron (będą widoczne tylko online).` : ''}`;
      dl.hidden = false; paintOfflineFilms(card);
    } catch (e) { txt.textContent = 'Nie udało się zapisać (brak miejsca lub sieci). Spróbuj ponownie z Wi-Fi.'; }
    sv.disabled = false;
  };
  dl.onclick = async () => { await offlineExpire(true); txt.textContent = 'Usunięto. Aplikacja działa tylko online.'; dl.hidden = true; paintOfflineFilms(card); };
}
offlineExpire();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') offlineExpire(); });
const setOnl = () => document.body.classList.toggle('is-offline', !navigator.onLine);
window.addEventListener('online', setOnl); window.addEventListener('offline', setOnl); setOnl();

