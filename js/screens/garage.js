import { route, render } from '../router.js';
import { $$, carName, carSub, esc, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { matchPack } from '../data.js';
import { PHOTOS, carSVG } from '../art-car.js';
import * as S from '../store.js';

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
    tab: '#/auto',
    html: `${topbar({ back: '#/', title: 'Wybierz auto', sub: 'Twój garaż' })}
      <div class="wrap">
        ${cars.length ? `<div class="garage-grid">${cards}</div>` : ''}
        <a class="empty-add" href="#/add">${icon('plus', 28)}<b style="color:var(--text)">Dodaj auto do garażu</b><span>Marka, model, rok, silnik. Opcjonalnie VIN (zapisany tylko w tym telefonie).</span></a>
      </div>`,
    bind(el) {
      $$('.gcard', el).forEach(c => {
        const go = () => { S.setCurrent(c.dataset.id); location.hash = `#/car/${c.dataset.id}`; };
        c.addEventListener('click', e => { if (e.target.closest('[data-fav]')) return; go(); });
        c.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      });
      $$('[data-fav]', el).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); S.toggleFav(b.dataset.fav); render(); }));
    }
  };
}

route(/^garage$/, garage);
