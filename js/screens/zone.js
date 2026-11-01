import { route } from '../router.js';
import { $, $$, dots, esc, fmtTime, openRequest, topbar } from '../ui.js';
import { bindOffline, offlineCardHtml } from '../offline-ui.js';
import { icon } from '../icons.js';
import { getCatalog, getPack, matchPack } from '../data.js';
import { SPINS } from '../spin.js';
import { DOOR_PHOTOS, doorSVG, setDoorPhoto } from '../art-door.js';
import * as S from '../store.js';

/* ---------- STREFA (np. Drzwi): zdjęcie + pełna lista napraw ---------- */
const ZONE_HERO = { hood: 76, interior: 8, tail: 40, wheels: 20, under: 16, service: 60 };
async function zoneScreen(carId, zoneId, q) {
  const car = S.car(carId);
  if (!car) { location.hash = '#/'; return { html: '' }; }
  const match = await matchPack(car).catch(() => null);
  if (!match) { location.hash = `#/car/${carId}`; return { html: '' }; }
  const pack = await getPack(match.id);
  const catalog = await getCatalog(match.id).catch(() => null);
  const zone = catalog && catalog.zones.find(z => z.id === zoneId);
  if (!zone) { location.hash = `#/car/${carId}`; return { html: '' }; }
  let side = q.get('side') === 'right' ? 'right' : 'left';
  let door = q.get('door') === 'rear' ? 'rear' : 'front';
  let sel = null, term = '';
  const isDoors = zone.id === 'doors';
  const all = zone.groups.flatMap(g => g.items);
  const nReady = all.filter(i => i.id && (pack.repairs.find(x => x.id === i.id) || {}).completeness === 'pełne').length;
  const nDraft = all.filter(i => i.id).length - nReady;
  const spin = SPINS[pack.id];
  const heroFrame = ZONE_HERO[zone.id];
  const hero = isDoors ? `
      <div class="seg" id="seg-side" role="tablist"><span class="thumb"></span><button data-v="left" role="tab">Lewa strona</button><button data-v="right" role="tab">Prawa strona</button></div>
      <div class="seg" id="seg-door" role="tablist"><span class="thumb"></span><button data-v="front" role="tab">Przednie</button><button data-v="rear" role="tab">Tylne</button></div>
      <div class="card doorbox glow"><div class="stage" id="stage"></div><div style="text-align:center"><span class="viewtag" id="viewtag"></span></div><div class="hs-caption" id="hscap"></div></div>`
    : `<div class="card zhero glow">${spin && heroFrame != null ? `<div class="zhero-img"><img src="${spin.dir}f${String(heroFrame + 1).padStart(2, '0')}.${spin.ext}" alt="${esc(zone.label)}"></div>` : `<div class="zhero-ic">${icon(zone.icon, 44)}</div>`}</div>`;
  const html = `
    ${topbar({ back: `#/car/${carId}`, title: zone.label, sub: `${pack.title}${car.engine ? ' · ' + car.engine : ''}` })}
    <div class="wrap door-wrap">
      <div class="door-main">${hero}</div>
      <div class="door-side">
        <p class="zblurb">${esc(zone.blurb)}</p>
        <div class="chips" style="margin:0 0 12px"><span class="chip">${all.length} napraw</span><span class="chip ${nReady ? 'ok' : ''}">${nReady ? 'Gotowe: ' + nReady : 'Brak gotowych'}</span>${nDraft ? `<span class="chip">Wstępne wersje: ${nDraft}</span>` : ''}</div>
        <label class="zsearch">${icon('search', 18)}<input id="zq" type="search" placeholder="Szukaj w: ${esc(zone.label)}" autocomplete="off"></label>
        <div id="zlist"></div>
        ${offlineCardHtml(zone.label)}
        <p class="foot">Pozycje „Wkrótce” są w planie. Opracowania powstają po jednym, w pełnej jakości, ze zdjęciami i filmami przy każdym kroku. Dotknij pozycji, aby zamówić następną.</p>
      </div>
    </div>`;
  return {
    tab: null, html,
    bind(el) {
      const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
      const paintList = () => {
        const nt = norm(term);
        const out = zone.groups.map(g => {
          const items = g.items.filter(i => (!isDoors || !i.d || i.d === door) && (!nt || norm(i.t + ' ' + g.t + ' ' + (i.n || '')).includes(nt)));
          if (!items.length) return '';
          const rdy = items.filter(i => i.id && (pack.repairs.find(x => x.id === i.id) || {}).completeness === 'pełne').length;
          const open = nt || rdy ? ' open' : '';
          return `<details class="zg"${open}><summary>${icon('chevron', 16)}<span>${esc(g.t)}</span><em>${items.length}${rdy ? ` · gotowe ${rdy}` : ''}</em></summary><div class="zitems">${items.map(i => {
            if (i.id) {
              const r = pack.repairs.find(x => x.id === i.id) || {};
              return `<a class="zrow ready" href="#/car/${carId}/r/${i.id}"><span class="zi">${icon(r.icon || 'wrench', 18)}</span><span class="zt"><b>${esc(i.t)}</b><small>${r.difficulty ? dots(r.difficulty) + ' &nbsp;·&nbsp; ' : ''}${r.time ? fmtTime(r.time) + ' &nbsp;·&nbsp; ' : ''}${esc(r.completeness || 'gotowe')}</small></span><span class="chip ${r.completeness === 'pełne' ? 'ok' : ''}">${r.completeness === 'pełne' ? 'Gotowe' : 'Wstępna wersja'}</span></a>`;
            }
            return `<button class="zrow" data-req="${esc(i.t)}"><span class="zi dim">${icon('clock', 16)}</span><span class="zt"><b>${esc(i.t)}</b>${i.n ? `<small>${esc(i.n)}</small>` : ''}</span><span class="chip">Wkrótce</span></button>`;
          }).join('')}</div></details>`;
        }).join('');
        $('#zlist', el).innerHTML = out || `<div class="note info">${icon('info', 22)}<div><b>Nic nie pasuje</b><p>Spróbuj innego słowa.</p></div></div>`;
        $$('[data-req]', el).forEach(b => b.onclick = () => openRequest(car, `${zone.label}: ${b.dataset.req}`));
      };
      bindOffline(el, pack.id, all.filter(i => i.id).map(i => i.id));
      $('#zq', el).addEventListener('input', e => { term = e.target.value.trim(); paintList(); });
      paintList();
      if (!isDoors) return;
      const stage = $('#stage', el);
      const syncSeg = (seg, val) => { $$('button', seg).forEach(b => { const on = b.dataset.v === val; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); if (on) { const t = $('.thumb', seg); t.style.left = b.offsetLeft + 'px'; t.style.width = b.offsetWidth + 'px'; } }); };
      const hsFor = () => (pack.doors[door].outer || []).filter(h => !(side === 'right' && h.anchor === 'outer.keyhole')).map(h => ({ ...h, state: h.planned ? 'planned' : '' }));
      const paintCaption = () => {
        const cap = $('#hscap', el);
        $('#viewtag', el).innerHTML = `${icon('eye', 14)} ${side === 'left' ? 'Lewa' : 'Prawa'} strona · drzwi ${door === 'front' ? 'przednie' : 'tylne'}`;
        if (!sel) { cap.innerHTML = `${icon('spark', 16)} Dotknij świecącego punktu na zdjęciu`; return; }
        if (sel.repair) { const r = pack.repairs.find(x => x.id === sel.repair); cap.innerHTML = `<b>${esc(sel.label)}</b><a class="btn primary small" href="#/car/${carId}/r/${sel.repair}">Otwórz: ${esc(r ? r.title : 'poradnik')} ${icon('chevron', 16)}</a>`; }
        else { cap.innerHTML = `<b>${esc(sel.label)}</b><span class="chip">wkrótce</span><button class="btn ghost small" id="hs-req">Zamów</button>`; $('#hs-req', el).onclick = () => openRequest(car, sel.label); }
      };
      const mountArt = () => {
        setDoorPhoto(((DOOR_PHOTOS[pack.id] || {})[side] || {})[door]);
        stage.innerHTML = doorSVG({ view: 'outer', hotspots: { outer: hsFor() }, rings: 1 });
        $$('.hs', stage).forEach(h => h.addEventListener('click', () => { $$('.hs.sel', stage).forEach(x => x.classList.remove('sel')); h.classList.add('sel'); sel = (pack.doors[door].outer || []).find(x => x.id === h.dataset.hs); paintCaption(); }));
        paintCaption();
      };
      $$('#seg-side button', el).forEach(b => b.onclick = () => { side = b.dataset.v; sel = null; syncSeg($('#seg-side', el), side); mountArt(); });
      $$('#seg-door button', el).forEach(b => b.onclick = () => { door = b.dataset.v; sel = null; syncSeg($('#seg-door', el), door); mountArt(); paintList(); });
      mountArt();
      requestAnimationFrame(() => { syncSeg($('#seg-side', el), side); syncSeg($('#seg-door', el), door); });
      const onResize = () => { const a = $('#seg-side', el), b = $('#seg-door', el); if (!a || !b) { window.removeEventListener('resize', onResize); return; } syncSeg(a, side); syncSeg(b, door); };
      window.addEventListener('resize', onResize, { passive: true });
    }
  };
}

route(/^car\/([^/]+)\/zone\/([^/]+)$/, zoneScreen);
