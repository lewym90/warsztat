import { route, render } from '../router.js';
import { $, $$, carName, carSub, closeSheet, esc, openRequest, openSheet, toast, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { getCatalog, getPack, matchPack } from '../data.js';
import { PHOTOS, ZONES, carSVG } from '../art-car.js';
import { SPINS, mountSpin, spinHtml } from '../spin.js';
import * as S from '../store.js';

/* ---------- AUTO ---------- */
const zoneLabels = { doors: 'Drzwi', hood: 'Maska i przód', interior: 'Wnętrze', tail: 'Klapa i tył', wheels: 'Koła, hamulce i zawieszenie', under: 'Progi, podwozie i napęd' };
async function carScreen(id) {
  const car = S.car(id);
  if (!car) { location.hash = '#/'; return { html: '' }; }
  const match = await matchPack(car).catch(() => null);
  const pack = match ? await getPack(match.id) : null;
  const catalog = pack ? await getCatalog(pack.id).catch(() => null) : null;
  const ready = pack ? pack.systems.filter(s => s.ready) : [];
  const isFull = i => i.id && (pack.repairs.find(x => x.id === i.id) || {}).completeness === 'pełne';
  const cnt = z => { const all = z.groups.flatMap(g => g.items); return { n: all.length, r: all.filter(isFull).length, d: all.filter(i => i.id).length }; };
  const zoneTiles = catalog ? catalog.zones.map(z => {
    const c = cnt(z);
    return `<a class="sys ${c.r ? 'ready' : 'planned'}" href="#/car/${id}/zone/${z.id}">
      <div class="ico">${icon(z.icon, 22)}</div>
      <div><b>${esc(z.label)}</b><small>${c.n} napraw${c.r ? ` · ${c.r} gotowych` : ''}</small></div>
      <div class="chips"><span class="chip ${c.r ? 'ok' : ''}">${c.r ? 'Gotowe: ' + c.r : 'W planie'}</span></div></a>`;
  }).join('') : '';
  const sysTiles = zoneTiles || (pack ? pack.systems : defaultSystems()).map(s => {
    const isReady = !!s.ready;
    const n = isReady ? (s.repairIds || []).length : 0;
    return `<button class="sys ${isReady ? 'ready' : 'planned'}" data-sys="${s.id}">
      <div class="ico">${icon(s.icon, 22)}</div>
      <div><b>${esc(s.name)}</b><small>${isReady ? `${n} poradników` : esc(s.blurb || 'W planie')}</small></div>
      <div class="chips"><span class="chip ${isReady ? 'ok' : ''}">${isReady ? 'Gotowe' : 'W planie'}</span></div></button>`;
  }).join('');
  const vinShown = car.vin ? `${car.vin.slice(0, 3)}${'•'.repeat(Math.max(car.vin.length - 6, 0))}${car.vin.slice(-3)}` : '';
  return {
    tab: null,
    html: `
      ${topbar({ back: '#/', title: carName(car), sub: carSub(car), right: `<button class="iconbtn ${car.fav ? 'on' : ''}" id="fav" aria-label="Ulubione">${icon(car.fav ? 'starFill' : 'star', 20)}</button><button class="iconbtn" id="edit" aria-label="Edytuj">${icon('more', 20)}</button>` })}
      <div class="wrap car-wrap">
        <div class="car-main">
        <div class="card hero-card glow">
          ${SPINS[pack && pack.id] ? spinHtml(SPINS[pack.id], zoneLabels) : carSVG({ pins: pack ? ['door_front', 'door_rear'] : [], photo: PHOTOS[pack && pack.id] || '' })}
          <div class="caption" id="cap">${pack ? `${icon('spark', 16)} ${SPINS[pack.id] ? 'Obracaj auto palcem, dotknij kropki' : 'Dotknij drzwi, aby zobaczyć poradniki'}` : `${icon('clock', 16)} Dla tego auta nie ma jeszcze opracowania`}</div>
        </div>
        <div class="zonepanel" id="zonepanel" hidden></div>
        </div>
        <div class="car-side">
        ${pack ? `<div class="chips" style="padding:0 4px"><span class="chip ok">${icon('check', 13)} ${esc(pack.title)} · ${esc(pack.status)}</span><span class="chip">${catalog ? catalog.zones.reduce((a, z) => a + cnt(z).r, 0) + ' z ' + catalog.zones.reduce((a, z) => a + cnt(z).n, 0) + ' napraw gotowych' : ready.length + ' z ' + pack.systems.length + ' układów'}</span></div>` : `
        <div class="matchbox no">
          <b>Brak opracowania dla ${esc(car.make)} ${esc(car.model)} ${esc(car.year)}</b>
          <p style="color:var(--muted);font-size:14px">Opracowania powstają na zamówienie: wygenerujesz polecenie dla Claude, który zbierze źródła i dopisze paczkę do aplikacji.</p>
          <button class="btn primary" id="req">${icon('wrench', 18)} Zamów opracowanie</button>
        </div>`}
        <div class="section-h">${icon('list', 16)} ${catalog ? 'Strefy auta' : 'Układy'}</div>
        <div class="sys-grid">${sysTiles}</div>
        <div class="section-h">${icon('key', 16)} Dane auta</div>
        <div class="card"><div class="kv">
          <div><span>Marka i model</span><b>${esc(car.make)} ${esc(car.model)}${car.gen ? ' ' + esc(car.gen) : ''}</b></div>
          <div><span>Rok</span><b>${esc(car.year)}</b></div>
          <div><span>Silnik</span><b>${esc(car.engine || '—')}${car.kw ? ' · ' + car.kw + ' kW' : ''}</b></div>
          <div><span>VIN</span><b id="vin" data-v="${esc(car.vin)}" data-m="${esc(vinShown)}">${car.vin ? esc(vinShown) : 'nie podano'}</b></div>
        </div></div>
        <p class="foot">Dane auta (w tym VIN) są zapisane wyłącznie w tym urządzeniu.</p>
        </div>
      </div>`,
    bind(el) {
      $('#fav', el).onclick = () => { S.toggleFav(id); render(); };
      $('#edit', el).onclick = () => editCar(car);
      const reqBtn = $('#req', el); if (reqBtn) reqBtn.onclick = () => openRequest(car);
      const cap = $('#cap', el);
      const spinEl = $('.spin', el);
      if (spinEl && pack && SPINS[pack.id]) {
        const zp = $('#zonepanel', el);
        const sp = mountSpin(spinEl, SPINS[pack.id], { labels: zoneLabels, onZone: (zid, btn) => {
          const z = catalog.zones.find(x => x.id === zid); if (!z) return;
          const side = btn.dataset.side || '';
          const c = cnt(z);
          const ok = z.groups.flatMap(g => g.items).filter(i => i.id && (!i.d || zid !== 'doors' || true));
          const href = `#/car/${id}/zone/${z.id}${side ? '?side=' + side : ''}`;
          zp.innerHTML = `<div class="zp-h"><span><b>${esc(z.label)}</b>${side ? `<em>${side === 'left' ? 'lewa strona' : 'prawa strona'}</em>` : ''}</span><button class="iconbtn" data-zx aria-label="Zamknij">${icon('x', 18)}</button></div>
            <p class="zp-n">${esc(z.blurb)}</p>
            <div class="zp-g">${z.groups.map(g => `<a class="chip" href="${href}#g">${esc(g.t)} <b>${g.items.length}</b></a>`).join('')}</div>
            ${ok.length ? `<div class="zp-l">${ok.map(r => { const rep = pack.repairs.find(x => x.id === r.id) || {}; return `<a class="zp-i" href="#/car/${id}/r/${r.id}"><span class="zi">${icon(rep.icon || 'wrench', 18)}</span><span><b>${esc(r.t)}</b><small>${esc(rep.subtitle || '')}</small></span>${icon('chevron', 16)}</a>`; }).join('')}</div>` : ''}
            <a class="btn primary small" href="${href}">${icon('list', 16)} Wszystkie naprawy: ${c.n}${c.r ? ' (gotowe: ' + c.r + ')' : ''}</a>`;
          zp.hidden = false;
          $('[data-zx]', zp).onclick = () => { zp.hidden = true; sp.clear(); };
          zp.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } });
      }
      $$('svg [data-zone]', el).forEach(z => {
        z.addEventListener('mouseenter', () => { cap.innerHTML = `<b>${z.dataset.label}</b>`; });
        z.addEventListener('click', () => {
          const Z = ZONES[z.dataset.zone];
          const zmap = { door_front: 'doors', door_rear: 'doors', engine: 'hood', wheels: 'wheels', tail: 'tail' };
          if (pack && catalog && zmap[z.dataset.zone]) location.hash = `#/car/${id}/zone/${zmap[z.dataset.zone]}${Z.door ? '?door=' + Z.door : ''}`;
          else if (pack && Z.system === 'doors') location.hash = `#/car/${id}/zone/doors?door=${Z.door}`;
          else openPlanned(car, pack, Z.system, Z.label);
        });
      });
      $$('[data-sys]', el).forEach(b => b.addEventListener('click', () => {
        const sys = (pack ? pack.systems : defaultSystems()).find(s => s.id === b.dataset.sys);
        if (pack && sys.ready) location.hash = `#/car/${id}/sys/${sys.id}`; else openPlanned(car, pack, sys.id, sys.name);
      }));
      const vin = $('#vin', el);
      if (car.vin) vin.onclick = () => {
        if (vin.textContent === vin.dataset.m) { vin.textContent = vin.dataset.v; navigator.clipboard?.writeText(vin.dataset.v).catch(() => {}); toast('VIN odsłonięty i skopiowany'); }
        else vin.textContent = vin.dataset.m;
      };
    }
  };
}
function defaultSystems() {
  return [['doors', 'Drzwi i zamki', 'door'], ['engine', 'Silnik', 'engine'], ['susp', 'Zawieszenie i koła', 'wheel'], ['brakes', 'Hamulce', 'brake'], ['drive', 'Napęd i skrzynia', 'gear'], ['electrics', 'Elektryka i światła', 'bolt'], ['climate', 'Klimatyzacja', 'snow'], ['body', 'Nadwozie i szyby', 'car'], ['interior', 'Wnętrze', 'seat'], ['service', 'Przeglądy i płyny', 'drop']]
    .map(([id, name, ic]) => ({ id, name, icon: ic, blurb: 'W planie' }));
}
function openPlanned(car, pack, sysId, name) {
  openSheet(`
    <h2>${esc(name)}</h2>
    <p style="color:var(--muted)">Ten układ nie jest jeszcze opracowany${pack ? ' dla ' + esc(pack.title) : ''}. Zamawiasz go tak: kopiujesz polecenie i wklejasz je w rozmowie z Claude. On zbiera źródła, a gotowe karty trafiają do aplikacji przy aktualizacji.</p>
    <button class="btn primary block" id="pl-req">${icon('wrench', 18)} Zamów opracowanie</button>
    <button class="btn ghost block" id="pl-close">Zamknij</button>`, el => {
    $('#pl-req', el).onclick = () => openRequest(car, name);
    $('#pl-close', el).onclick = closeSheet;
  });
}
function editCar(car) {
  openSheet(`
    <h2>Edytuj auto</h2>
    <div class="field"><label>Nazwa własna</label><input class="input" id="e-nick" value="${esc(car.nick)}" placeholder="np. Mój X5"></div>
    <div class="field"><label>Silnik</label><input class="input" id="e-engine" value="${esc(car.engine)}"></div>
    <div class="field"><label>VIN (tylko w tym urządzeniu)</label><input class="input" id="e-vin" value="${esc(car.vin)}" maxlength="17" autocapitalize="characters" placeholder="17 znaków"></div>
    <button class="btn primary block" id="e-save">Zapisz</button>
    <button class="btn danger block" id="e-del">${icon('trash', 18)} Usuń auto z garażu</button>`, el => {
    $('#e-save', el).onclick = () => { S.updateCar(car.id, { nick: $('#e-nick', el).value.trim(), engine: $('#e-engine', el).value.trim(), vin: $('#e-vin', el).value.trim().toUpperCase() }); closeSheet(); render(); toast('Zapisano'); };
    $('#e-del', el).onclick = () => { if (confirm('Usunąć auto i jego postęp napraw z tego urządzenia?')) { S.removeCar(car.id); location.hash = '#/'; } };
  });
}

route(/^car\/([^/]+)$/, carScreen);
