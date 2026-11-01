import { icon } from './icons.js';
import * as S from './store.js';
import { getPack, getRepair, getCatalog, matchPack } from './data.js';
import { carSVG, ZONES, PHOTOS } from './art-car.js';
import { SPINS, spinHtml, mountSpin } from './spin.js';
import { doorSVG, ANCHORS, VIEW_LABELS, viewOf, DOOR_PHOTOS, setDoorPhoto, anchorOf } from './art-door.js';
import { CATALOG, FUELS } from './catalog.js';
import { offlineMeta, offlineExpire, offlineLeft, fmtLeft, saveOffline } from './offline.js';

const APP_VERSION = '0.1.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');

/* ---------- narzędzia UI ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
async function copy(text, okMsg = 'Skopiowano') {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch (_) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(okMsg); } catch (__) { toast('Nie udało się skopiować'); }
    ta.remove();
  }
}
function openSheet(html, bind) {
  $('#sheet-body').innerHTML = html;
  const sh = $('#sheet'); sh.classList.add('open'); sh.setAttribute('aria-hidden', 'false');
  if (bind) bind($('#sheet-body'));
}
function closeSheet() { const sh = $('#sheet'); sh.classList.remove('open'); sh.setAttribute('aria-hidden', 'true'); }
$('#sheet .scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

const carName = c => c.nick || `${c.make} ${c.model}`;
const carSub = c => [c.gen, c.year, c.engine].filter(Boolean).join(' · ');
const dots = n => `<span class="dots" aria-label="Trudność ${n} z 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const fmtTime = ([a, b]) => {
  const f = m => m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`;
  return a === b ? f(a) : `${f(a)} – ${f(b)}`;
};
const CONF = { high: ['high', 'Pewność: wysoka'], med: ['med', 'Pewność: średnia (jedno źródło)'], low: ['low', 'Pewność: niska. Zweryfikuj'] };
const COMPLETE = { 'pełne': ['ok', 'Opracowanie pełne'], 'częściowe': ['warn', 'Opracowanie częściowe'], 'szkic': ['danger', 'Szkic do uzupełnienia'] };

function topbar({ back, title, sub, right = '' }) {
  return `<header class="topbar">
    ${back ? `<a class="iconbtn" href="${back}" aria-label="Wróć">${icon('back', 20)}</a>` : ''}
    <div class="title"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>${right}</header>`;
}
function setTabs(active) {
  const tabs = [['#/', 'Garaż', 'car'], ['#/add', 'Dodaj auto', 'plus'], ['#/more', 'Więcej', 'more']];
  $('#tabs').innerHTML = tabs.map(([h, l, i]) => `<a href="${h}" class="${active === h ? 'on' : ''}">${icon(i, 22)}<span>${l}</span></a>`).join('');
  document.body.classList.toggle('no-tabs', !active);
}

function requestText(car, topic) {
  return `Przygotuj opracowanie napraw do aplikacji „Warsztat” dla tego auta:
Marka i model: ${car.make} ${car.model}${car.gen ? ' ' + car.gen : ''}
Rok produkcji: ${car.year}
Silnik: ${car.engine || 'nie podano'}${car.fuel ? ', ' + car.fuel : ''}${car.kw ? ', ' + car.kw + ' kW' : ''}
Zakres: ${topic || 'wszystkie układy, zaczynając od drzwi i zamków'}

Zasady: własnymi słowami, bez kopiowania podręczników. Źródła z linkami. Numery części tylko z potwierdzeniem. Momenty dokręcania tylko ze źródła (inaczej „brak w źródłach”). Poziom pewności przy każdym kroku. Format jak paczka bmw-e53 w repozytorium Warsztatu (pack.json i repairs/*.json).`;
}
function openRequest(car, topic) {
  const text = requestText(car, topic);
  openSheet(`
    <h2>Zamów opracowanie</h2>
    <p style="color:var(--muted)">${esc(car.make)} ${esc(car.model)} nie ma jeszcze w aplikacji gotowych poradników${topic ? ` (${esc(topic)})` : ''}. Skopiuj poniższe polecenie i wklej je w rozmowie z Claude: znajdzie źródła, opracuje karty i dopisze je do repozytorium, a po aktualizacji pojawią się tutaj.</p>
    <pre>${esc(text)}</pre>
    <button class="btn primary block" id="rq-copy">${icon('copy', 18)} Skopiuj polecenie</button>
    <button class="btn ghost block" id="rq-close">Zamknij</button>`, el => {
    $('#rq-copy', el).onclick = () => { copy(text, 'Polecenie skopiowane'); S.addRequest({ carId: car.id, topic: topic || 'wszystko', car: `${car.make} ${car.model} ${car.year}` }); };
    $('#rq-close', el).onclick = closeSheet;
  });
}

/* ---------- router ---------- */
const routes = [
  [/^$/, garage], [/^add$/, addScreen], [/^more$/, moreScreen],
  [/^car\/([^/]+)$/, carScreen],
  [/^car\/([^/]+)\/sys\/([^/]+)$/, sysScreen],
  [/^car\/([^/]+)\/zone\/([^/]+)$/, zoneScreen],
  [/^car\/([^/]+)\/r\/([^/]+)$/, repairScreen]
];
let renderId = 0;
async function render() {
  const id = ++renderId;
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const q = new URLSearchParams(query);
  closeSheet();
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (!m) continue;
    try {
      const out = await fn(...m.slice(1).map(decodeURIComponent), q);
      if (id !== renderId) return;
      app.innerHTML = `<div class="screen">${out.html}</div>`;
      setTabs(out.tab ?? null);
      window.scrollTo(0, 0);
      out.bind && out.bind(app);
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="screen">${topbar({ back: '#/', title: 'Błąd' })}<div class="wrap"><div class="note danger">${icon('alert', 22)}<div><b>Nie udało się załadować ekranu</b><p>${esc(e.message)}</p></div></div></div></div>`;
      setTabs(null);
    }
    return;
  }
  location.hash = '#/';
}
window.addEventListener('hashchange', render);

/* ---------- GARAŻ ---------- */
async function garage() {
  const cars = S.cars();
  const packs = await Promise.all(cars.map(c => matchPack(c).catch(() => null)));
  const cards = cars.map((c, i) => {
    const p = packs[i];
    return `<article class="card gcard" data-id="${c.id}" role="link" tabindex="0">
      <button class="iconbtn fav ${c.fav ? 'on' : ''}" data-fav="${c.id}" aria-label="Ulubione">${icon(c.fav ? 'starFill' : 'star', 20)}</button>
      <div class="art">${carSVG({ mini: true, photo: PHOTOS[p && p.id] || '' })}</div>
      <div class="info">
        <div><h3>${esc(carName(c))}</h3><div class="sub">${esc(carSub(c))}</div></div>
        <div class="chips">
          ${p ? `<span class="chip ok">${icon('check', 13)} Opracowanie: ${esc(p.title)}</span>` : `<span class="chip warn">${icon('clock', 13)} Brak opracowania</span>`}
          ${c.fuel ? `<span class="chip">${esc(c.fuel)}</span>` : ''}${c.kw ? `<span class="chip">${c.kw} kW</span>` : ''}
        </div>
      </div></article>`;
  }).join('');
  return {
    tab: '#/',
    html: `
      <div class="hero-title"><div class="eyebrow">Centrum napraw</div><h1>Warsztat</h1><p>Wybierz auto i klikaj po szkicu: od drzwi po klamkę dostaniesz instrukcję krok po kroku.</p></div>
      <div class="wrap">
        ${cars.length ? `<div class="garage-grid">${cards}</div>` : ''}
        <a class="empty-add" href="#/add">${icon('plus', 28)}<b style="color:var(--text)">Dodaj auto do garażu</b><span>Marka, model, rok, silnik. Opcjonalnie VIN (zapisany tylko w tym telefonie).</span></a>
      </div>`,
    bind(el) {
      $$('.gcard', el).forEach(c => {
        const go = () => { location.hash = `#/car/${c.dataset.id}`; };
        c.addEventListener('click', e => { if (e.target.closest('[data-fav]')) return; go(); });
        c.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      });
      $$('[data-fav]', el).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); S.toggleFav(b.dataset.fav); render(); }));
    }
  };
}

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
        ${offlineCardHtml(zone.label)}
        <label class="zsearch">${icon('search', 18)}<input id="zq" type="search" placeholder="Szukaj w: ${esc(zone.label)}" autocomplete="off"></label>
        <div id="zlist"></div>
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

