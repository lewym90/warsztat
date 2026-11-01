// Widok 360°: klatki obrotu auta + kropki przypięte do elementów (interpolowane między klatkami kluczowymi).
const N = 81;
const K = (o) => Object.entries(o).map(([k, v]) => [+k, v[0], v[1]]);
export const SPINS = {
  'bmw-e53': {
    dir: 'img/spin/', n: N, ext: 'webp', ratio: 1000 / 563, start: 12,
    dots: [
      { id: 'dL', zone: 'doors', side: 'left', k: K({ 0: [.73, .39], 4: [.72, .40], 8: [.69, .40], 12: [.65, .40], 16: [.59, .41], 20: [.52, .41], 24: [.43, .41], 28: [.36, .41], 32: [.31, .41] }) },
      { id: 'dR', zone: 'doors', side: 'right', k: K({ 44: [.69, .385], 48: [.64, .40], 52: [.59, .40], 56: [.515, .40], 60: [.445, .40], 64: [.385, .40], 68: [.345, .40], 72: [.32, .395] }) },
      { id: 'hood', zone: 'hood', k: K({ 52: [.85, .38], 56: [.85, .40], 60: [.78, .36], 64: [.70, .37], 68: [.72, .37], 72: [.60, .365], 76: [.51, .365], 80: [.50, .36], 81: [.38, .40], 85: [.38, .40], 89: [.30, .37], 93: [.25, .38], 97: [.20, .35] }) },
      { id: 'int', zone: 'interior', k: K({ 52: [.66, .27], 56: [.62, .26], 60: [.62, .26], 64: [.60, .26], 68: [.60, .25], 72: [.52, .27], 76: [.50, .26], 80: [.50, .27], 81: [.44, .27], 85: [.39, .28], 89: [.40, .25], 93: [.42, .24], 97: [.37, .26], 101: [.43, .27], 105: [.40, .26], 109: [.34, .27] }) },
      { id: 'whL', zone: 'wheels', k: K({ 0: [.52, .67], 4: [.48, .68], 8: [.41, .72], 12: [.32, .73], 16: [.23, .70], 20: [.13, .735], 24: [.12, .68] }) },
      { id: 'whR', zone: 'wheels', k: K({ 52: [.86, .66], 56: [.86, .68], 60: [.77, .72], 64: [.665, .71], 68: [.555, .71], 72: [.44, .68] }) },
      { id: 'uL', zone: 'under', side: 'left', k: K({ 0: [.62, .66], 4: [.60, .66], 8: [.58, .675], 12: [.52, .675], 16: [.45, .675], 20: [.40, .68], 24: [.32, .67], 28: [.27, .665], 32: [.20, .65] }) },
      { id: 'uR', zone: 'under', side: 'right', k: K({ 48: [.40, .66], 52: [.50, .665], 56: [.55, .675], 60: [.50, .675], 64: [.45, .675], 68: [.40, .66], 72: [.33, .65] }) },
      { id: 'tail', zone: 'tail', k: K({ 24: [.88, .44], 28: [.84, .42], 32: [.74, .43], 36: [.62, .44], 40: [.46, .44], 44: [.31, .44], 48: [.19, .44], 52: [.10, .43] }) }
    ]
  }
};

// pozycja kropki w klatce f (float, 0..N); null gdy niewidoczna. Zwraca {x,y,a} (a = przezroczystość 0..1)
function place(dot, f) {
  for (const off of [0, N]) {
    const g = f + off, k = dot.k;
    if (g < k[0][0] || g > k[k.length - 1][0]) continue;
    let i = 0; while (i < k.length - 2 && g > k[i + 1][0]) i++;
    const [f0, x0, y0] = k[i], [f1, x1, y1] = k[i + 1], t = f1 === f0 ? 0 : (g - f0) / (f1 - f0);
    const edge = Math.min(g - k[0][0], k[k.length - 1][0] - g);
    return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, a: Math.max(0, Math.min(1, edge / 2.5)) };
  }
  return null;
}

export function spinHtml(spin, labels) {
  return `<div class="spin" data-n="${spin.n}" tabindex="0" role="application" aria-label="Model 3D: przeciągnij, aby obracać auto">
    <div class="spin-stage" style="aspect-ratio:${spin.ratio}">
      <div class="spin-loading"><i></i></div>
      <img class="spin-img" alt="" draggable="false" src="${spin.dir}f${String(spin.start + 1).padStart(2, '0')}.${spin.ext}">
      ${spin.dots.map(d => `<button class="spin-dot" data-dot="${d.id}" data-zone="${d.zone}" data-side="${d.side || ''}" aria-label="${labels[d.zone] || d.zone}"><i class="r"></i><i class="c"></i></button>`).join('')}
    </div>
    <div class="spin-hint"><span class="h1">&#8596; Przeciągnij, aby obrócić</span><span class="h2" hidden></span></div>
  </div>`;
}

