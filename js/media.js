import { esc } from './ui.js';
import { icon } from './icons.js';

/* ---------- NAPRAWA ---------- */

/* ---------- media przy krokach: zdjęcia, wideo od właściwego momentu, linki ---------- */
export const fmtT = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
export function openGallery(photos, i) {
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
export function openClip({ id, t, e, cap }) {
  const lb = document.createElement('div'); lb.className = 'lightbox';
  const src = `https://www.youtube-nocookie.com/embed/${esc(id)}?start=${t}${e ? '&end=' + e : ''}&rel=0&playsinline=1&autoplay=1&modestbranding=1`;
  lb.innerHTML = `<div class="lb-in"><div class="mframe">${navigator.onLine ? `<iframe src="${src}" title="Film instruktażowy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>` : '<p style="padding:20px;color:#fff">Brak internetu. Ten film zagra tylko online (lub pobierz go w aplikacji YouTube).</p>'}</div><div class="lb-cap"><p>${esc(cap || '')}</p><div class="lb-act"><a class="btn small" href="https://www.youtube.com/watch?v=${esc(id)}&t=${t}s" target="_blank" rel="noopener">${icon('link', 16)} Otwórz w YouTube</a><button class="btn small primary" data-x>Zamknij</button></div></div></div>`;
  lb.addEventListener('click', ev => { if (ev.target === lb || ev.target.closest('[data-x]')) lb.remove(); });
  document.body.appendChild(lb);
}