/* ---------- NAPRAWA ---------- */

/* ---------- media przy krokach: zdjęcia, wideo od właściwego momentu, linki ---------- */
const fmtT = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
function mediaHtml(list) {
  if (!list || !list.length) return '';
  const films = list.filter(x => x.type === 'film');
  list = list.filter(x => x.type !== 'film');
  const filmHtml = films.length ? `<div class="films">${films.map((f, k) => `<a class="film" href="https://www.youtube.com/watch?v=${esc(f.id)}" target="_blank" rel="noopener"><span class="fthumb"><img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="https://i.ytimg.com/vi/${esc(f.id)}/hqdefault.jpg" alt=""><span class="mpl">${icon('chevron', 26)}</span>${f.len ? `<span class="flen">${esc(f.len)}</span>` : ''}</span><span class="ftxt"><b>Film naprawy ${k + 1}</b><small>${esc(f.cap)}</small><em>${esc(f.credit)}</em><i class="offnote">Bez internetu nie zagra: pobierz w aplikacji YouTube</i></span></a>`).join('')}</div>` : '';
  const items = list.map(x => {
    if (x.type === 'photo') return `<figure class="mfig"><button class="mph" data-lb="${esc(x.url)}" data-cap="${esc(x.cap)}" data-credit="${esc(x.credit)}" data-page="${esc(x.page || x.url)}" aria-label="Powiększ zdjęcie"><img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${esc(x.url)}" alt="${esc(x.cap)}"><span class="mbadge">${icon('eye', 13)} Zdjęcie</span></button><figcaption>${esc(x.cap)} <em>${esc(x.credit)}</em></figcaption></figure>`;
    if (x.type === 'video') return `<div class="mvid" data-yt="${esc(x.id)}" data-t="${x.t}" data-e="${x.e || ''}"><button class="mplay" aria-label="Odtwórz film od ${fmtT(x.t)}"><span class="mpl">${icon('chevron', 26)}</span><span><b>Film od ${fmtT(x.t)}${x.e ? ' do ' + fmtT(x.e) : ''}</b><small>${esc(x.cap)} · ${esc(x.credit)}</small></span></button></div>`;
    return `<a class="mlink" href="${esc(x.url)}" target="_blank" rel="noopener">${icon('link', 16)} ${esc(x.label || x.url)} <em>${esc(x.credit || '')}</em></a>`;
  }).join('');
  return filmHtml + (items ? `<div class="media">${items}</div>` : '');
}
function openLightbox({ url, cap, credit, page }) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `<div class="lb-in"><img referrerpolicy="no-referrer" src="${esc(url)}" alt="${esc(cap)}"><div class="lb-cap"><p>${esc(cap)}</p><small>Źródło: ${esc(credit)}</small><div class="lb-act"><a class="btn small" href="${esc(page)}" target="_blank" rel="noopener">${icon('link', 16)} Otwórz źródło</a><button class="btn small primary" data-x>Zamknij</button></div></div></div>`;
  const close = () => { lb.classList.add('out'); setTimeout(() => lb.remove(), 220); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') close(); };
  lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('[data-x]')) close(); });
  document.addEventListener('keydown', esc_);
  document.body.appendChild(lb);
}
function bindMedia(root) {
  root.addEventListener('click', e => {
    const ph = e.target.closest('.mph');
    if (ph && ph.classList.contains('broken')) { window.open(ph.dataset.page, '_blank', 'noopener'); return; }
    if (ph) { openLightbox({ url: ph.dataset.lb, cap: ph.dataset.cap, credit: ph.dataset.credit, page: ph.dataset.page }); return; }
    const pl = e.target.closest('.mplay');
    if (pl) {
      const box = pl.closest('.mvid'); const id = box.dataset.yt, t = box.dataset.t, en = box.dataset.e;
      const src = `https://www.youtube-nocookie.com/embed/${id}?start=${t}${en ? '&end=' + en : ''}&rel=0&playsinline=1&autoplay=1&modestbranding=1`;
      box.innerHTML = `<div class="mframe"><iframe src="${src}" title="Film instruktażowy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div><a class="mlink" href="https://www.youtube.com/watch?v=${id}&t=${t}s" target="_blank" rel="noopener">${icon('link', 16)} Otwórz w YouTube</a>`;
    }
  });
  root.addEventListener('error', e => {
    const img = e.target;
    if (img && img.tagName === 'IMG' && img.closest('.mph')) { const b = img.closest('.mph'); b.classList.add('broken'); img.remove(); b.insertAdjacentHTML('afterbegin', `<span class="mbroken">${icon('eye', 20)}<b>Podgląd niedostępny (offline lub źródło blokuje)</b><small>Dotknij, aby otworzyć</small></span>`); }
  }, true);
}