export function mountSpin(root, spin, { onZone, labels }) {
  const stage = root.querySelector('.spin-stage'), img = root.querySelector('.spin-img');
  const hint = root.querySelector('.spin-hint .h2'), hint1 = root.querySelector('.spin-hint .h1');
  const load = root.querySelector('.spin-loading i');
  const dots = spin.dots.map(d => ({ d, el: root.querySelector(`[data-dot="${d.id}"]`) }));
  const frames = new Array(spin.n);
  const url = i => `${spin.dir}f${String(i + 1).padStart(2, '0')}.${spin.ext}`;
  let f = spin.start, shown = -1, vel = 0, drag = null, auto = true, raf = 0, loaded = 0, dead = false;

  // ładowanie: najpierw co 4. klatka, potem reszta
  const order = [...Array(spin.n).keys()].sort((a, b) => (a % 4 ? 1 : 0) - (b % 4 ? 1 : 0) || a - b);
  let qi = 0;
  const pump = () => {
    if (dead || qi >= order.length) return;
    const i = order[qi++], im = new Image();
    im.decoding = 'async';
    im.onload = im.onerror = () => { loaded++; load.style.width = (loaded / spin.n * 100) + '%'; if (loaded >= spin.n) load.parentNode.classList.add('done'); pump(); };
    im.src = url(i); frames[i] = im;
  };
  for (let k = 0; k < 4; k++) pump();

  const draw = () => {
    const idx = ((Math.round(f) % spin.n) + spin.n) % spin.n;
    if (idx !== shown) {
      const im = frames[idx];
      if (im && im.complete && im.naturalWidth) { img.src = im.src; shown = idx; }
    }
    const fm = ((f % spin.n) + spin.n) % spin.n;
    for (const { d, el } of dots) {
      const p = place(d, fm);
      if (!p || p.a <= 0.02) { el.style.opacity = 0; el.style.pointerEvents = 'none'; el.tabIndex = -1; continue; }
      el.style.left = (p.x * 100) + '%'; el.style.top = (p.y * 100) + '%';
      el.style.opacity = p.a; el.style.pointerEvents = p.a > .5 ? 'auto' : 'none'; el.tabIndex = 0;
    }
  };
  const tick = now => {
    if (dead || !root.isConnected) { dead = true; return; }
    if (!drag) {
      if (Math.abs(vel) > 0.01) { f += vel; vel *= 0.93; }
      else if (auto && loaded > 20) { f += 0.06; }
    }
    draw(); raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const stop = () => { auto = false; hint1.hidden = true; };
  stage.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    drag = { x: e.clientX, f0: f, moved: false, id: e.pointerId, last: e.clientX, lt: performance.now() };
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; stage.setPointerCapture(e.pointerId); stop(); stage.classList.add('grab'); }
    if (drag.moved) {
      const per = stage.clientWidth / (spin.n * 0.62);
      const nf = drag.f0 - dx / per;
      const now = performance.now();
      vel = (nf - f) / Math.max(1, (now - drag.lt) / 16) ; drag.lt = now;
      f = nf;
    }
  });
  const end = () => { if (!drag) return; if (!drag.moved) vel = 0; drag = null; stage.classList.remove('grab'); };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { stop(); vel = -0.8; } else if (e.key === 'ArrowRight') { stop(); vel = 0.8; }
  });
  stage.addEventListener('click', e => {
    const b = e.target.closest('.spin-dot');
    if (!b || (drag && drag.moved)) return;
    stop(); vel = 0;
    stage.querySelectorAll('.spin-dot').forEach(x => x.classList.toggle('on', x === b));
    hint.hidden = false; hint.textContent = labels[b.dataset.zone] || '';
    onZone(b.dataset.zone, b);
  });
  stage.addEventListener('dragstart', e => e.preventDefault());
  return { destroy() { dead = true; cancelAnimationFrame(raf); }, clear() { stage.querySelectorAll('.spin-dot.on').forEach(x => x.classList.remove('on')); hint.hidden = true; } };
}
