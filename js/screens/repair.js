import { route, render } from '../router.js';
import { $, $$, COMPLETE, CONF, carName, closeSheet, copy, dots, esc, fmtTime, openSheet } from '../ui.js';
import { fmtT, mediaHtml, openClip, openGallery } from '../media.js';
import { bindOffline, offlineCardHtml } from '../offline-ui.js';
import { icon } from '../icons.js';
import { getPack, getRepair, matchPack } from '../data.js';
import { DOOR_PHOTOS, VIEW_LABELS, anchorOf, doorSVG, setDoorPhoto, viewOf } from '../art-door.js';
import * as S from '../store.js';

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
    let budget = 1e9; const _unused = (ph ? 400 : 760) - (s.danger ? 230 : 0) - (s.warn ? 160 : 0) - (extra ? 50 : 0) - (String(s.t).length > 38 ? 40 : 0);
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
        ${lis}` });
    });
    const bigB = String(s.b || '').length + String(s.see || '').length + lenOf(s.mistakes) + String(s.check || '').length + String(s.tip || '').length;
    const bTail = `${s.link ? `<a class="btn small" href="#/car/${carId}/r/${s.link}">${icon('book', 16)} Otwórz kartę: ${esc(relTitle(s.link))}</a>` : ''}<div class="dk-srcs">${srcChips(s.src)}</div>`;
    const ctx = `<p class="dk-lead">${esc(s.b)}</p>${s.see ? `<p class="dk-see">${icon('eye', 16)}<span><b>Co zobaczysz:</b> ${esc(s.see)}</span></p>` : ''}${s.tools ? `<div class="dk-tl">${s.tools.map(t => `<span class="dk-pill">${icon('wrench', 12)} ${esc(t)}</span>`).join('')}</div>` : ''}`;
    const risk = `${s.mistakes ? `<div class="dk-note mist"><b>Typowe błędy</b><ul>${s.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}${s.check ? `<div class="dk-note check"><b>Sprawdź, zanim przesuniesz dalej</b><span>${esc(s.check)}</span></div>` : ''}${s.tip ? `<div class="dk-note tip"><b>Wskazówka</b><span>${esc(s.tip)}</span></div>` : ''}`;
    group[0].html += `${ctx}${risk}${bTail}`; group[0].tag = 'Krok'; group[0].last = true;
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
        <button class="dk-loc" id="dk-loc" hidden aria-label="Gdzie to jest: powiększ rysunek drzwi">${(setDoorPhoto(((DOOR_PHOTOS[pack.id] || {}).left || {})[rep.door === 'rear' ? 'rear' : 'front']), doorSVG({ view: rep.steps[0].view, rings: 4 }))}<span class="dk-loc-l">Gdzie?</span></button>
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
      loc.onclick = () => {
        const lb = document.createElement('div'); lb.className = 'lightbox';
        const v = svg.dataset.view;
        lb.innerHTML = `<div class="lb-in"><div class="dk-bigloc">${svg.outerHTML}</div><div class="lb-cap"><p><b>Gdzie to jest:</b> ${esc(VIEW_LABELS[v] || '')}. Złota celownica wskazuje miejsce na drzwiach.</p><div class="lb-act"><button class="btn small primary" data-x>Zamknij</button></div></div></div>`;
        lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('[data-x]')) lb.remove(); });
        document.body.appendChild(lb);
      };
      const sync = () => {
        rep.steps.forEach((_, i) => { prog.steps[i] = stepLast[i] < pos; });
        prog.pos = pos; prog.cur = cards[pos].step != null ? cards[pos].step : (pos < stepBase ? 0 : rep.steps.length - 1); S.saveProg();
      };
      const paint = () => {
        { const c0 = cards[pos]; $('#dk-count', el).textContent = c0.step != null ? `Krok ${c0.step + 1} z ${nSteps}` : c0.label; }
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
      requestAnimationFrame(() => { goTo(pos, false); paint(); sync(); });
      window.addEventListener('resize', () => { goTo(pos, false); });
      window.addEventListener('hashchange', () => document.body.classList.remove('in-deck'), { once: true });
    }
  };
}

route(/^car\/([^/]+)\/r\/([^/]+)$/, repairScreen);
