import { route, render } from '../router.js';
import { $, $$, COMPLETE, CONF, carName, copy, dots, esc, fmtTime, toast } from '../ui.js';
import { fmtT, openClip, openGallery } from '../media.js';
import { bindOffline, offlineCardHtml } from '../offline-ui.js';
import { icon } from '../icons.js';
import { getPack, getRepair, matchPack } from '../data.js';
import { DOOR_PHOTOS, VIEW_LABELS, anchorOf, doorSVG, setDoorPhoto, viewOf } from '../art-door.js';
import { bindSettings, settingsHtml, wakeOff, wakeOn } from '../prefs.js';
import { openTimerSheet, suggestMinutes } from '../timer.js';
import { addPhoto, compressImage, deletePhoto, hasDB, listPhotos } from '../photos.js';
import { openEntrySheet } from '../book-ui.js';
import { safetyItems } from '../safety.js';
import * as S from '../store.js';

let deckSeq = 0; // numer ostatnio zamontowanej talii (stare nasłuchy nie mogą wyłączać zasobów nowej)
const isAssembly = phase => /monta|skład|założ|test/i.test(phase || '') && !/demonta|zdejm|wyjm/i.test(phase || '');

async function repairScreen(carId, rid, q) {
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

  const needLbl = { must: 'Wymagane', should: 'Polecane', opt: 'Opcjonalne' };
  const srcList = order.map((k, i) => { const s = pack.sources[k]; return s ? `<a class="srcitem" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="n">${i + 1}</span><span><b style="font-weight:600">${esc(s.title)}</b><small>${esc(s.kind)}</small></span>${icon('link', 18)}</a>` : ''; }).join('');
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
  const inPlan = () => (S.getPlan().ids || []).includes(rid);
  const hasAirbag = rep.steps.some(s => s.danger);
  const saf = safetyItems({ hasAirbag });
  const safeRow = (it, k) => `<button class="dk-check ${prog.safety[k] ? 'done' : ''}" data-safe="${k}" role="checkbox" aria-checked="${!!prog.safety[k]}"><span class="cbox">${icon('check', 16)}</span><span class="cname"><b>${esc(it.t)}</b><small>${esc(it.d)}</small></span><span></span></button>`;

  cards.push({ label: 'Podsumowanie', html: `
    <div class="dk-meta"><span class="dk-pill ${compl[0]}">${compl[1]}</span><span class="dk-pill">${doorTxt}</span></div>
    <h1 class="dk-h1">${esc(rep.title)}</h1>
    <p class="dk-sub">${esc(rep.subtitle)}</p>
    <div class="dk-stats"><div><b>${dots(rep.difficulty)}</b><small>Trudność</small></div><div><b>${fmtTime(rep.time)}</b><small>Czas</small></div><div><b>${nSteps}</b><small>Kroków</small></div></div>
    <p class="dk-lead">${esc(rep.summary)}</p>
    <button class="btn block ${inPlan() ? 'on' : ''}" id="plan-add" aria-pressed="${inPlan()}">${icon('list', 18)} <span>${inPlan() ? 'W planie „Dzisiaj robię” (usuń)' : 'Dodaj do planu „Dzisiaj robię”'}</span></button>
    <p class="dk-hint">Przesuń palcem w prawo, aby przejść dalej →</p>` });

  if ((rep.warnings || []).length || (rep.extras || []).length) cards.push({ label: 'Ostrzeżenia', html: `
    <div class="dk-meta"><span class="dk-pill danger">Przeczytaj przed startem</span></div>
    <h2 class="dk-h2">Ostrzeżenia</h2>
    ${(rep.warnings || []).map(w => noteHtml(w)).join('')}${(rep.extras || []).map(w => noteHtml(w, 'info')).join('')}` });

  cards.push({ label: 'Bezpieczeństwo', html: `
    <div class="dk-meta"><span class="dk-pill danger">Bezpieczeństwo</span><span class="dk-pill" id="safecount"></span></div>
    <h2 class="dk-h2">Zanim zaczniesz</h2>
    <p class="dk-lead">Odhacz każdy punkt. To minuta, która oszczędza wizyty na pogotowiu.</p>
    <div class="dk-checks" id="safe">${saf.always.map((it, k) => safeRow(it, k)).join('')}</div>
    <h3 class="dk-h3">Jeśli podnosisz auto lub pracujesz pod nim</h3>
    <div class="dk-checks" id="safe2">${saf.lift.map((it, k) => safeRow(it, 'l' + k)).join('')}</div>` });

  cards.push({ label: 'Narzędzia', html: `
    <div class="dk-meta"><span class="dk-pill">Przygotowanie</span><span class="dk-pill" id="toolcount"></span></div>
    <h2 class="dk-h2">Narzędzia do odhaczenia</h2>
    <div class="dk-checks" id="tools">${rep.tools.map((t, i) => `<button class="dk-check ${prog.tools[i] ? 'done' : ''}" data-tool="${i}" role="checkbox" aria-checked="${!!prog.tools[i]}"><span class="cbox">${icon('check', 16)}</span><span class="cname"><b>${esc(t.name)}</b>${t.note ? `<small>${esc(t.note)}</small>` : ''}</span><span class="need ${t.need}">${needLbl[t.need] || ''}</span></button>`).join('')}</div>` });

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
  const mineHtml = (s, i) => {
    const asm = isAssembly(s.phase);
    const hint = hasDB()
      ? (asm ? 'Zajrzyj do zdjęć z demontażu poniżej: tak to wyglądało przed rozebraniem.' : 'Zrób zdjęcie, zanim cokolwiek odepniesz. Przyda się przy składaniu.')
      : 'Zdjęcia są niedostępne w tej przeglądarce (tryb prywatny). Notatki działają.';
    return `<div class="dk-mine" data-mine="${i}">
      <div class="dk-mine-h"><b>Moje zdjęcia i notatki</b></div>
      <p class="dk-mine-hint">${hint}</p>
      ${asm ? `<div class="dk-strip" data-strip="${i}" hidden></div>` : ''}
      <div class="dk-thumbs" data-thumbs="${i}"></div>
      ${hasDB() ? `<div class="row2"><label class="btn small" tabindex="0">${icon('eye', 16)} Zrób zdjęcie<input type="file" accept="image/*" capture="environment" hidden data-addphoto="${i}"></label><label class="btn small" tabindex="0">${icon('upload', 16)} Z galerii<input type="file" accept="image/*" multiple hidden data-addphoto="${i}"></label></div>` : ''}
      <textarea class="input" rows="3" data-note="${i}" placeholder="Notatka do tego kroku (np. gdzie była śruba, co się zepsuło)" aria-label="Notatka do kroku ${i + 1}">${esc(S.noteOf(carId, rid, i))}</textarea>
    </div>`;
  };
  rep.steps.forEach((s, i) => {
    const c = CONF[s.conf] || CONF.low;
    const photos = (s.media || []).filter(m => m.type === 'photo');
    const clips = (s.media || []).filter(m => m.type === 'video');
    const links = (s.media || []).filter(m => m.type === 'link');
    const ph = photos.length ? `<button class="dk-photo" data-gal="${i}" aria-label="Powiększ zdjęcie"><img decoding="async" referrerpolicy="no-referrer" src="${esc(photos[0].url)}" alt="${esc(photos[0].cap)}"><span class="dk-zoom">${icon('eye', 14)} ${photos.length > 1 ? `1 z ${photos.length} · ` : ''}dotknij, aby powiększyć</span></button><p class="dk-cap">${esc(photos[0].cap)} <em>${esc(photos[0].credit)}</em></p>` : '';
    const mins = suggestMinutes([s.b, ...(s.how || []), s.check, s.tip, typeof s.danger === 'string' ? s.danger : '']);
    const extra = [mins ? `<button class="dk-chip timer" data-timer="${mins}" data-label="${esc(s.t)}">${icon('clock', 14)} Minutnik ${mins} min</button>` : '',
      ...clips.map(m => `<button class="dk-chip" data-clip='${esc(JSON.stringify({ id: m.id, t: m.t, e: m.e, cap: m.cap }))}'>${icon('chevron', 14)} Film od ${fmtT(m.t)}${m.e ? ' do ' + fmtT(m.e) : ''}</button>`),
      ...links.map(m => `<a class="dk-chip" href="${esc(m.url)}" target="_blank" rel="noopener">${icon('link', 14)} ${esc(m.label || 'Link')}</a>`)].join('');
    const metaA = `<div class="dk-meta"><span class="dk-pill acc">${esc(s.phase || 'Krok')}</span><span class="dk-pill">${icon('clock', 13)} ~${s.min} min</span><span class="dk-pill conf-${c[0]}">${s.conf === 'high' ? 'Pewne' : s.conf === 'med' ? 'Jedno źródło' : 'Do sprawdzenia'}</span></div>`;
    const dangerH = s.danger ? `<div class="dk-note danger"><b>Poduszka powietrzna</b><span>${typeof s.danger === 'string' ? esc(s.danger) : 'Nie odłączaj wtyczki bez odłączenia akumulatora i odczekania co najmniej 30 minut.'}</span></div>` : '';
    const warnH = s.warn ? `<div class="dk-note warn"><b>Uwaga</b><span>${typeof s.warn === 'string' ? esc(s.warn) : 'Zabezpiecz lakier taśmą malarską.'}</span></div>` : '';
    const lis = (s.how || []).length ? `<ol class="dk-how">${s.how.map(h => `<li>${esc(h)}</li>`).join('')}</ol>` : '';
    const ctx = `<p class="dk-lead">${esc(s.b)}</p>${s.see ? `<div class="dk-see"><b>Co zobaczysz</b><span>${esc(s.see)}</span></div>` : ''}${s.tools ? `<div class="dk-tl">${s.tools.map(t => `<span class="dk-pill">${icon('wrench', 12)} ${esc(t)}</span>`).join('')}</div>` : ''}`;
    const risk = `${s.mistakes ? `<div class="dk-note mist"><b>Typowe błędy</b><ul>${s.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}${s.check ? `<div class="dk-note check"><b>Sprawdź, zanim przesuniesz dalej</b><span>${esc(s.check)}</span></div>` : ''}${s.tip ? `<div class="dk-note tip"><b>Wskazówka</b><span>${esc(s.tip)}</span></div>` : ''}`;
    const bTail = `${s.link ? `<a class="btn small" href="#/car/${carId}/r/${s.link}">${icon('book', 16)} Otwórz kartę: ${esc(relTitle(s.link))}</a>` : ''}<div class="dk-srcs">${srcChips(s.src)}</div>`;
    cards.push({ step: i, first: true, last: true, label: s.t, html: `
      ${metaA}
      <h2 class="dk-h2">${esc(s.t)}</h2>
      ${dangerH}${warnH}${ph}${extra ? `<div class="dk-extra">${extra}</div>` : ''}
      ${lis}${ctx}${risk}${mineHtml(s, i)}${bTail}` });
  });

  cards.push({ label: 'Po montażu', html: `
    <div class="dk-meta"><span class="dk-pill">Koniec</span></div>
    <h2 class="dk-h2">Po montażu: sprawdź</h2>
    <div class="dk-checks" id="after">${(rep.after || []).map((t, i) => `<button class="dk-check ${prog.after[i] ? 'done' : ''}" data-after="${i}" role="checkbox" aria-checked="${!!prog.after[i]}"><span class="cbox">${icon('check', 16)}</span><span class="cname"><b>${esc(t)}</b></span></button>`).join('')}</div>
    ${(rep.unknown || []).length ? `<div class="dk-note mist"><b>Czego nie wiemy (brak w źródłach)</b><ul>${rep.unknown.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>` : ''}
    <div class="dk-note info" id="bk-box"><b>Zapisz w książce serwisowej</b><span>Data, przebieg, koszt i kupione części: wpis zajmie pół minuty i zostanie przy aucie.</span><button class="btn primary small" id="bk-add">${icon('book', 16)} Dodaj wpis do książki</button></div>
    ${related ? `<div class="chips">${related}</div>` : ''}` });

  cards.push({ label: 'Źródła', html: `
    <div class="dk-meta"><span class="dk-pill">Źródła (${order.length})</span></div>
    <h2 class="dk-h2">Skąd to wiemy</h2>
    <div class="srclist">${srcList}</div>
    <p class="dk-foot">Opracowanie własnymi słowami na podstawie publicznych źródeł. Przy poduszkach powietrznych, hamulcach i zawieszeniu zachowaj szczególną ostrożność.</p>` });

  const total = cards.length;
  const stepLast = []; cards.forEach((c, k) => { if (c.step != null && c.last) stepLast[c.step] = k; });
  const stepCard = n => cards.findIndex(c => c.step === n);
  const wantStep = q && q.get && q.get('step') != null ? +q.get('step') : null;
  let pos = Math.max(0, Math.min(prog.pos ?? 0, total - 1));
  if (wantStep != null && stepCard(wantStep) >= 0) pos = stepCard(wantStep);
  const sheetItems = cards.map((c, k) => `<button class="dk-si" data-go="${k}"><span class="n">${c.step != null ? c.step + 1 : '•'}</span><span>${esc(c.label)}</span></button>`).join('');

  return {
    tab: null,
    html: `
      <div class="dk" id="dk">
        <header class="dk-top">
          <a class="dk-ib" href="#/car/${carId}/zone/doors?door=${rep.door === 'rear' ? 'rear' : 'front'}" aria-label="Wróć do listy">${icon('back', 22)}</a>
          <div class="dk-t"><b>${esc(rep.title)}</b><small id="dk-where">${esc(pack.title)}${car.engine ? ' · ' + esc(car.engine) : ''}</small></div>
          <button class="dk-ib" id="dk-timer" aria-label="Minutnik">${icon('clock', 22)}</button>
          <button class="dk-ib dk-aa" id="dk-aa" aria-label="Wygląd i wielkość liter">Aa</button>
          <button class="dk-ib" id="dk-menu" aria-label="Spis kart">${icon('list', 22)}</button>
        </header>
        <button class="dk-loc" id="dk-loc" hidden aria-label="Gdzie to jest: powiększ rysunek drzwi">${(setDoorPhoto(((DOOR_PHOTOS[pack.id] || {}).left || {})[rep.door === 'rear' ? 'rear' : 'front']), doorSVG({ view: rep.steps[0].view, rings: 4 }))}<span class="dk-loc-l">Gdzie?</span></button>
        <div class="dk-track" id="dk-track" role="region" aria-roledescription="karuzela" aria-label="Karty naprawy">${cards.map((c, k) => `<section class="dk-card${c.step != null ? ' is-step' : ''}" data-k="${k}" role="group" aria-roledescription="karta" aria-label="Karta ${k + 1} z ${total}: ${esc(c.label)}"><div class="dk-in">${c.html}</div></section>`).join('')}</div>
        <div class="sr-only" id="dk-live" aria-live="polite"></div>
        <footer class="dk-bar">
          <button class="dk-mid" id="dk-mid" aria-label="Otwórz spis kart"><span id="dk-count"></span><i class="dk-prog"><u id="dk-fill"></u></i></button>
          <div class="dk-btns">
            <button class="dk-nav" id="dk-prev" aria-label="Poprzednia karta">${icon('back', 24)}</button>
            <button class="dk-nav go" id="dk-next"><span id="dk-nextl">Dalej</span></button>
          </div>
        </footer>
        <div class="dk-sheet" id="dk-sheet" hidden role="dialog" aria-modal="true" aria-label="Spis kart"><div class="dk-sheet-in">
          <div class="dk-sh-h"><b>Spis kart</b><button class="dk-ib" id="dk-close" aria-label="Zamknij">${icon('x', 22)}</button></div>
          <div class="dk-sl">${sheetItems}</div>
          ${offlineCardHtml(rep.title)}
          <button class="btn ghost block" id="reset">Zacznij tę kartę od nowa</button>
        </div></div>
        <div class="dk-sheet" id="dk-set" hidden role="dialog" aria-modal="true" aria-label="Wygląd i ekran"><div class="dk-sheet-in">
          <div class="dk-sh-h"><b>Wygląd i ekran</b><button class="dk-ib" id="dk-setx" aria-label="Zamknij">${icon('x', 22)}</button></div>
          ${settingsHtml()}
        </div></div>
      </div>`,
    bind(el) {
      document.body.classList.add('in-deck'); (el.closest('.screen') || el).classList.add('has-dk');
      const mySeq = ++deckSeq; wakeOn();
      const track = $('#dk-track', el), cardEls = $$('.dk-card', el);
      const svg = $('.door-art', el), rings = $$('.ring', svg);
      rings.forEach(r => { r.style.transition = 'none'; });
      const loc = $('#dk-loc', el);
      loc.onclick = () => {
        const lb = document.createElement('div'); lb.className = 'lightbox';
        const v = svg.dataset.view;
        lb.innerHTML = `<div class="lb-in"><div class="dk-bigloc">${svg.outerHTML}</div><div class="lb-cap"><p><b>Gdzie to jest:</b> ${esc(VIEW_LABELS[v] || '')}. Niebieska celownica wskazuje miejsce na drzwiach.</p><div class="lb-act"><button class="btn small primary" data-x>Zamknij</button></div></div></div>`;
        lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('[data-x]')) lb.remove(); });
        document.body.appendChild(lb);
      };
      const sync = () => {
        if (!track.isConnected) return;
        rep.steps.forEach((_, i) => { prog.steps[i] = stepLast[i] < pos; });
        prog.pos = pos; prog.cur = cards[pos].step != null ? cards[pos].step : (pos < stepBase ? 0 : rep.steps.length - 1);
        if (!prog.started) prog.started = Date.now();
        S.saveProg(prog);
        S.setLast(carId, rid, { title: rep.title, step: prog.cur, of: nSteps, pos });
      };
      const paint = () => {
        if (!track.isConnected) return;
        const c0 = cards[pos];
        const label = c0.step != null ? `Krok ${c0.step + 1} z ${nSteps}` : c0.label;
        $('#dk-count', el).textContent = label;
        $('#dk-where', el).textContent = c0.step != null ? label : `${pack.title}${car.engine ? ' · ' + car.engine : ''}`;
        $('#dk-nextl', el).textContent = pos === total - 1 ? 'Koniec karty' : c0.step != null ? 'Zalicz krok' : 'Dalej';
        $('#dk-live', el).textContent = `${label}. ${c0.label}`;
        $('#dk-fill', el).style.width = ((pos + 1) / total * 100) + '%';
        $('#dk-prev', el).disabled = pos === 0; $('#dk-next', el).disabled = pos === total - 1;
        if (c0.step != null) {
          const s = rep.steps[c0.step];
          svg.dataset.view = s.view;
          const pts = (s.focus || []).filter(a => viewOf(a) === s.view).map(a => anchorOf(a)).filter(Boolean);
          rings.forEach((r, k) => { const p = pts[k]; if (p) { r.style.transform = `translate(${p[0]}px, ${p[1]}px)`; r.style.opacity = 1; } else r.style.opacity = 0; });
          requestAnimationFrame(() => rings.forEach(r => { r.style.transition = ''; }));
          loc.hidden = false;
        } else loc.hidden = true;
        const tc = $('#toolcount', el); if (tc) tc.textContent = `${Object.values(prog.tools).filter(Boolean).length} / ${rep.tools.length} gotowe`;
        const sc = $('#safecount', el); if (sc) sc.textContent = `${Object.values(prog.safety).filter(Boolean).length} / ${saf.always.length + saf.lift.length} odhaczone`;
      };
      const goTo = (k, smooth = true) => { k = Math.max(0, Math.min(total - 1, k)); track.scrollTo({ left: k * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' }); };
      let st;
      track.addEventListener('scroll', () => {
        clearTimeout(st);
        st = setTimeout(() => {
          const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
          if (k !== pos) { pos = Math.max(0, Math.min(total - 1, k)); sync(); paint(); cardEls[pos].scrollTop = 0; refreshStrips(); }
        }, 70);
      }, { passive: true });
      $('#dk-prev', el).onclick = () => goTo(pos - 1);
      $('#dk-next', el).onclick = () => goTo(pos + 1);
      const sheet = $('#dk-sheet', el), setSheet = $('#dk-set', el);
      const openS = () => { sheet.hidden = false; $('#dk-close', el).focus(); }, closeS = () => { sheet.hidden = true; };
      const onKey = e => {
        if (!document.getElementById('dk')) { document.removeEventListener('keydown', onKey); return; }
        if (e.key === 'Escape') { closeS(); setSheet.hidden = true; return; }
        if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
        if (e.key === 'ArrowRight') goTo(pos + 1);
        if (e.key === 'ArrowLeft') goTo(pos - 1);
      };
      document.addEventListener('keydown', onKey);
      $('#dk-menu', el).onclick = openS; $('#dk-mid', el).onclick = openS; $('#dk-close', el).onclick = closeS;
      sheet.addEventListener('click', e => { if (e.target === sheet) closeS(); });
      $('#dk-aa', el).onclick = () => { setSheet.hidden = false; $('#dk-setx', el).focus(); };
      $('#dk-setx', el).onclick = () => { setSheet.hidden = true; };
      setSheet.addEventListener('click', e => { if (e.target === setSheet) setSheet.hidden = true; });
      bindSettings(setSheet);
      $$('[data-go]', el).forEach(b => b.onclick = () => { closeS(); goTo(+b.dataset.go, false); pos = +b.dataset.go; sync(); paint(); refreshStrips(); });
      $('#dk-timer', el).onclick = () => openTimerSheet(null, rep.title);
      bindOffline(el, pack.id, [rid, ...(rep.related || [])]);
      const toggler = (sel, key, store) => $$(sel, el).forEach(b => b.onclick = () => { const i = b.dataset[key]; store[i] = !store[i]; S.saveProg(prog); b.classList.toggle('done', !!store[i]); b.setAttribute('aria-checked', !!store[i]); paint(); });
      toggler('[data-tool]', 'tool', prog.tools); toggler('[data-after]', 'after', prog.after); toggler('[data-safe]', 'safe', prog.safety);
      $$('[data-copy]', el).forEach(b => b.onclick = () => copy(b.dataset.copy, 'Numer skopiowany'));
      const shop = $('#shop', el); if (shop) shop.onclick = () => copy(shopping(), 'Lista skopiowana');
      $('#reset', el).onclick = () => { if (confirm('Wyczyścić postęp tej karty?')) { S.resetProg(carId, rid); render(); } };
      // plan „Dzisiaj robię”
      const pa = $('#plan-add', el);
      pa.onclick = () => { S.togglePlan(rid, carId); const on = inPlan(); pa.classList.toggle('on', on); pa.setAttribute('aria-pressed', on); $('span', pa).textContent = on ? 'W planie „Dzisiaj robię” (usuń)' : 'Dodaj do planu „Dzisiaj robię”'; toast(on ? 'Dodano do planu' : 'Usunięto z planu'); };
      // książka serwisowa
      $('#bk-add', el).onclick = () => openEntrySheet(carId, { title: rep.title, rid, parts: (rep.parts || []).map(p => p.name + (p.oe ? ' (' + p.oe + ')' : '')) }, () => { $('#bk-box', el).classList.add('ok'); $('#bk-add', el).lastChild.textContent = ' Dodaj kolejny wpis'; });

      /* ----- moje zdjęcia ----- */
      let mine = []; const urls = new Map();
      const urlOf = x => { if (!urls.has(x.id)) urls.set(x.id, URL.createObjectURL(x.blob)); return urls.get(x.id); };
      const disassembly = x => !isAssembly((rep.steps[x.step] || {}).phase);
      const thumb = x => `<span class="dk-th"><button data-mph="${x.id}" data-mphstep="${x.step}" aria-label="Powiększ zdjęcie z kroku ${x.step + 1}"><img src="${urlOf(x)}" alt="Moje zdjęcie, krok ${x.step + 1}"></button><button class="dk-thx" data-delph="${x.id}" aria-label="Usuń zdjęcie">${icon('x', 14)}</button></span>`;
      function refreshStrips() {
        $$('[data-strip]', el).forEach(box => {
          const i = +box.dataset.strip;
          const list = mine.filter(x => x.step < i && disassembly(x));
          box.hidden = !list.length;
          box.innerHTML = list.length ? `<small>Zdjęcia z demontażu (${list.length}):</small><div>${list.map(x => `<button data-sph="${x.id}" aria-label="Powiększ zdjęcie z kroku ${x.step + 1}"><img src="${urlOf(x)}" alt="Zdjęcie z kroku ${x.step + 1}"><i>${x.step + 1}</i></button>`).join('')}</div>` : '';
        });
      }
      function paintMine() {
        $$('[data-thumbs]', el).forEach(box => { box.innerHTML = mine.filter(x => x.step === +box.dataset.thumbs).map(thumb).join(''); });
        refreshStrips();
      }
      async function loadMine() { if (!hasDB()) return; try { mine = await listPhotos(carId, rid); } catch (_) { mine = []; } paintMine(); }
      $$('[data-addphoto]', el).forEach(inp => inp.addEventListener('change', async () => {
        const step = +inp.dataset.addphoto; const files = [...inp.files]; inp.value = '';
        let ok = 0;
        for (const f of files) { try { await addPhoto({ carId, rid, step, blob: await compressImage(f) }); ok++; } catch (err) { toast('Nie udało się zapisać zdjęcia'); } }
        if (ok) { toast(ok > 1 ? 'Zdjęcia zapisane' : 'Zdjęcie zapisane'); loadMine(); }
      }));
      el.addEventListener('click', e => {
        const t = e.target.closest('[data-timer]');
        if (t) { openTimerSheet(+t.dataset.timer, t.dataset.label); return; }
        const g = e.target.closest('[data-gal]');
        if (g) { const s = rep.steps[+g.dataset.gal]; openGallery((s.media || []).filter(m => m.type === 'photo'), 0); return; }
        const cl = e.target.closest('[data-clip]');
        if (cl) { openClip(JSON.parse(cl.dataset.clip)); return; }
        const mp = e.target.closest('[data-mph]');
        if (mp) { const list = mine.filter(x => x.step === +mp.dataset.mphstep); openGallery(list.map(x => ({ url: urlOf(x), cap: `Moje zdjęcie, krok ${x.step + 1}`, credit: 'własne' })), Math.max(0, list.findIndex(x => x.id === mp.dataset.mph))); return; }
        const sp = e.target.closest('[data-sph]');
        if (sp) { const list = mine.filter(disassembly); openGallery(list.map(x => ({ url: urlOf(x), cap: `Zdjęcie z kroku ${x.step + 1}: ${rep.steps[x.step].t}`, credit: 'własne' })), Math.max(0, list.findIndex(x => x.id === sp.dataset.sph))); return; }
        const dp = e.target.closest('[data-delph]');
        if (dp && confirm('Usunąć to zdjęcie?')) deletePhoto(dp.dataset.delph).then(loadMine);
      });
      el.addEventListener('keydown', e => { const l = e.target.closest && e.target.closest('label.btn'); if (l && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); l.querySelector('input').click(); } });
      el.addEventListener('error', e => {
        const img = e.target;
        if (img && img.tagName === 'IMG' && img.closest('.dk-photo')) { const b = img.closest('.dk-photo'); img.remove(); b.classList.add('broken'); b.insertAdjacentHTML('afterbegin', `<span class="mbroken"><b>Zdjęcie niedostępne (offline lub źródło blokuje)</b><small>Dotknij, aby spróbować powiększyć</small></span>`); }
      }, true);
      loadMine();
      /* ----- notatki (zapis z opóźnieniem) ----- */
      const timers = {};
      $$('[data-note]', el).forEach(t => {
        const i = +t.dataset.note;
        const save = () => { clearTimeout(timers[i]); S.setNote(carId, rid, i, t.value); };
        t.addEventListener('input', () => { clearTimeout(timers[i]); timers[i] = setTimeout(save, 500); });
        t.addEventListener('blur', save);
        t.addEventListener('focus', () => setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300));
      });

      requestAnimationFrame(() => { goTo(pos, false); paint(); sync(); });
      const onResize = () => { if (!document.getElementById('dk')) { window.removeEventListener('resize', onResize); return; } goTo(pos, false); };
      window.addEventListener('resize', onResize);
      window.addEventListener('hashchange', () => {
        $$('[data-note]', el).forEach(t => { if (t.value !== S.noteOf(carId, rid, +t.dataset.note)) S.setNote(carId, rid, +t.dataset.note, t.value); });
        if (mySeq === deckSeq) wakeOff();
        urls.forEach(u => URL.revokeObjectURL(u));
      }, { once: true });
    }
  };
}

route(/^car\/([^/]+)\/r\/([^/]+)$/, repairScreen);