/* ---------- offline na dziś ---------- */
function offlineCardHtml(label) {
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
function bindOffline(el, packId, ids) {
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

async function repairScreen(carId, rid) {
  const car = S.car(carId);
  if (!car) { location.hash = '#/'; return { html: '' }; }
  const match = await matchPack(car);
  if (!match) { location.hash = `#/car/${carId}`; return { html: '' }; }
  const pack = await getPack(match.id);
  const rep = await getRepair(match.id, rid);
  const prog = S.prog(carId, rid);

  // numeracja źródeł w kolejności pierwszego użycia
  const order = [];
  const reg = keys => (keys || []).forEach(k => { if (!order.includes(k)) order.push(k); });
  (rep.extras || []).forEach(x => reg(x.src)); (rep.parts || []).forEach(x => reg(x.src));
  (rep.warnings || []).forEach(x => reg(x.src)); (rep.steps || []).forEach(x => reg(x.src));
  const srcChips = keys => keys && keys.length ? `<span class="srcs">${keys.map(k => {
    const s = pack.sources[k]; if (!s) return '';
    return `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.title)}">${order.indexOf(k) + 1}</a>`;
  }).join('')}</span>` : '';
  const relTitle = id => (pack.repairs.find(r => r.id === id) || {}).title || id;

  const NOTE_IC = { danger: 'alert', warn: 'alert', info: 'info' };
  const notes = (rep.warnings || []).map(w => `<div class="note ${w.lvl}">${icon(NOTE_IC[w.lvl] || 'info', 22)}<div><b>${esc(w.t)}</b><p>${esc(w.b)}</p><div class="srcs-wrap" style="margin-top:6px">${srcChips(w.src)}</div></div></div>`).join('');
  const extras = (rep.extras || []).map(w => `<div class="note info">${icon('info', 22)}<div><b>${esc(w.t)}</b><p>${esc(w.b)}</p><div style="margin-top:6px">${srcChips(w.src)}</div></div></div>`).join('');
  const needLbl = { must: 'Wymagane', should: 'Polecane', opt: 'Opcjonalne' };
  const tools = rep.tools.map((t, i) => `<button class="crow ${prog.tools[i] ? 'done' : ''}" data-tool="${i}"><span class="cbox">${icon('check', 15)}</span><span class="cname"><b>${esc(t.name)}</b>${t.note ? `<small>${esc(t.note)}</small>` : ''}</span><span class="need ${t.need}">${needLbl[t.need]}</span></button>`).join('');
  const parts = (rep.parts || []).map(p => {
    const c = CONF[p.conf] || CONF.low;
    return `<div class="part"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><h3>${esc(p.name)}</h3><span class="conf ${c[0]}"><i></i>${p.conf === 'high' ? 'Potwierdzone' : p.conf === 'med' ? 'Jedno źródło' : 'Niezweryfikowane'}</span></div>
      ${p.oe ? `<div class="oe"><code>${esc(p.oe.replace(/(\d{2})(\d{2})(\d)(\d{3})(\d{3})/, '$1 $2 $3 $4 $5'))}</code><button class="btn small" data-copy="${esc(p.oe)}">${icon('copy', 15)} Kopiuj numer</button></div>` : `<div class="chips"><span class="chip warn">numer OE niepotwierdzony</span></div>`}
      <p class="pn">${esc(p.note || '')}</p>
      ${p.price ? `<div class="chips"><span class="chip">${icon('list', 13)} ${esc(p.price)}</span></div>` : ''}
      ${p.alt ? `<div class="alts">${p.alt.map(a => `<div class="alt"><b>${esc(a.brand)} ${esc(a.no)}</b><span>${esc(a.note)}</span></div>`).join('')}</div>` : ''}
      ${srcChips(p.src)}</div>`;
  }).join('');
  const steps = rep.steps.map((s, i) => {
    const c = CONF[s.conf] || CONF.low;
    const ph = s.phase && s.phase !== (rep.steps[i - 1] || {}).phase ? `<h3 class="phase">${esc(s.phase)}</h3>` : '';
    return `${ph}<article class="step ${prog.steps[i] ? 'done' : ''}" data-i="${i}" id="st${i}">
      <button class="head" data-open="${i}"><span class="num">${prog.steps[i] ? icon('check', 18) : i + 1}</span><span><b>${esc(s.t)}</b><small>~${s.min} min · ${VIEW_LABELS[s.view].split(':')[0].toLowerCase()}</small></span><span class="conf ${c[0]}"><i></i></span></button>
      <div class="body"><div><div class="content">
        ${s.danger ? `<div class="dangerbox">${icon('alert', 20)}<span>Poduszka powietrzna: nie odłączaj wtyczki bez odłączenia akumulatora i odczekania co najmniej 30 minut.</span></div>` : ''}
        <p>${esc(s.b)}</p>
        ${s.see ? `<div class="seebox">${icon('eye', 18)}<span><b>Co zobaczysz</b>${esc(s.see)}</span></div>` : ''}
        ${s.tools ? `<div class="stools">${s.tools.map(t => `<span class="chip">${icon('wrench', 12)} ${esc(t)}</span>`).join('')}</div>` : ''}
        ${s.how ? `<ol class="how">${s.how.map(h => `<li>${esc(h)}</li>`).join('')}</ol>` : ''}
        ${mediaHtml(s.media)}
        ${s.mistakes ? `<div class="mistbox">${icon('alert', 18)}<span><b>Typowe błędy</b><ul>${s.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}</ul></span></div>` : ''}
        ${s.check ? `<div class="checkbox">${icon('check', 18)}<span><b>Sprawdź zanim pójdziesz dalej</b>${esc(s.check)}</span></div>` : ''}
        ${s.tip ? `<div class="tipbox">${icon('spark', 18)}<span>${esc(s.tip)}</span></div>` : ''}
        ${s.warn ? `<div class="tipbox">${icon('alert', 18)}<span>Zabezpiecz lakier taśmą malarską.</span></div>` : ''}
        ${s.link ? `<a class="btn small" href="#/car/${carId}/r/${s.link}">${icon('book', 16)} Otwórz kartę: ${esc(relTitle(s.link))}</a>` : ''}
        <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span class="conf ${c[0]}"><i></i>${c[1]}</span>${srcChips(s.src)}</div>
        <div class="actions">${i > 0 ? `<button class="btn small ghost" data-prev="${i}">Wstecz</button>` : ''}<span class="grow"></span><button class="btn small primary" data-done="${i}">${i === rep.steps.length - 1 ? 'Gotowe: zakończ' : 'Gotowe, dalej'} ${icon('chevron', 16)}</button></div>
      </div></div></div></article>`;
  }).join('');
  const after = (rep.after || []).map((t, i) => `<button class="crow ${prog.after[i] ? 'done' : ''}" data-after="${i}"><span class="cbox">${icon('check', 15)}</span><span class="cname"><b>${esc(t)}</b></span><span></span></button>`).join('');
  const srcList = order.map((k, i) => { const s = pack.sources[k]; return s ? `<a class="srcitem" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="n">${i + 1}</span><span><b style="font-weight:600">${esc(s.title)}</b><small>${esc(s.kind)}</small></span>${icon('link', 18)}</a>` : ''; }).join('');
  const comp = COMPLETE[rep.completeness] || COMPLETE['szkic'];
  const related = (rep.related || []).map(id => `<a class="chip accent" href="#/car/${carId}/r/${id}">${icon('book', 13)} ${esc(relTitle(id))}</a>`).join('');
  const shopping = () => [`Lista: ${rep.title} (${carName(car)})`, '', 'CZĘŚCI:', ...(rep.parts || []).map(p => `- ${p.name}${p.oe ? ' [' + p.oe + ']' : ' [numer do potwierdzenia]'}`), '', 'NARZĘDZIA:', ...rep.tools.map(t => `- ${t.name}${t.note ? ' (' + t.note + ')' : ''}`)].join('\n');

  // ---------- talia kart ----------
  const films = [];
  rep.steps.forEach(s => (s.media || []).forEach(m => { if (m.type === 'film' && !films.find(f => f.id === m.id)) films.push(m); }));
  const cards = [];
  const nSteps = rep.steps.length;
  const compl = COMPLETE[rep.completeness] || COMPLETE['szkic'];
  const doorTxt = rep.door === 'rear' ? 'Drzwi tylne' : rep.door === 'both' ? 'Drzwi przód i tył' : 'Drzwi przednie';
  const noteHtml = (w, cls) => `<div class="dk-note ${w.lvl || cls}"><b>${esc(w.t)}</b><span>${esc(w.b)}</span></div>`;

  cards.push({ label: 'Podsumowanie', html: `
    <div class="dk-meta"><span class="dk-pill ${compl[0]}">${compl[1]}</span><span class="dk-pill">${doorTxt}</span></div>
    <h1 class="dk-h1">${esc(rep.title)}</h1>
    <p class="dk-sub">${esc(rep.subtitle)}</p>
    <div class="dk-stats"><div><b>${dots(rep.difficulty)}</b><small>Trudność</small></div><div><b>${fmtTime(rep.time)}</b><small>Czas</small></div><div><b>${nSteps}</b><small>Kroków</small></div></div>
    <p class="dk-lead">${esc(rep.summary)}</p>
    <p class="dk-hint">Przesuń palcem w prawo, aby przejść dalej →</p>` });

  if ((rep.warnings || []).length || (rep.extras || []).length) cards.push({ label: 'Ostrzeżenia', html: `
    <div class="dk-meta"><span class="dk-pill danger">Przeczytaj przed startem</span></div>
    <h2 class="dk-h2">Ostrzeżenia</h2>
    ${(rep.warnings || []).map(w => noteHtml(w)).join('')}${(rep.extras || []).map(w => noteHtml(w, 'info')).join('')}` });

  cards.push({ label: 'Narzędzia', html: `
    <div class="dk-meta"><span class="dk-pill">Przygotowanie</span><span class="dk-pill" id="toolcount"></span></div>
    <h2 class="dk-h2">Narzędzia do odhaczenia</h2>
    <div class="dk-checks" id="tools">${rep.tools.map((t, i) => `<button class="dk-check ${prog.tools[i] ? 'done' : ''}" data-tool="${i}"><span class="cbox">${icon('check', 16)}</span><span class="cname"><b>${esc(t.name)}</b>${t.note ? `<small>${esc(t.note)}</small>` : ''}</span><span class="need ${t.need}">${needLbl[t.need] || ''}</span></button>`).join('')}</div>` });

  if ((rep.parts || []).length) cards.push({ label: 'Części', html: `
    <div class="dk-meta"><span class="dk-pill">Przygotowanie</span></div>
    <h2 class="dk-h2">Części do kupienia</h2>
    <div class="dk-parts">${rep.parts.map(p => { const c = CONF[p.conf] || CONF.low; return `<div class="dk-part"><div class="ph"><b>${esc(p.name)}</b><span class="conf ${c[0]}"><i></i>${p.conf === 'high' ? 'Potwierdzone' : p.conf === 'med' ? 'Jedno źródło' : 'Do sprawdzenia'}</span></div>
      ${p.oe ? `<div class="oe"><code>${esc(p.oe.replace(/(\d{2})(\d{2})(\d)(\d{3})(\d{3})/, '$1 $2 $3 $4 $5'))}</code><button class="btn small" data-copy="${esc(p.oe)}">${icon('copy', 15)} Kopiuj</button></div>` : '<div class="oe"><small>Numer do potwierdzenia po VIN</small></div>'}
      <p>${esc(p.note || '')}${p.price ? ` <em>${esc(p.price)}</em>` : ''}</p>${p.alt ? `<p class="alts">${p.alt.map(a => `${esc(a.brand)} ${esc(a.no)}`).join(' · ')}</p>` : ''}</div>`; }).join('')}</div>
    <button class="btn block" id="shop">${icon('copy', 18)} Kopiuj listę części i narzędzi</button>` });

  if (films.length) cards.push({ label: 'Filmy', html: `
    <div class="dk-meta"><span class="dk-pill">Przygotowanie</span></div>
    <h2 class="dk-h2">Obejrzyj przed pracą</h2>
    <p class="dk-lead">Filmy dotyczą tego samego modelu. Offline nie zagrają: pobierz je wcześniej w aplikacji YouTube.</p>
    <div class="dk-films">${films.map((f, k) => `<a class="dk-film" href="https://www.youtube.com/watch?v=${esc(f.id)}" target="_blank" rel="noopener"><span class="fthumb"><img loading="lazy" referrerpolicy="no-referrer" src="https://i.ytimg.com/vi/${esc(f.id)}/hqdefault.jpg" alt=""><span class="flen">${esc(f.len || '')}</span></span><span class="ftxt"><b>Film naprawy ${k + 1}</b><small>${esc(f.cap)}</small><em>${esc(f.credit)}</em></span></a>`).join('')}</div>` });

  const stepBase = cards.length;
  rep.steps.forEach((s, i) => {
    const c = CONF[s.conf] || CONF.low;
    const photos = (s.media || []).filter(m => m.type === 'photo');
    const clips = (s.media || []).filter(m => m.type === 'video');
    const links = (s.media || []).filter(m => m.type === 'link');
    const ph = photos.length ? `<button class="dk-photo" data-gal="${i}" aria-label="Powiększ zdjęcie"><img decoding="async" referrerpolicy="no-referrer" src="${esc(photos[0].url)}" alt="${esc(photos[0].cap)}"><span class="dk-zoom">${icon('eye', 14)} ${photos.length > 1 ? `1 z ${photos.length} · ` : ''}dotknij, aby powiększyć</span></button><p class="dk-cap">${esc(photos[0].cap)} <em>${esc(photos[0].credit)}</em></p>` : '';
    const extra = [...clips.map((m, k) => `<button class="dk-chip" data-clip='${esc(JSON.stringify({ id: m.id, t: m.t, e: m.e, cap: m.cap }))}'>${icon('chevron', 14)} Film od ${fmtT(m.t)}${m.e ? ' do ' + fmtT(m.e) : ''}</button>`), ...links.map(m => `<a class="dk-chip" href="${esc(m.url)}" target="_blank" rel="noopener">${icon('link', 14)} ${esc(m.label || 'Link')}</a>`)].join('');
    const metaA = `<div class="dk-meta"><span class="dk-pill gold">${esc(s.phase || 'Krok')}</span><span class="dk-pill">Krok ${i + 1} z ${nSteps}</span><span class="dk-pill">~${s.min} min</span><span class="dk-pill conf-${c[0]}">${s.conf === 'high' ? 'Pewne' : s.conf === 'med' ? 'Jedno źródło' : 'Do sprawdzenia'}</span></div>`;
    const metaB = tag => `<div class="dk-meta"><span class="dk-pill gold">${esc(s.phase || 'Krok')}</span><span class="dk-pill">Krok ${i + 1} z ${nSteps}</span><span class="dk-pill">${tag}</span></div>`;
    const dangerH = s.danger ? `<div class="dk-note danger"><b>Poduszka powietrzna</b><span>${typeof s.danger === 'string' ? esc(s.danger) : 'Nie odłączaj wtyczki bez odłączenia akumulatora i odczekania co najmniej 30 minut.'}</span></div>` : '';
    const warnH = s.warn ? `<div class="dk-note warn"><b>Uwaga</b><span>${typeof s.warn === 'string' ? esc(s.warn) : 'Zabezpiecz lakier taśmą malarską.'}</span></div>` : '';
    const lenOf = a => (a || []).reduce((n, x) => n + String(x).length + 25, 0);
    // podział listy czynności na ekrany według budżetu znaków (zdjęcie zajmuje miejsce)
    let budget = (ph ? 400 : 760) - (s.danger ? 230 : 0) - (s.warn ? 160 : 0) - (extra ? 50 : 0) - (String(s.t).length > 38 ? 40 : 0);
    const chunks = []; let curc = [], used = 0, bud = Math.max(budget, 200);
    (s.how || []).forEach(h => { const l = String(h).length + 25; if (curc.length && used + l > bud) { chunks.push(curc); curc = []; used = 0; bud = 820; } curc.push(h); used += l; });
    if (curc.length) chunks.push(curc);
    let num = 0; const group = [];
    if (!chunks.length) chunks.push(null);
    chunks.forEach((ch, k) => {
      const first = k === 0, tagA = chunks.length > 1 ? `Zrób ${k + 1}/${chunks.length}` : 'Zrób';
      const lis = ch ? `<ol class="dk-how" start="${num + 1}" style="counter-reset:h ${num}">${ch.map(h => `<li>${esc(h)}</li>`).join('')}</ol>` : `<p class="dk-lead">${esc(s.b)}</p>`;
      num += ch ? ch.length : 0;
      group.push({ step: i, tag: tagA, first, label: s.t, html: `
        ${first ? metaA : metaB(tagA)}
        <h2 class="${first ? 'dk-h2' : 'dk-h3'}">${esc(s.t)}</h2>
        ${first ? dangerH + warnH + ph + (extra ? `<div class="dk-extra">${extra}</div>` : '') : ''}
        ${lis}
        <p class="dk-next">Dalej →</p>` });
    });
    const bigB = String(s.b || '').length + String(s.see || '').length + lenOf(s.mistakes) + String(s.check || '').length + String(s.tip || '').length;
    const bTail = `${s.link ? `<a class="btn small" href="#/car/${carId}/r/${s.link}">${icon('book', 16)} Otwórz kartę: ${esc(relTitle(s.link))}</a>` : ''}<div class="dk-srcs">${srcChips(s.src)}</div>`;
    const ctx = `<p class="dk-lead">${esc(s.b)}</p>${s.see ? `<p class="dk-see">${icon('eye', 16)}<span><b>Co zobaczysz:</b> ${esc(s.see)}</span></p>` : ''}${s.tools ? `<div class="dk-tl">${s.tools.map(t => `<span class="dk-pill">${icon('wrench', 12)} ${esc(t)}</span>`).join('')}</div>` : ''}`;
    const risk = `${s.mistakes ? `<div class="dk-note mist"><b>Typowe błędy</b><ul>${s.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}${s.check ? `<div class="dk-note check"><b>Sprawdź, zanim przesuniesz dalej</b><span>${esc(s.check)}</span></div>` : ''}${s.tip ? `<div class="dk-note tip"><b>Wskazówka</b><span>${esc(s.tip)}</span></div>` : ''}`;
    if (bigB > 760) {
      group.push({ step: i, tag: 'Kontekst', label: s.t, html: `${metaB('Kontekst')}<h2 class="dk-h3">${esc(s.t)}</h2>${ctx}` });
      group.push({ step: i, tag: 'Uwaga', label: s.t, html: `${metaB('Uwaga i kontrola')}<h2 class="dk-h3">${esc(s.t)}</h2>${risk}${bTail}` });
    } else group.push({ step: i, tag: 'Uwaga', label: s.t, html: `${metaB('Uwaga i kontrola')}<h2 class="dk-h3">${esc(s.t)}</h2>${ctx}${risk}${bTail}` });
    group.forEach((g, k) => { g.last = k === group.length - 1; cards.push(g); });
  });

  cards.push({ label: 'Po montażu', html: `
    <div class="dk-meta"><span class="dk-pill">Koniec</span></div>
    <h2 class="dk-h2">Po montażu: sprawdź</h2>
    <div class="dk-checks" id="after">${(rep.after || []).map((t, i) => `<button class="dk-check ${prog.after[i] ? 'done' : ''}" data-after="${i}"><span class="cbox">${icon('check', 16)}</span><span class="cname"><b>${esc(t)}</b></span></button>`).join('')}</div>
    ${(rep.unknown || []).length ? `<div class="dk-note mist"><b>Czego nie wiemy (brak w źródłach)</b><ul>${rep.unknown.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>` : ''}
    ${related ? `<div class="chips">${related}</div>` : ''}` });

  cards.push({ label: 'Źródła', html: `
    <div class="dk-meta"><span class="dk-pill">Źródła (${order.length})</span></div>
    <h2 class="dk-h2">Skąd to wiemy</h2>
    <div class="srclist">${srcList}</div>
    <p class="dk-foot">Opracowanie własnymi słowami na podstawie publicznych źródeł. Przy poduszkach powietrznych, hamulcach i zawieszeniu zachowaj szczególną ostrożność.</p>` });

  const total = cards.length;
  const stepLast = []; cards.forEach((c, k) => { if (c.step != null && c.last) stepLast[c.step] = k; });
  let pos = Math.max(0, Math.min(prog.pos ?? 0, total - 1));
  const sheetItems = cards.map((c, k) => (c.step != null && !c.first) ? '' : `<button class="dk-si" data-go="${k}"><span class="n">${c.step != null ? c.step + 1 : '•'}</span><span>${esc(c.label)}</span></button>`).join('');

  return {
    tab: null,
    html: `
      <div class="dk" id="dk">
        <header class="dk-top">
          <a class="dk-ib" href="#/car/${carId}/zone/doors?door=${rep.door === 'rear' ? 'rear' : 'front'}" aria-label="Wróć do listy">${icon('back', 22)}</a>
          <div class="dk-t"><b>${esc(rep.title)}</b><small>${esc(pack.title)}${car.engine ? ' · ' + esc(car.engine) : ''}</small></div>
          <button class="dk-ib" id="dk-menu" aria-label="Spis kart">${icon('list', 22)}</button>
        </header>
        <div class="dk-loc" id="dk-loc" hidden>${(setDoorPhoto(((DOOR_PHOTOS[pack.id] || {}).left || {})[rep.door === 'rear' ? 'rear' : 'front']), doorSVG({ view: rep.steps[0].view, rings: 4 }))}</div>
        <div class="dk-track" id="dk-track">${cards.map((c, k) => `<section class="dk-card${c.step != null ? ' is-step' : ''}" data-k="${k}" aria-label="Karta ${k + 1} z ${total}"><div class="dk-in">${c.html}</div></section>`).join('')}</div>
        <footer class="dk-bar">
          <button class="dk-nav" id="dk-prev" aria-label="Poprzednia karta">${icon('back', 26)}</button>
          <button class="dk-mid" id="dk-mid"><span id="dk-count"></span><i class="dk-prog"><u id="dk-fill"></u></i></button>
          <button class="dk-nav go" id="dk-next" aria-label="Następna karta">${icon('chevron', 26)}</button>
        </footer>
        <div class="dk-sheet" id="dk-sheet" hidden><div class="dk-sheet-in">
          <div class="dk-sh-h"><b>Spis kart</b><button class="dk-ib" id="dk-close" aria-label="Zamknij">${icon('x', 22)}</button></div>
          <div class="dk-sl">${sheetItems}</div>
          ${offlineCardHtml(rep.title)}
          <button class="btn ghost block" id="reset">Zacznij tę kartę od nowa</button>
        </div></div>
      </div>`,
    bind(el) {
      document.body.classList.add('in-deck'); (el.closest('.screen') || el).classList.add('has-dk');
      const track = $('#dk-track', el), cardEls = $$('.dk-card', el);
      const svg = $('.door-art', el), rings = $$('.ring', svg);
      rings.forEach(r => { r.style.transition = 'none'; });
      const loc = $('#dk-loc', el);
      const sync = () => {
        rep.steps.forEach((_, i) => { prog.steps[i] = stepLast[i] < pos; });
        prog.pos = pos; prog.cur = cards[pos].step != null ? cards[pos].step : (pos < stepBase ? 0 : rep.steps.length - 1); S.saveProg();
      };
      const paint = () => {
        { const c0 = cards[pos]; $('#dk-count', el).textContent = c0.step != null ? `Krok ${c0.step + 1} z ${nSteps} · ${c0.tag}` : c0.label; }
        $('#dk-fill', el).style.width = ((pos + 1) / total * 100) + '%';
        $('#dk-prev', el).disabled = pos === 0; $('#dk-next', el).disabled = pos === total - 1;
        const c = cards[pos];
        if (c.step != null) {
          const s = rep.steps[c.step];
          svg.dataset.view = s.view;
          const pts = (s.focus || []).filter(a => viewOf(a) === s.view).map(a => anchorOf(a)).filter(Boolean);
          rings.forEach((r, k) => { const p = pts[k]; if (p) { r.style.transform = `translate(${p[0]}px, ${p[1]}px)`; r.style.opacity = 1; } else r.style.opacity = 0; });
          requestAnimationFrame(() => rings.forEach(r => { r.style.transition = ''; }));
          loc.hidden = false;
        } else loc.hidden = true;
        const tc = $('#toolcount', el); if (tc) tc.textContent = `${Object.values(prog.tools).filter(Boolean).length} / ${rep.tools.length} gotowe`;
      };
      const goTo = (k, smooth = true) => { k = Math.max(0, Math.min(total - 1, k)); track.scrollTo({ left: k * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' }); };
      let st;
      track.addEventListener('scroll', () => {
        clearTimeout(st);
        st = setTimeout(() => {
          const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
          if (k !== pos) { pos = Math.max(0, Math.min(total - 1, k)); sync(); paint(); cardEls[pos].scrollTop = 0; }
        }, 70);
      }, { passive: true });
      $('#dk-prev', el).onclick = () => goTo(pos - 1);
      $('#dk-next', el).onclick = () => goTo(pos + 1);
      const onKey = e => { if (!document.getElementById('dk')) { document.removeEventListener('keydown', onKey); return; } if (e.key === 'ArrowRight') goTo(pos + 1); if (e.key === 'ArrowLeft') goTo(pos - 1); };
      document.addEventListener('keydown', onKey);
      const sheet = $('#dk-sheet', el);
      const openSheet = () => { sheet.hidden = false; }, closeSheet = () => { sheet.hidden = true; };
      $('#dk-menu', el).onclick = openSheet; $('#dk-mid', el).onclick = openSheet; $('#dk-close', el).onclick = closeSheet;
      sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
      $$('[data-go]', el).forEach(b => b.onclick = () => { closeSheet(); goTo(+b.dataset.go, false); pos = +b.dataset.go; sync(); paint(); });
      bindOffline(el, pack.id, [rid, ...(rep.related || [])]);
      $$('[data-tool]', el).forEach(b => b.onclick = () => { const i = b.dataset.tool; prog.tools[i] = !prog.tools[i]; S.saveProg(); b.classList.toggle('done', !!prog.tools[i]); paint(); });
      $$('[data-after]', el).forEach(b => b.onclick = () => { const i = b.dataset.after; prog.after[i] = !prog.after[i]; S.saveProg(); b.classList.toggle('done', !!prog.after[i]); });
      $$('[data-copy]', el).forEach(b => b.onclick = () => copy(b.dataset.copy, 'Numer skopiowany'));
      const shop = $('#shop', el); if (shop) shop.onclick = () => copy(shopping(), 'Lista skopiowana');
      $('#reset', el).onclick = () => { if (confirm('Wyczyścić postęp tej karty?')) { S.resetProg(carId, rid); render(); } };
      // zdjęcia: galeria
      el.addEventListener('click', e => {
        const g = e.target.closest('[data-gal]');
        if (g) { const s = rep.steps[+g.dataset.gal]; openGallery((s.media || []).filter(m => m.type === 'photo'), 0); return; }
        const cl = e.target.closest('[data-clip]');
        if (cl) openClip(JSON.parse(cl.dataset.clip));
      });
      el.addEventListener('error', e => {
        const img = e.target;
        if (img && img.tagName === 'IMG' && img.closest('.dk-photo')) { const b = img.closest('.dk-photo'); img.remove(); b.classList.add('broken'); b.insertAdjacentHTML('afterbegin', `<span class="mbroken"><b>Zdjęcie niedostępne (offline lub źródło blokuje)</b><small>Dotknij, aby spróbować powiększyć</small></span>`); }
      }, true);
      const fit = () => {
        cardEls.forEach(c => {
          const inn = $('.dk-in', c); inn.style.fontSize = ''; const ph = $('.dk-photo', c); if (ph) ph.style.height = '';
          let fs = parseFloat(getComputedStyle(inn).fontSize);
          for (let n = 0; n < 6 && c.scrollHeight > c.clientHeight + 1 && fs > 14; n++) { fs -= 0.5; inn.style.fontSize = fs + 'px'; }
          if (c.scrollHeight > c.clientHeight + 1 && ph) { let h = ph.offsetHeight; while (c.scrollHeight > c.clientHeight + 1 && h > 80) { h -= 12; ph.style.height = h + 'px'; } }
        });
      };
      requestAnimationFrame(() => { fit(); goTo(pos, false); paint(); sync(); });
      window.addEventListener('resize', () => { fit(); goTo(pos, false); });
      window.addEventListener('hashchange', () => document.body.classList.remove('in-deck'), { once: true });
    }
  };
}

function openGallery(photos, i) {
  if (!photos.length) return;
  const lb = document.createElement('div');
  lb.className = 'lightbox gal';
  let k = i;
  const paint = () => {
    const x = photos[k];
    lb.innerHTML = `<div class="lb-in"><img referrerpolicy="no-referrer" src="${esc(x.url)}" alt="${esc(x.cap)}"><div class="lb-cap"><p>${esc(x.cap)}</p><small>Źródło: ${esc(x.credit)}${photos.length > 1 ? ` · ${k + 1} z ${photos.length}` : ''}</small><div class="lb-act">${photos.length > 1 ? `<button class="btn small" data-p>◀</button><button class="btn small" data-n>▶</button>` : ''}<a class="btn small" href="${esc(x.page || x.url)}" target="_blank" rel="noopener">${icon('link', 16)} Źródło</a><button class="btn small primary" data-x>Zamknij</button></div></div></div>`;
  };
  const close = () => { lb.remove(); document.removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') { k = (k + 1) % photos.length; paint(); } if (e.key === 'ArrowLeft') { k = (k + photos.length - 1) % photos.length; paint(); } };
  lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('[data-x]')) close(); else if (e.target.closest('[data-n]')) { k = (k + 1) % photos.length; paint(); } else if (e.target.closest('[data-p]')) { k = (k + photos.length - 1) % photos.length; paint(); } });
  document.addEventListener('keydown', key); paint(); document.body.appendChild(lb);
}
function openClip({ id, t, e, cap }) {
  const lb = document.createElement('div'); lb.className = 'lightbox';
  const src = `https://www.youtube-nocookie.com/embed/${esc(id)}?start=${t}${e ? '&end=' + e : ''}&rel=0&playsinline=1&autoplay=1&modestbranding=1`;
  lb.innerHTML = `<div class="lb-in"><div class="mframe">${navigator.onLine ? `<iframe src="${src}" title="Film instruktażowy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>` : '<p style="padding:20px;color:#fff">Brak internetu. Ten film zagra tylko online (lub pobierz go w aplikacji YouTube).</p>'}</div><div class="lb-cap"><p>${esc(cap || '')}</p><div class="lb-act"><a class="btn small" href="https://www.youtube.com/watch?v=${esc(id)}&t=${t}s" target="_blank" rel="noopener">${icon('link', 16)} Otwórz w YouTube</a><button class="btn small primary" data-x>Zamknij</button></div></div></div>`;
  lb.addEventListener('click', ev => { if (ev.target === lb || ev.target.closest('[data-x]')) lb.remove(); });
  document.body.appendChild(lb);
}

/* ---------- DODAJ AUTO ---------- */
async function addScreen() {
  const st = { step: 1, make: '', model: '', gen: '', year: '', engine: '', fuel: 'diesel', kw: '', vin: '', nick: '', range: null, customMake: false, customModel: false };
  return {
    tab: '#/add',
    html: `${topbar({ back: '#/', title: 'Dodaj auto', sub: 'Garaż' })}<div class="wrap" id="wiz"></div>`,
    bind(el) {
      const wiz = $('#wiz', el);
      const bar = () => `<div class="stepper">${[1, 2, 3].map(i => `<i class="${i <= st.step ? 'on' : ''}"></i>`).join('')}</div>`;
      async function paint() {
        if (st.step === 1) {
          wiz.innerHTML = `${bar()}<div class="section-h">${icon('car', 16)} Marka</div>
            <div class="pick">${Object.keys(CATALOG).map(m => `<button data-make="${esc(m)}" class="${st.make === m && !st.customMake ? 'on' : ''}">${esc(m)}</button>`).join('')}<button data-make="__other" class="${st.customMake ? 'on' : ''}">Inna…</button></div>
            ${st.customMake ? `<div class="field"><label>Marka</label><input class="input" id="w-make" value="${esc(st.make)}" placeholder="np. Seat"></div><button class="btn primary block" id="w-next1">Dalej</button>` : ''}`;
          $$('[data-make]', wiz).forEach(b => b.onclick = () => {
            if (b.dataset.make === '__other') { st.customMake = true; st.make = ''; paint(); return; }
            st.customMake = false; st.make = b.dataset.make; st.step = 2; paint();
          });
          const n1 = $('#w-next1', wiz); if (n1) n1.onclick = () => { const v = $('#w-make', wiz).value.trim(); if (!v) return toast('Wpisz markę'); st.make = v; st.customModel = true; st.step = 2; paint(); };
        } else if (st.step === 2) {
          const list = CATALOG[st.make] || [];
          wiz.innerHTML = `${bar()}<div class="section-h">${icon('car', 16)} Model: ${esc(st.make)}</div>
            <div class="pick">${list.map(([m, g, a, b]) => `<button data-model="${esc(m)}|${esc(g)}|${a}|${b}" class="${st.model === m && st.gen === g ? 'on' : ''}">${esc(m)} ${esc(g)}<small>${a}–${b}</small></button>`).join('')}<button data-model="__other" class="${st.customModel ? 'on' : ''}">Inny…</button></div>
            ${st.customModel || !list.length ? `<div class="row2"><div class="field"><label>Model</label><input class="input" id="w-model" value="${esc(st.model)}" placeholder="np. Leon"></div><div class="field"><label>Generacja (opc.)</label><input class="input" id="w-gen" value="${esc(st.gen)}" placeholder="np. MK2"></div></div><button class="btn primary block" id="w-next2">Dalej</button>` : ''}
            <button class="btn ghost block" id="w-back">Wstecz</button>`;
          $$('[data-model]', wiz).forEach(b => b.onclick = () => {
            if (b.dataset.model === '__other') { st.customModel = true; st.model = ''; st.gen = ''; paint(); return; }
            const [m, g, a, bb] = b.dataset.model.split('|'); st.customModel = false; st.model = m; st.gen = g; st.range = [+a, +bb]; st.year = st.year || Math.round((+a + +bb) / 2); st.step = 3; paint();
          });
          const n2 = $('#w-next2', wiz); if (n2) n2.onclick = () => { const m = $('#w-model', wiz).value.trim(); if (!m) return toast('Wpisz model'); st.model = m; st.gen = $('#w-gen', wiz).value.trim(); st.range = null; st.step = 3; paint(); };
          $('#w-back', wiz).onclick = () => { st.step = 1; paint(); };
        } else {
          const probe = { make: st.make, model: st.model, gen: st.gen, year: +st.year || 0 };
          const m = st.year ? await matchPack(probe).catch(() => null) : null;
          wiz.innerHTML = `${bar()}<div class="section-h">${icon('key', 16)} Szczegóły: ${esc(st.make)} ${esc(st.model)} ${esc(st.gen)}</div>
            <div class="row2"><div class="field"><label>Rok produkcji</label><input class="input" id="w-year" type="number" inputmode="numeric" min="1950" max="2030" value="${esc(st.year)}" placeholder="2003"></div>
            <div class="field"><label>Paliwo</label><select class="input" id="w-fuel">${FUELS.map(f => `<option ${f === st.fuel ? 'selected' : ''}>${f}</option>`).join('')}</select></div></div>
            <div class="row2"><div class="field"><label>Silnik</label><input class="input" id="w-engine" value="${esc(st.engine)}" placeholder="np. 3.0d (M57)"></div>
            <div class="field"><label>Moc (kW)</label><input class="input" id="w-kw" type="number" inputmode="numeric" value="${esc(st.kw)}" placeholder="135"></div></div>
            <div class="field"><label>VIN (opcjonalnie, tylko w tym urządzeniu)</label><input class="input" id="w-vin" maxlength="17" autocapitalize="characters" value="${esc(st.vin)}" placeholder="17 znaków"></div>
            <div class="field"><label>Nazwa własna (opcjonalnie)</label><input class="input" id="w-nick" value="${esc(st.nick)}" placeholder="np. Mój X5"></div>
            <div class="matchbox ${m ? 'yes' : 'no'}" id="w-match">${m ? `<b>${icon('check', 16)} Mamy opracowanie: ${esc(m.title)}</b><p style="color:var(--muted);font-size:14px">Po dodaniu auta od razu zobaczysz poradniki.</p>` : `<b>${icon('clock', 16)} Brak opracowania dla tego auta</b><p style="color:var(--muted);font-size:14px">Dodasz auto do garażu, a na jego ekranie zamówisz opracowanie.</p>`}</div>
            <button class="btn primary block" id="w-save">${icon('check', 18)} Dodaj do garażu</button>
            <button class="btn ghost block" id="w-back">Wstecz</button>`;
          const rematch = async () => {
            st.year = $('#w-year', wiz).value; st.engine = $('#w-engine', wiz).value; st.kw = $('#w-kw', wiz).value; st.vin = $('#w-vin', wiz).value; st.nick = $('#w-nick', wiz).value; st.fuel = $('#w-fuel', wiz).value;
            const mm = st.year ? await matchPack({ make: st.make, model: st.model, gen: st.gen, year: +st.year }).catch(() => null) : null;
            const box = $('#w-match', wiz); box.className = 'matchbox ' + (mm ? 'yes' : 'no');
            box.innerHTML = mm ? `<b>${icon('check', 16)} Mamy opracowanie: ${esc(mm.title)}</b><p style="color:var(--muted);font-size:14px">Po dodaniu auta od razu zobaczysz poradniki.</p>` : `<b>${icon('clock', 16)} Brak opracowania dla tego auta</b><p style="color:var(--muted);font-size:14px">Dodasz auto do garażu, a na jego ekranie zamówisz opracowanie.</p>`;
          };
          $('#w-year', wiz).addEventListener('input', rematch);
          $('#w-back', wiz).onclick = () => { rematch(); st.step = 2; paint(); };
          $('#w-save', wiz).onclick = () => {
            const y = +$('#w-year', wiz).value;
            if (!y || y < 1950 || y > 2030) return toast('Podaj rok produkcji');
            const car = S.addCar({ make: st.make, model: st.model, gen: st.gen, year: y, engine: $('#w-engine', wiz).value.trim(), fuel: $('#w-fuel', wiz).value, kw: +$('#w-kw', wiz).value || 0, vin: $('#w-vin', wiz).value.trim().toUpperCase(), nick: $('#w-nick', wiz).value.trim() });
            toast('Dodano do garażu'); location.hash = `#/car/${car.id}`;
          };
        }
        wiz.classList.remove('screen'); void wiz.offsetWidth; wiz.classList.add('screen');
      }
      paint();
    }
  };
}

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

/* ---------- start ---------- */
window.__warsztatOK = true;
S.init();
// Wzbogacenie indeksu napraw o postęp (liczba kroków) wymaga pack.repairs — dostarcza build.py.
render();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  // po aktualizacji aplikacji (nowy service worker przejmuje kontrolę) odśwież widok jednorazowo
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => {
    r.update();
    // automatyczne sprawdzanie nowej wersji: co 2 minuty i po powrocie do aplikacji
    const check = () => r.update().catch(() => {});
    setInterval(check, 120000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    window.addEventListener('focus', check);
  }).catch(() => {}));
}
