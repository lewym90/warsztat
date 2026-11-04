import { route } from '../router.js';
import { $$, copy, dots, esc, fmtTime, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { getCatalog, getPack, getRepair, matchPack } from '../data.js';
import { aggregatePlan } from '../plan.js';
import * as S from '../store.js';

/* ---------- NAPRAWY: lista kart, części z całej paczki, katalog stref ---------- */
const fmtOe = oe => oe.replace(/(\d{2})(\d{2})(\d)(\d{3})(\d{3})/, '$1 $2 $3 $4 $5');
const TABS = [['list', 'Naprawy'], ['parts', 'Części'], ['catalog', 'Katalog']];
async function repairsScreen(q) {
  const car = S.currentCar();
  const tab = TABS.some(t => t[0] === q.get('tab')) ? q.get('tab') : 'list';
  const empty = msg => ({ tab: '#/repairs', html: `${topbar({ title: 'Naprawy' })}<div class="wrap"><div class="note info">${icon('info', 22)}<div><b>${esc(msg)}</b><p>Dodaj auto lub zamów opracowanie na ekranie auta.</p></div></div><a class="btn block" href="#/garage">Garaż</a></div>` });
  if (!car) return empty('Brak auta w garażu');
  const match = await matchPack(car).catch(() => null);
  if (!match) return empty('Brak opracowań dla tego auta');
  const pack = await getPack(match.id);
  let body = '', count = '';
  if (tab === 'list') {
    count = `${pack.repairs.length} kart`;
    const sorted = [...pack.repairs].sort((a, b) => (b.completeness === 'pełne') - (a.completeness === 'pełne'));
    body = `<div class="rlist">${sorted.map(r => {
      const pg = S.prog(car.id, r.id), done = Object.values(pg.steps).filter(Boolean).length, pct = r.steps ? Math.round(done / r.steps * 100) : 0;
      return `<a class="ritem" href="#/car/${car.id}/r/${r.id}"><span class="ico">${icon(r.icon || 'wrench', 22)}</span><span><b>${esc(r.title)}</b><small>${r.steps} kroków · ${fmtTime(r.time)} · ${dots(r.difficulty)}</small>${done ? `<span class="zprog"><u style="width:${pct}%"></u></span>` : ''}</span><span class="chip ${r.completeness === 'pełne' ? 'ok' : ''}">${r.completeness === 'pełne' ? 'Gotowe' : 'Wstępna'}</span></a>`;
    }).join('')}</div>`;
  } else if (tab === 'parts') {
    const reps = (await Promise.all(pack.repairs.map(r => getRepair(pack.id, r.id).catch(() => null)))).filter(Boolean);
    const { parts } = aggregatePlan(reps);
    count = `${parts.length} pozycji`;
    body = `<div class="card"><div class="kv">${parts.map(p => `<div class="plpart"><span class="zi">${icon('part', 18)}</span><span class="pgrow"><b>${esc(p.name)}</b><small>${p.oe ? esc(fmtOe(p.oe)) : 'numer do potwierdzenia po VIN'}${p.from.length > 1 ? ' · w ' + p.from.length + ' naprawach' : ''}</small></span>${p.oe ? `<button class="btn small" data-copy="${esc(p.oe)}" aria-label="Kopiuj numer">${icon('copy', 14)}</button>` : ''}</div>`).join('')}</div></div><p class="foot">Numery bez potwierdzenia sprawdź po VIN przed zakupem. Poziom pewności każdej części jest na karcie naprawy.</p>`;
  } else {
    const cat = await getCatalog(pack.id);
    count = `${cat.zones.reduce((n, z) => n + z.groups.reduce((m, g) => m + g.items.length, 0), 0)} pozycji`;
    body = `<div class="card"><div class="kv">${cat.zones.map(z => `<a class="srow" href="#/car/${car.id}/zone/${z.id}"><span class="zi">${icon(z.icon, 18)}</span><span class="zt"><b>${esc(z.label)}</b><small>${z.groups.reduce((m, g) => m + g.items.length, 0)} pozycji</small></span>${icon('chevron', 18)}</a>`).join('')}</div></div>`;
  }
  return {
    tab: '#/repairs',
    html: `${topbar({ title: 'Naprawy', sub: `${pack.title} · ${count}` })}
    <div class="wrap">
      <a class="zsearch fake" href="#/search">${icon('search', 18)}<span>Szukaj, np. klamka, numer części</span></a>
      <div class="seg3 full" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-t="${k}" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}">${l}</button>`).join('')}</div>
      ${body}
    </div>`,
    bind(el) {
      $$('[data-t]', el).forEach(b => b.onclick = () => { location.hash = `#/repairs?tab=${b.dataset.t}`; });
      $$('[data-copy]', el).forEach(b => b.onclick = () => copy(b.dataset.copy, 'Numer skopiowany'));
     
    }
  };
}
route(/^repairs$/, q => repairsScreen(q));

/* ---------- DIAGNOSTYKA: pytania z paczki wiedzy, prowadzą do kart napraw ---------- */
async function diagScreen(carId) {
  const car = S.car(carId);
  if (!car) { location.hash = '#/'; return { html: '' }; }
  const match = await matchPack(car).catch(() => null);
  if (!match) { location.hash = `#/car/${carId}`; return { html: '' }; }
  const pack = await getPack(match.id);
  return {
    tab: null,
    html: `${topbar({ back: '#/', title: 'Diagnostyka', sub: 'Co się dzieje? Szybka diagnoza' })}
    <div class="wrap"><div class="diag">${(pack.diagnosis || []).map(d => {
      const links = d.repair ? Object.entries(d.repair).map(([lab, rid]) => `<a class="chip accent" href="#/car/${carId}/r/${rid}">${icon('wrench', 13)} ${esc(lab)}: ${esc((pack.repairs.find(r => r.id === rid) || {}).title || rid)}</a>`).join('') : '';
      return `<details><summary>${icon('chevron', 18)}<span>${esc(d.q)}</span></summary><div class="ans"><p>${esc(d.a)}</p>${links ? `<div class="chips">${links}</div>` : ''}</div></details>`;
    }).join('')}</div></div>`
  };
}
route(/^car\/([^/]+)\/diag$/, diagScreen);
