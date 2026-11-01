import { route, render } from '../router.js';
import { $, $$, carName, carSub, copy, esc, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { money, openEntrySheet } from '../book-ui.js';
import * as S from '../store.js';

/* ---------- KSIĄŻKA SERWISOWA ---------- */
export const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
export function bookText(car, list) {
  return [`Książka serwisowa: ${carName(car)} (${carSub(car)})`, '', ...list.map(e => `${e.date} · ${e.km ? e.km + ' km · ' : ''}${e.title}${e.cost !== '' && e.cost != null ? ' · ' + money(e.cost) : ''}${(e.parts || []).length ? '\n   Części: ' + e.parts.join('; ') : ''}${e.note ? '\n   ' + e.note : ''}`)].join('\n');
}
async function bookScreen(carId) {
  const car = S.car(carId);
  if (!car) { location.hash = '#/'; return { html: '' }; }
  const list = S.bookEntries(carId);
  const total = list.reduce((n, e) => n + (+e.cost || 0), 0);
  return {
    tab: null,
    html: `${topbar({ back: `#/car/${carId}`, title: 'Książka serwisowa', sub: carName(car) })}
    <div class="wrap">
      <div class="chips" style="margin-bottom:12px"><span class="chip">${list.length} wpisów</span>${car.km ? `<span class="chip">Przebieg: ${car.km} km</span>` : ''}${total ? `<span class="chip">Wydane: ${money(total)}</span>` : ''}</div>
      <button class="btn primary block" id="bk-new">${icon('plus', 18)} Dodaj wpis</button>
      <div class="card" style="margin-top:12px">${list.length ? `<div class="kv bk-list">${list.map(e => `<button class="bk-row" data-e="${e.id}"><span><b>${esc(e.title)}</b><small>${esc(fmtDate(e.date))}${e.km ? ' · ' + e.km + ' km' : ''}${(e.parts || []).length ? ' · części: ' + e.parts.length : ''}</small>${e.note ? `<em>${esc(e.note)}</em>` : ''}</span><span class="bk-cost">${e.cost !== '' && e.cost != null ? money(e.cost) : ''}</span></button>`).join('')}</div>` : `<div class="pad" style="padding:16px;color:var(--muted)">Brak wpisów. Po skończonej naprawie aplikacja zaproponuje wpis, albo dodaj go tutaj ręcznie.</div>`}</div>
      ${list.length ? `<button class="btn block" id="bk-copy" style="margin-top:12px">${icon('copy', 18)} Kopiuj jako tekst</button>` : ''}
    </div>`,
    bind(el) {
      $('#bk-new', el).onclick = () => openEntrySheet(carId, {}, render);
      $$('[data-e]', el).forEach(b => b.onclick = () => openEntrySheet(carId, S.bookEntries(carId).find(x => x.id === b.dataset.e), render));
      const c = $('#bk-copy', el); if (c) c.onclick = () => copy(bookText(car, list), 'Książka skopiowana');
    }
  };
}
route(/^book\/([^/]+)$/, bookScreen);
