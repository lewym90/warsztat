import { route, render } from '../router.js';
import { $, $$, carName, carSub, esc } from '../ui.js';
import { icon } from '../icons.js';
import { matchPack } from '../data.js';
import { PHOTOS, carSVG } from '../art-car.js';
import { backupDue } from '../backup.js';
import { bindInstall, installBannerHtml } from '../install.js';
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
  const last = S.getLast();
  const lastCar = last && S.car(last.carId);
  const resume = lastCar ? `<a class="card resume" href="#/car/${last.carId}/r/${last.rid}"><span class="zi">${icon('wrench', 20)}</span><span class="zt"><small>Wznów ostatnią naprawę</small><b>${esc(last.title || last.rid)}</b><small>${esc(carName(lastCar))}${last.of ? ` · krok ${Math.min(last.step + 1, last.of)} z ${last.of}` : ''}</small></span>${icon('chevron', 20)}</a>` : '';
  const plan = S.getPlan(), planCar = S.car(plan.carId);
  const planCard = planCar && plan.ids.length ? `<a class="card resume" href="#/plan"><span class="zi">${icon('list', 20)}</span><span class="zt"><small>Dzisiaj robię</small><b>${plan.ids.length} ${plan.ids.length === 1 ? 'naprawa' : 'napraw'} w planie</b><small>${esc(carName(planCar))} · lista części i narzędzi</small></span>${icon('chevron', 20)}</a>` : '';
  const due = backupDue();
  const remind = due ? `<div class="note warn" data-bkrem>${icon('download', 22)}<div><b>Zrób kopię poza telefonem</b><p>Ostatnia kopia do pliku jest starsza niż tydzień. Jedno dotknięcie zapisze ją do Plików lub iCloud.</p><div class="row2"><button class="btn small primary" data-bkgo>Zapisz kopię</button><button class="btn small" data-bklater>Później</button></div></div></div>` : '';
  return {
    tab: '#/',
    html: `
      <div class="hero-title"><div class="eyebrow">Centrum napraw</div><h1>Warsztat</h1><p>Wybierz auto i klikaj po szkicu: od drzwi po klamkę dostaniesz instrukcję krok po kroku.</p></div>
      <div class="wrap">
        ${remind}${resume}${planCard}${installBannerHtml()}
        ${cars.length ? `<div class="garage-grid">${cards}</div>` : ''}
        <a class="empty-add" href="#/add">${icon('plus', 28)}<b style="color:var(--text)">Dodaj auto do garażu</b><span>Marka, model, rok, silnik. Opcjonalnie VIN (zapisany tylko w tym telefonie).</span></a>
      </div>`,
    bind(el) {
      bindInstall(el, render);
      const go = $('[data-bkgo]', el), later = $('[data-bklater]', el);
      if (go) go.onclick = async () => { const { saveBackupFile } = await import('../backup.js'); const r = await saveBackupFile(); if (r.how !== 'cancel') render(); };
      if (later) later.onclick = () => { S.setBackupMeta({ remindedAt: Date.now() }); render(); };
      $$('.gcard', el).forEach(c => {
        const go = () => { location.hash = `#/car/${c.dataset.id}`; };
        c.addEventListener('click', e => { if (e.target.closest('[data-fav]')) return; go(); });
        c.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      });
      $$('[data-fav]', el).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); S.toggleFav(b.dataset.fav); render(); }));
    }
  };
}

route(/^$/, garage);
