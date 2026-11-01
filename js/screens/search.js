import { route } from '../router.js';
import { $, esc, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { getPack, getRepair, matchPack } from '../data.js';
import { buildIndex, search } from '../search.js';
import * as S from '../store.js';

/* ---------- SZUKAJ: kroki, części, numery OE, narzędzia ---------- */
let cache = null; // indeks budowany raz na sesję
async function loadIndex() {
  if (cache) return cache;
  const items = [];
  for (const car of S.cars()) {
    const m = await matchPack(car).catch(() => null);
    if (!m || items.find(x => x.packId === m.id)) continue;
    const pack = await getPack(m.id);
    const reps = await Promise.all(pack.repairs.map(r => getRepair(m.id, r.id).catch(() => null)));
    items.push({ packId: m.id, carId: car.id, title: pack.title, index: buildIndex(reps.filter(Boolean).map((r, i) => ({ ...r, id: pack.repairs[i].id }))) });
  }
  return (cache = items);
}
const KIND_IC = { naprawa: 'book', krok: 'wrench', część: 'key', narzędzie: 'wrench' };
async function searchScreen(q) {
  const sets = await loadIndex();
  const start = (q && q.get && q.get('q')) || '';
  return {
    tab: '#/search',
    html: `${topbar({ title: 'Szukaj', sub: 'Kroki, części, numery OE, narzędzia' })}
    <div class="wrap">
      <label class="zsearch big">${icon('search', 18)}<input id="gq" type="search" value="${esc(start)}" placeholder="np. klamka, 51218402540, torx T20" autocomplete="off" enterkeyhint="search" aria-label="Szukaj w poradnikach"></label>
      <div id="gres" aria-live="polite"></div>
      ${sets.length ? '' : `<div class="note info">${icon('info', 22)}<div><b>Brak aut z opracowaniem</b><p>Dodaj auto, aby przeszukiwać poradniki.</p></div></div>`}
    </div>`,
    bind(el) {
      const box = $('#gres', el), inp = $('#gq', el);
      const run = () => {
        const term = inp.value.trim();
        if (term.length < 2) { box.innerHTML = '<p class="foot">Wpisz co najmniej dwie litery. Szukam w opisach kroków, nazwach i numerach części oraz w narzędziach.</p>'; return; }
        const rows = sets.flatMap(s => search(s.index, term, 40).map(r => ({ ...r, carId: s.carId })));
        rows.sort((a, b) => a.score - b.score);
        box.innerHTML = rows.length ? `<div class="card"><div class="kv">${rows.slice(0, 40).map(r => `<a class="srow" href="#/car/${r.carId}/r/${r.rid}${r.step != null ? '?step=' + r.step : ''}"><span class="zi">${icon(KIND_IC[r.kind] || 'wrench', 18)}</span><span class="zt"><b>${esc(r.title)}</b><small>${esc(r.kind)} · ${esc(r.text)}</small></span>${icon('chevron', 18)}</a>`).join('')}</div></div>` : `<div class="note info">${icon('info', 22)}<div><b>Nic nie pasuje</b><p>Spróbuj krótszego słowa albo numeru części bez spacji.</p></div></div>`;
      };
      inp.addEventListener('input', run); run();
      if (!start) setTimeout(() => inp.focus(), 50);
    }
  };
}
route(/^search$/, (q) => searchScreen(q));
