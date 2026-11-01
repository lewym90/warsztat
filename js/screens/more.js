import { route, render } from '../router.js';
import { $, $$, APP_VERSION, esc, toast, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { offlineMeta } from '../offline.js';
import { bindSettings, settingsHtml } from '../prefs.js';
import { bindInstall, installBannerHtml } from '../install.js';
import { restoreBackup, restoreSnapshot, saveBackupFile, snapshots } from '../backup.js';
import { countPhotos } from '../photos.js';
import * as S from '../store.js';

/* ---------- WIĘCEJ ---------- */
async function moreScreen() {
  const reqs = S.requests();
  return {
    tab: '#/more',
    html: `${topbar({ title: 'Więcej', sub: `Warsztat ${APP_VERSION}` })}
    <div class="wrap">
      <div class="section-h">${icon('refresh', 16)} Aktualizacja</div>
      <div class="card pad" style="display:grid;gap:10px">
        <p style="color:var(--muted);font-size:14px;margin:0">Aplikacja sama sprawdza nową wersję co 2 minuty i po powrocie do niej. Jeśli coś wygląda staro, odśwież ją ręcznie. Twoje auta i postęp napraw zostają.</p>
        <button class="btn primary block" id="hard-refresh">${icon('refresh', 18)} Odśwież aplikację teraz</button>
      </div>
      <div class="section-h">${icon('shield', 16)} Jak czytać oznaczenia</div>
      <div class="card pad" style="display:grid;gap:12px">
        <div class="conf high"><i></i><span><b style="color:var(--text)">Wysoka:</b> krok potwierdzony w co najmniej dwóch niezależnych źródłach lub w instrukcji fabrycznej.</span></div>
        <div class="conf med"><i></i><span><b style="color:var(--text)">Średnia:</b> jedno źródło (np. relacja z forum). Sprawdź na miejscu.</span></div>
        <div class="conf low"><i></i><span><b style="color:var(--text)">Niska:</b> szkic lub analogia. Zweryfikuj, zanim zaufasz.</span></div>
        <p style="color:var(--muted);font-size:13.5px">Numerów części i momentów dokręcania nie zgadujemy. Gdy źródła ich nie podają, karta mówi to wprost.</p>
      </div>
      <div class="section-h">${icon('eye', 16)} Wygląd i ekran</div>
      ${settingsHtml()}
      ${installBannerHtml()}
      <div class="section-h">${icon('download', 16)} Kopia zapasowa</div>
      <div class="card pad" style="display:grid;gap:10px">
        <p style="color:var(--muted);font-size:14px;margin:0">Auta, postęp, notatki, książka serwisowa i Twoje zdjęcia są tylko w tym urządzeniu. Aplikacja robi sama migawkę raz na dobę (zostaje 5 ostatnich) i przypomina raz w tygodniu o kopii poza telefonem.</p>
        <p class="foot" id="bk-info" style="margin:0"></p>
        <button class="btn primary block" id="exp">${icon('download', 18)} Zapisz kopię do Plików / pobierz</button>
        <div class="row2"><button class="btn" id="imp">${icon('upload', 18)} Połącz z plikiem</button><button class="btn" id="imp2">Zastąp danymi z pliku</button></div>
        <input type="file" id="impfile" accept="application/json" hidden>
        <details class="snaps"><summary>Migawki automatyczne</summary><div id="snaplist" class="kv"></div></details>
      </div>
      <div class="section-h">${icon('refresh', 16)} Telefon i komputer</div>
      <div class="card pad" style="display:grid;gap:10px">
        <p style="color:var(--muted);font-size:14px;margin:0">Połącz dane dwóch urządzeń kodami QR albo plikiem. Nic nie jest kasowane.</p>
        <a class="btn block" href="#/sync">${icon('refresh', 18)} Synchronizacja</a>
      </div>
      <div class="section-h">${icon('wrench', 16)} Zlecone opracowania <span class="count">${reqs.length}</span></div>
      <div class="card">${reqs.length ? `<div class="kv">${reqs.slice().reverse().map(r => `<div><span>${new Date(r.ts).toLocaleDateString('pl-PL')}</span><b>${esc(r.car)}: ${esc(r.topic)}</b></div>`).join('')}</div>` : `<div class="pad" style="padding:16px;color:var(--muted);font-size:14px">Brak. Gdy zamówisz opracowanie dla nowego auta, pojawi się tutaj.</div>`}</div>
      <div class="section-h">${icon('info', 16)} O aplikacji</div>
      <div class="card"><div class="kv">
        <div><span>Wersja</span><b>${APP_VERSION}</b></div>
        <div><span>Paczki wiedzy</span><b>BMW X5 (E53) · prototyp</b></div>
        <div><span>Działanie offline</span><b id="offl">sprawdzam…</b></div>
        <div><span>Offline na dziś</span><b id="offl2">…</b></div>
      </div></div>
      <p class="foot">Warsztat to prywatne narzędzie. Instrukcje są opracowaniami własnymi na podstawie publicznych źródeł, nie oficjalnymi podręcznikami producentów. Prace przy układach bezpieczeństwa (poduszki, hamulce, zawieszenie) wykonuj ostrożnie, a w razie wątpliwości zleć warsztatowi.</p>
    </div>`,
    bind(el) {
      bindSettings(el); bindInstall(el);
      const info = $('#bk-info', el), meta = S.backupMeta();
      countPhotos().catch(() => 0).then(n => { info.textContent = `Ostatnia kopia do pliku: ${meta.lastExport ? new Date(meta.lastExport).toLocaleDateString('pl-PL') : 'jeszcze nie robiono'}. Zdjęć w aplikacji: ${n}.`; });
      $('#exp', el).onclick = async () => { try { const r = await saveBackupFile(); if (r.how !== 'cancel') toast(r.how === 'share' ? 'Kopia gotowa' : 'Kopia pobrana'); render(); } catch (err) { toast(err.message || 'Nie udało się zapisać kopii'); } };
      let mode = 'merge';
      $('#imp', el).onclick = () => { mode = 'merge'; $('#impfile', el).click(); };
      $('#imp2', el).onclick = () => { if (confirm('Zastąpić wszystkie dane tego urządzenia danymi z pliku?')) { mode = 'replace'; $('#impfile', el).click(); } };
      $('#impfile', el).onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        try { const r = await restoreBackup(await f.text(), mode); toast(`Wczytano. Aut: ${r.cars}, zdjęć: ${r.photos}`); location.hash = '#/'; render(); } catch (err) { toast(err.message || 'Nie udało się wczytać pliku'); }
        e.target.value = '';
      };
      snapshots().then(list => {
        const box = $('#snaplist', el);
        box.innerHTML = list.length ? list.map(x => `<div class="plpart"><span><b>${new Date(x.ts).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })}</b><small>Aut: ${x.state.cars.length}</small></span><button class="btn small" data-snap="${x.id}">Przywróć</button></div>`).join('') : '<div class="pad" style="padding:12px;color:var(--muted)">Pierwsza migawka powstanie dziś.</div>';
        $$('[data-snap]', box).forEach(b => b.onclick = async () => { if (confirm('Przywrócić stan z tej migawki? Obecne dane zostaną zastąpione.')) { await restoreSnapshot(b.dataset.snap); toast('Przywrócono'); location.hash = '#/'; render(); } });
      }).catch(() => { $('#snaplist', el).textContent = 'Migawki niedostępne w tej przeglądarce.'; });
      const hr = $('#hard-refresh', el); if (hr) hr.onclick = hardRefresh;
      const m = offlineMeta(); $('#offl2', el).textContent = m ? `zapisane do ${new Date(m.ts + 86400000).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}` : 'nic nie zapisano';
      const off = $('#offl', el);
      off.textContent = 'serviceWorker' in navigator && navigator.serviceWorker.controller ? 'aktywne' : 'włączy się po pierwszym odświeżeniu';
    }
  };
}

/* ---------- odświeżanie aplikacji (także w zainstalowanej, bez paska przeglądarki) ---------- */
async function hardRefresh() {
  toast('Aktualizuję aplikację...');
  try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (_) {}
  try { for (const k of await caches.keys()) await caches.delete(k); } catch (_) {}
  try { sessionStorage.removeItem('healed'); } catch (_) {}
  location.reload();
}
window.addEventListener('keydown', e => { if ((e.key === 'F5') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) { e.preventDefault(); hardRefresh(); } });

route(/^more$/, moreScreen);
