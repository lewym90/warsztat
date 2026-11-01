import { route } from '../router.js';
import { $, $$, dots, esc, fmtTime, openRequest, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { getPack, matchPack } from '../data.js';
import { DOOR_PHOTOS, VIEW_LABELS, doorSVG, setDoorPhoto } from '../art-door.js';
import * as S from '../store.js';

/* ---------- UKŁAD: DRZWI ---------- */
async function sysScreen(carId, sysId, q) {
  const car = S.car(carId);
  if (!car) { location.hash = '#/'; return { html: '' }; }
  const match = await matchPack(car);
  if (!match || sysId !== 'doors') {
    return { html: `${topbar({ back: `#/car/${carId}`, title: 'W planie' })}<div class="wrap"><div class="note info">${icon('info', 22)}<div><b>Ten układ nie jest jeszcze opracowany</b><p>Wróć do auta i zamów opracowanie.</p></div></div></div>` };
  }
  if (sysId === 'doors') { location.hash = `#/car/${carId}/zone/doors${q.get('door') ? '?door=' + q.get('door') : ''}`; return { html: '' }; }
  const pack = await getPack(match.id);
  let door = q.get('door') === 'rear' ? 'rear' : 'front';
  let view = 'outer';
  let sel = null;

  const hsFor = d => {
    const out = {};
    for (const [v, list] of Object.entries(pack.doors[d])) {
      const key = v === 'outer' ? 'outer' : v; // outer | card | inner
      out[key] = list.map(h => ({ ...h, state: h.planned ? 'planned' : '' }));
    }
    return out;
  };
  const repairsFor = d => pack.repairs.filter(r => r.door === d || r.door === 'both');
  const diagHtml = pack.diagnosis.map(d => {
    const links = d.repair ? Object.entries(d.repair).map(([lab, rid]) => `<a class="chip accent" href="#/car/${carId}/r/${rid}">${icon('wrench', 13)} ${esc(lab)}: ${esc((pack.repairs.find(r => r.id === rid) || {}).title || rid)}</a>`).join('') : '';
    return `<details><summary>${icon('chevron', 18)}<span>${esc(d.q)}</span></summary><div class="ans"><p>${esc(d.a)}</p>${links ? `<div class="chips">${links}</div>` : ''}</div></details>`;
  }).join('');

  const html = () => `
    ${topbar({ back: `#/car/${carId}`, title: pack.systems.find(s => s.id === 'doors').name, sub: `${pack.title}${car.engine ? ' · ' + car.engine : ''}` })}
    <div class="wrap door-wrap">
      <div class="door-main">
      <div class="seg" id="seg-door" role="tablist"><span class="thumb"></span>
        <button data-v="front" role="tab">Przednie</button><button data-v="rear" role="tab">Tylne</button></div>
      <div class="card doorbox glow">
        <div class="seg" id="seg-view" role="tablist"><span class="thumb"></span>
          <button data-v="outer" role="tab">Zewnątrz</button><button data-v="card" role="tab">Boczek</button><button data-v="inner" role="tab">Środek</button></div>
        <div class="stage" id="stage"></div>
        <div style="text-align:center"><span class="viewtag" id="viewtag"></span></div>
        <div class="hs-caption" id="hscap"></div>
      </div>
      </div>
      <div class="door-side">
      <div class="section-h">${icon('wrench', 16)} Poradniki do tych drzwi <span class="count" id="rcount"></span></div>
      <div class="rlist" id="rlist"></div>
      <div class="section-h">${icon('search', 16)} Co się dzieje? Szybka diagnoza</div>
      <div class="diag">${diagHtml}</div>
      <p class="foot">Widok „Zewnątrz” to zdjęcie lewej strony Twojego BMW X5 E53. Boczek i środek drzwi to schemat poglądowy: położenie elementów jest orientacyjne.</p>
      </div>
    </div>`;

  return {
    tab: null, html: html(),
    bind(el) {
      const stage = $('#stage', el);
      const thumb = (seg, btn) => { const t = $('.thumb', seg); t.style.left = btn.offsetLeft + 'px'; t.style.width = btn.offsetWidth + 'px'; };
      const syncSeg = (seg, val) => { $$('button', seg).forEach(b => { const on = b.dataset.v === val; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); if (on) thumb(seg, b); }); };
      const paintList = () => {
        const list = repairsFor(door);
        $('#rcount', el).textContent = list.length + ' kart';
        $('#rlist', el).innerHTML = list.map(r => {
          const p = S.state().prog[`${carId}:${r.id}`]; const done = p ? Object.values(p.steps).filter(Boolean).length : 0;
          const pct = p && r.steps ? Math.round(done / r.steps * 100) : 0;
          return `<a class="ritem" href="#/car/${carId}/r/${r.id}">
            <div class="ico">${icon(r.icon || 'wrench', 22)}</div>
            <div><b>${esc(r.title)}</b><small>${dots(r.difficulty)} &nbsp;·&nbsp; ${fmtTime(r.time)} &nbsp;·&nbsp; ${esc(r.completeness)}</small>${pct ? `<div class="prog"><i style="width:${pct}%"></i></div>` : ''}</div>
            <span class="go">${icon('chevron', 20)}</span></a>`;
        }).join('');
      };
      const mountArt = () => {
        setDoorPhoto((DOOR_PHOTOS[pack.id] || {})[door]); stage.innerHTML = doorSVG({ view, hotspots: hsFor(door), rings: 1 });
        const svg = $('.door-art', stage);
        $$('.hs', svg).forEach(h => h.addEventListener('click', () => pick(h)));
        paintCaption();
      };
      const pick = h => {
        $$('.hs.sel', stage).forEach(x => x.classList.remove('sel')); h.classList.add('sel');
        const spec = pack.doors[door][viewKeyOf(h)].find(x => x.id === h.dataset.hs);
        sel = spec; paintCaption();
      };
      const viewKeyOf = h => h.closest('.layer').classList.contains('outer') ? 'outer' : h.closest('.layer').classList.contains('card') ? 'card' : 'inner';
      const paintCaption = () => {
        const cap = $('#hscap', el);
        $('#viewtag', el).innerHTML = `${icon('eye', 14)} ${VIEW_LABELS[view]} · drzwi ${door === 'front' ? 'przednie' : 'tylne'}`;
        if (!sel) { cap.innerHTML = `${icon('spark', 16)} Dotknij świecącego punktu na rysunku`; return; }
        if (sel.repair) {
          const r = pack.repairs.find(x => x.id === sel.repair);
          cap.innerHTML = `<b>${esc(sel.label)}</b><a class="btn primary small" href="#/car/${carId}/r/${sel.repair}">Otwórz: ${esc(r ? r.title : 'poradnik')} ${icon('chevron', 16)}</a>`;
        } else {
          cap.innerHTML = `<b>${esc(sel.label)}</b><span class="chip">wkrótce</span><button class="btn ghost small" id="hs-req">Zamów</button>`;
          $('#hs-req', el).onclick = () => openRequest(car, sel.label);
        }
      };
      const setView = v => {
        view = v; sel = null;
        const svg = $('.door-art', stage);
        if (svg) { svg.dataset.view = v; $$('.hs.sel', svg).forEach(x => x.classList.remove('sel')); }
        syncSeg($('#seg-view', el), v); paintCaption();
      };
      const setDoor = d => { door = d; sel = null; syncSeg($('#seg-door', el), d); mountArt(); paintList(); };
      $$('#seg-view button', el).forEach(b => b.onclick = () => setView(b.dataset.v));
      $$('#seg-door button', el).forEach(b => b.onclick = () => setDoor(b.dataset.v));
      mountArt(); paintList();
      requestAnimationFrame(() => { syncSeg($('#seg-door', el), door); syncSeg($('#seg-view', el), view); });
      const onResize = () => {
        const sd = $('#seg-door', el), sv = $('#seg-view', el);
        if (!sd || !sv) { window.removeEventListener('resize', onResize); return; }
        syncSeg(sd, door); syncSeg(sv, view);
      };
      window.addEventListener('resize', onResize, { passive: true });
    }
  };
}

route(/^car\/([^/]+)\/sys\/([^/]+)$/, sysScreen);
