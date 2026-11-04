import { route, render } from '../router.js';
import { $, $$, carName, closeSheet, copy, dots, esc, fmtTime, openSheet, toast, topbar } from '../ui.js';
import { bindOffline, offlineCardHtml } from '../offline-ui.js';
import { icon } from '../icons.js';
import { getPack, getRepair, matchPack } from '../data.js';
import { aggregatePlan, orderHint, planText } from '../plan.js';
import { THUMB_NOTE, thumb } from '../thumbs.js';
import * as S from '../store.js';

/* ---------- DZISIAJ ROBIĘ: wybór kilku napraw → jedna lista zakupów i narzędzi ---------- */
const needLbl = { must: 'Wymagane', should: 'Polecane', opt: 'Opcjonalne' };
async function planScreen() {
  const plan = S.getPlan();
  const cars = S.cars();
  const car = S.car(plan.carId);
  if (!car) {
    return {
      tab: '#/plan',
      html: `${topbar({ title: 'Plan na dziś', sub: 'Plan prac na jeden dzień' })}<div class="wrap">
        <p class="zblurb">Wybierz kilka napraw, a dostaniesz jedną listę części i narzędzi bez powtórzeń oraz podpowiedź kolejności. Całość możesz zapisać offline jednym przyciskiem.</p>
        ${cars.length ? `<div class="section-h">${icon('car', 16)} Dla którego auta?</div><div class="card"><div class="kv">${cars.map(c => `<button class="plan-car" data-car="${c.id}"><b>${esc(carName(c))}</b><span>${icon('chevron', 18)}</span></button>`).join('')}</div></div>` : `<a class="empty-add" href="#/add">${icon('plus', 28)}<b>Najpierw dodaj auto</b></a>`}</div>`,
      bind(el) { $$('[data-car]', el).forEach(b => b.onclick = () => { S.setPlan([], b.dataset.car); render(); }); }
    };
  }
  const match = await matchPack(car).catch(() => null);
  if (!match) { return { tab: '#/plan', html: `${topbar({ title: 'Plan na dziś' })}<div class="wrap"><div class="note info">${icon('info', 22)}<div><b>Brak opracowań dla tego auta</b><p>Plan działa dla aut z gotowymi poradnikami.</p></div></div><button class="btn block" id="pl-reset">Wybierz inne auto</button></div>`, bind(el) { $('#pl-reset', el).onclick = () => { S.setPlan([], ''); render(); }; } }; }
  const pack = await getPack(match.id);
  const ids = plan.ids.filter(id => pack.repairs.some(r => r.id === id));
  const repairs = await Promise.all(ids.map(id => getRepair(match.id, id)));
  const agg = aggregatePlan(repairs);
  const hint = orderHint(repairs);
  const tmin = repairs.reduce((n, r) => n + r.time[0], 0), tmax = repairs.reduce((n, r) => n + r.time[1], 0);
  const nSteps = repairs.reduce((n, r) => n + r.steps.length, 0);
  const bought = S.getPlan().bought || {};
  const rows = repairs.map(r => `<div class="plrow"><span class="plno">${icon('check', 16)}</span><a href="#/car/${car.id}/r/${r.id}"><b>${esc(r.title)}</b><small>${r.steps.length} kroków &nbsp;·&nbsp; ${fmtTime(r.time)} &nbsp;·&nbsp; ${dots(r.difficulty)}</small></a><button class="iconbtn" data-rm="${r.id}" aria-label="Usuń z planu: ${esc(r.title)}">${icon('x', 18)}</button></div>`).join('');
  return {
    tab: '#/plan',
    html: `${topbar({ title: 'Plan na dziś', sub: repairs.length ? `${repairs.length} napraw · ${nSteps} kroków · ${fmtTime([tmin, tmax])}` : carName(car) })}
    <div class="wrap">
      <div class="card">${rows || `<div class="pad" style="padding:16px;color:var(--muted)">Plan jest pusty. Dodaj naprawy przyciskiem poniżej albo z karty naprawy.</div>`}</div>
      <button class="btn primary block" id="pl-add" style="margin-top:12px">${icon('plus', 18)} Dodaj naprawy do planu</button>
      ${hint ? `<div class="note info" style="margin-top:12px">${icon('info', 22)}<div><b>Kolejność prac</b><p>${esc(hint)}</p></div></div>` : ''}
      ${repairs.length ? `
      <div class="section-h">${icon('list', 16)} Lista zakupów <span class="count">${agg.parts.filter(p => bought[p.oe || p.name]).length} z ${agg.parts.length}</span></div>
      <div class="card"><div class="kv">${agg.parts.map(p => `<div class="plpart shop ${bought[p.oe || p.name] ? 'done' : ''}"><button class="cbox" data-buy="${esc(p.oe || p.name)}" role="checkbox" aria-checked="${!!bought[p.oe || p.name]}" aria-label="Kupione: ${esc(p.name)}">${icon('check', 16)}</button>${thumb(p.name)}<span><b>${esc(p.name)}</b><small>${p.oe ? esc(p.oe.replace(/(\d{2})(\d{2})(\d)(\d{3})(\d{3})/, '$1 $2 $3 $4 $5')) : 'numer do potwierdzenia po VIN'}${p.from.length > 1 ? ' · potrzebne w ' + p.from.length + ' naprawach' : ''}</small></span>${p.oe ? `<button class="btn small" data-copy="${esc(p.oe)}">${icon('copy', 14)}</button>` : ''}</div>`).join('') || '<div class="pad" style="padding:14px;color:var(--muted)">Brak części na liście.</div>'}</div></div>
      <div class="section-h">${icon('wrench', 16)} Narzędzia <span class="count">${agg.tools.length}</span></div>
      <div class="card"><div class="kv">${agg.tools.map(t => `<div class="plpart">${thumb(t.name)}<span class="pgrow"><b>${esc(t.name)}</b><small>${esc(t.note || '')}</small></span><span class="need ${t.need}">${needLbl[t.need] || ''}</span></div>`).join('')}</div></div>
      <p class="foot">${THUMB_NOTE}</p>
      <button class="btn block" id="pl-copy" style="margin-top:12px">${icon('copy', 18)} Kopiuj całą listę</button>
      ${offlineCardHtml('plan na dziś')}
      <button class="btn ghost block" id="pl-clear">Wyczyść plan</button>` : ''}
    </div>`,
    bind(el) {
      $$('[data-rm]', el).forEach(b => b.onclick = () => { S.togglePlan(b.dataset.rm, car.id); render(); });
      $$('[data-copy]', el).forEach(b => b.onclick = () => copy(b.dataset.copy, 'Numer skopiowany'));
      $$('[data-buy]', el).forEach(b => b.onclick = () => { S.toggleBought(b.dataset.buy); render(); });
      const c = $('#pl-copy', el); if (c) c.onclick = () => copy(planText(`Plan: ${carName(car)}`, agg), 'Lista skopiowana');
      const cl = $('#pl-clear', el); if (cl) cl.onclick = () => { if (confirm('Wyczyścić plan?')) { S.setPlan([], car.id); render(); } };
      if (repairs.length) bindOffline(el, pack.id, ids);
      $('#pl-add', el).onclick = () => openSheet(`<h3 style="margin:6px 0 10px">Wybierz naprawy</h3><div class="plpick">${pack.repairs.map(r => `<button class="plpick-r ${ids.includes(r.id) ? 'on' : ''}" data-pick="${r.id}" role="checkbox" aria-checked="${ids.includes(r.id)}"><span class="cbox">${icon('check', 16)}</span><span><b>${esc(r.title)}</b><small>${fmtTime(r.time)}${r.completeness !== 'pełne' ? ' · wstępna wersja' : ''}</small></span></button>`).join('')}</div><button class="btn primary block" id="pk-ok">Gotowe</button>`, sh => {
        $$('[data-pick]', sh).forEach(b => b.onclick = () => { S.togglePlan(b.dataset.pick, car.id); const on = S.getPlan().ids.includes(b.dataset.pick); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        $('#pk-ok', sh).onclick = () => { closeSheet(); render(); };
      });
      void toast;
    }
  };
}
route(/^plan$/, planScreen);
