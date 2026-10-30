import { icon } from './icons.js';
import * as S from './store.js';
import { getPack, getRepair, matchPack } from './data.js';
import { carSVG, ZONES, PHOTOS } from './art-car.js';
import { doorSVG, ANCHORS, VIEW_LABELS, viewOf } from './art-door.js';
import { CATALOG, FUELS } from './catalog.js';

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
async function carScreen(id) {
  const car = S.car(id);
  if (!car) { location.hash = '#/'; return { html: '' }; }
  const match = await matchPack(car).catch(() => null);
  const pack = match ? await getPack(match.id) : null;
  const ready = pack ? pack.systems.filter(s => s.ready) : [];
  const sysTiles = (pack ? pack.systems : defaultSystems()).map(s => {
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
        <div class="card hero-card glow">
          ${carSVG({ pins: pack ? ['door_front', 'door_rear'] : [], photo: PHOTOS[pack && pack.id] || '' })}
          <div class="caption" id="cap">${pack ? `${icon('spark', 16)} Dotknij drzwi, aby zobaczyć poradniki` : `${icon('clock', 16)} Dla tego auta nie ma jeszcze opracowania`}</div>
        </div>
        <div class="car-side">
        ${pack ? `<div class="chips" style="padding:0 4px"><span class="chip ok">${icon('check', 13)} ${esc(pack.title)} · ${esc(pack.status)}</span><span class="chip">${ready.length} z ${pack.systems.length} układów</span></div>` : `
        <div class="matchbox no">
          <b>Brak opracowania dla ${esc(car.make)} ${esc(car.model)} ${esc(car.year)}</b>
          <p style="color:var(--muted);font-size:14px">Opracowania powstają na zamówienie: wygenerujesz polecenie dla Claude, który zbierze źródła i dopisze paczkę do aplikacji.</p>
          <button class="btn primary" id="req">${icon('wrench', 18)} Zamów opracowanie</button>
        </div>`}
        <div class="section-h">${icon('list', 16)} Układy</div>
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
      $$('[data-zone]', el).forEach(z => {
        z.addEventListener('mouseenter', () => { cap.innerHTML = `<b>${z.dataset.label}</b>`; });
        z.addEventListener('click', () => {
          const Z = ZONES[z.dataset.zone];
          if (pack && Z.system === 'doors') location.hash = `#/car/${id}/sys/doors?door=${Z.door}`;
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
      <p class="foot">Szkic jest poglądowy: położenie elementów jest orientacyjne. Rysunek przedstawia lewe przednie drzwi.</p>
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
        stage.innerHTML = doorSVG({ view, hotspots: hsFor(door), rings: 1 });
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

/* ---------- NAPRAWA ---------- */
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
    return `<article class="step ${prog.steps[i] ? 'done' : ''}" data-i="${i}" id="st${i}">
      <button class="head" data-open="${i}"><span class="num">${prog.steps[i] ? icon('check', 18) : i + 1}</span><span><b>${esc(s.t)}</b><small>~${s.min} min · ${VIEW_LABELS[s.view].split(':')[0].toLowerCase()}</small></span><span class="conf ${c[0]}"><i></i></span></button>
      <div class="body"><div><div class="content">
        ${s.danger ? `<div class="dangerbox">${icon('alert', 20)}<span>Poduszka powietrzna: nie odłączaj wtyczki bez odłączenia akumulatora i odczekania co najmniej 30 minut.</span></div>` : ''}
        <p>${esc(s.b)}</p>
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

  return {
    tab: null,
    html: `
      ${topbar({ back: `#/car/${carId}/sys/doors?door=${rep.door === 'rear' ? 'rear' : 'front'}`, title: rep.title, sub: `${pack.title}${car.engine ? ' · ' + car.engine : ''}` })}
      <div class="wrap">
        <div class="rhero">
          <div class="chips"><span class="chip ${comp[0]}">${comp[1]}</span><span class="chip">${rep.door === 'rear' ? 'Drzwi tylne' : rep.door === 'both' ? 'Drzwi przód i tył' : 'Drzwi przednie'}</span></div>
          <h1>${esc(rep.title)}</h1><p class="sub">${esc(rep.subtitle)}</p>
          <div class="stats"><div class="stat"><span class="v">${dots(rep.difficulty)}</span><span class="l">Trudność</span></div><div class="stat"><span class="v">${fmtTime(rep.time)}</span><span class="l">Czas</span></div><div class="stat"><span class="v">${rep.tools.filter(t => t.need === 'must').length}</span><span class="l">Narzędzia</span></div></div>
          <p class="summary">${esc(rep.summary)}</p>
        </div>
        ${notes}${extras}
        <div class="section-h">${icon('wrench', 16)} Narzędzia <span class="count" id="toolcount"></span></div>
        <div class="card checklist" id="tools">${tools}</div>
        ${parts ? `<div class="section-h">${icon('book', 16)} Części</div><div style="display:grid;gap:10px">${parts}</div>` : ''}
        <button class="btn block" id="shop">${icon('copy', 18)} Kopiuj listę części i narzędzi</button>
        <div class="section-h">${icon('list', 16)} Krok po kroku <span class="count" id="stepcount"></span></div>
        <div class="player">
          <div class="pdiag"><div class="inner">
            <div>${doorSVG({ view: rep.steps[0].view, rings: 4 })}</div>
            <div class="stepinfo"><small id="pi-n"></small><b id="pi-t"></b><span class="viewtag" id="pi-v"></span><div class="pbar"><i id="pbar"></i></div></div>
          </div></div>
          <div class="steps" id="steps">${steps}</div>
        </div>
        <div class="section-h">${icon('shield', 16)} Po montażu: sprawdź</div>
        <div class="card checklist" id="after">${after}</div>
        ${(rep.unknown || []).length ? `<div class="unknown"><b>${icon('alert', 16)} Czego nie wiemy (brak w źródłach)</b><ul>${rep.unknown.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>` : ''}
        ${related ? `<div class="section-h">${icon('link', 16)} Powiązane karty</div><div class="chips">${related}</div>` : ''}
        <div class="section-h">${icon('book', 16)} Źródła <span class="count">${order.length}</span></div>
        <div class="srclist">${srcList}</div>
        <p class="foot">Opracowanie własnymi słowami na podstawie publicznych źródeł. Przy poduszkach powietrznych, hamulcach i zawieszeniu zachowaj szczególną ostrożność. Wartości oznaczone jako niepotwierdzone sprawdź przed użyciem.</p>
        <button class="btn ghost block" id="reset">Zacznij tę kartę od nowa</button>
      </div>`,
    bind(el) {
      const svg = $('.door-art', el); const rings = $$('.ring', svg);
      const stepEls = $$('.step', el);
      const total = rep.steps.length;
      let cur = Math.min(prog.cur ?? firstUndone(), total - 1);
      function firstUndone() { const i = rep.steps.findIndex((_, k) => !prog.steps[k]); return i < 0 ? 0 : i; }
      rings.forEach(r => { r.style.transition = 'none'; });
      const paintCounts = () => {
        const d = Object.values(prog.steps).filter(Boolean).length;
        $('#stepcount', el).textContent = `${d} / ${total}`;
        $('#pbar', el).style.width = (d / total * 100) + '%';
        const tl = Object.values(prog.tools).filter(Boolean).length;
        $('#toolcount', el).textContent = `${tl} / ${rep.tools.length} gotowe`;
      };
      function activate(i, scroll) {
        cur = i; prog.cur = i; S.saveProg();
        const s = rep.steps[i];
        stepEls.forEach((e, k) => e.classList.toggle('active', k === i));
        svg.dataset.view = s.view;
        const pts = (s.focus || []).filter(a => viewOf(a) === s.view).map(a => ANCHORS[a]).filter(Boolean);
        rings.forEach((r, k) => {
          const p = pts[k];
          if (p) { r.style.transform = `translate(${p[0]}px, ${p[1]}px)`; r.style.opacity = 1; }
          else r.style.opacity = 0;
        });
        requestAnimationFrame(() => rings.forEach(r => { r.style.transition = ''; }));
        $('#pi-n', el).textContent = `Krok ${i + 1} z ${total}`;
        $('#pi-t', el).textContent = s.t;
        $('#pi-v', el).innerHTML = `${icon('eye', 12)} ${VIEW_LABELS[s.view]}`;
        paintCounts();
        if (scroll) setTimeout(() => stepEls[i].scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      }
      $$('[data-open]', el).forEach(b => b.onclick = () => activate(+b.dataset.open, true));
      $$('[data-prev]', el).forEach(b => b.onclick = () => activate(+b.dataset.prev - 1, true));
      $$('[data-done]', el).forEach(b => b.onclick = () => {
        const i = +b.dataset.done;
        prog.steps[i] = true; S.saveProg();
        const e = stepEls[i]; e.classList.add('done'); $('.num', e).innerHTML = icon('check', 18);
        if (i < total - 1) activate(i + 1, true);
        else { paintCounts(); toast('Karta ukończona. Sprawdź listę po montażu.'); $('#after', el).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      });
      $$('[data-tool]', el).forEach(b => b.onclick = () => { const i = b.dataset.tool; prog.tools[i] = !prog.tools[i]; S.saveProg(); b.classList.toggle('done', !!prog.tools[i]); paintCounts(); });
      $$('[data-after]', el).forEach(b => b.onclick = () => { const i = b.dataset.after; prog.after[i] = !prog.after[i]; S.saveProg(); b.classList.toggle('done', !!prog.after[i]); });
      $$('[data-copy]', el).forEach(b => b.onclick = () => copy(b.dataset.copy, 'Numer skopiowany'));
      $('#shop', el).onclick = () => copy(shopping(), 'Lista skopiowana');
      $('#reset', el).onclick = () => { if (confirm('Wyczyścić postęp tej karty?')) { S.resetProg(carId, rid); render(); } };
      const pd = $('.pdiag .inner', el);
      const setH = () => document.documentElement.style.setProperty('--pdiag-h', pd.offsetHeight + 'px');
      setH(); if (window.ResizeObserver) new ResizeObserver(setH).observe(pd);
      activate(cur, false);
    }
  };
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
      const off = $('#offl', el);
      off.textContent = 'serviceWorker' in navigator && navigator.serviceWorker.controller ? 'aktywne' : 'włączy się po pierwszym odświeżeniu';
    }
  };
}

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
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {}));
}
