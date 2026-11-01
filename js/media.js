import { $, esc } from './ui.js';
import { icon } from './icons.js';

/* ---------- NAPRAWA ---------- */

/* ---------- media przy krokach: zdjęcia, wideo od właściwego momentu, linki ---------- */
export const fmtT = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
export function mediaHtml(list) {
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

