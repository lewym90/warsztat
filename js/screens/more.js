import { route, render } from '../router.js';
import { $, APP_VERSION, esc, toast, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { offlineMeta } from '../offline.js';
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
      <div class="section-h">${icon('download', 16)} Kopia zapasowa</div>
      <div class="card pad" style="display:grid;gap:10px">
        <p style="color:var(--muted);font-size:14px">Garaż, postęp i zlecenia są tylko w tym urządzeniu. Zrób kopię przed czyszczeniem danych Safari.</p>
        <div class="row2"><button class="btn" id="exp">${icon('download', 18)} Eksport</button><button class="btn" id="imp">${icon('upload', 18)} Import</button></div>
        <input type="file" id="impfile" accept="application/json" hidden>
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
      $('#exp', el).onclick = () => {
        const blob = new Blob([S.exportAll()], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `warsztat-kopia-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      };
      $('#imp', el).onclick = () => $('#impfile', el).click();
      $('#impfile', el).onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        try { S.importAll(await f.text()); toast('Kopia wczytana'); location.hash = '#/'; render(); } catch (err) { toast(err.message); }
      };
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
