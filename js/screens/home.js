import { route, render } from '../router.js';
import { $, $$, carName, esc } from '../ui.js';
import { icon } from '../icons.js';
import { logoMark } from '../logo.js';
import { matchPack } from '../data.js';
import { PHOTOS, carSVG } from '../art-car.js';
import { SPINS } from '../spin.js';
import { backupDue } from '../backup.js';
import { bindInstall, installBannerHtml } from '../install.js';
import * as S from '../store.js';

/* ---------- START ---------- */
const heroArt = (pack) => {
  const sp = pack && SPINS[pack.id];
  if (sp) return `<img class="hs-car" src="${sp.dir}f${String(sp.start + 1).padStart(2, '0')}.${sp.ext}" alt="">`;
  return `<div class="hs-svg">${carSVG({ mini: true, photo: PHOTOS[pack && pack.id] || '' })}</div>`;
};
async function start() {
  const cars = S.cars(), car = S.currentCar();
  const brand = `<div class="hs-brand">${logoMark(66)}<b class="wordmark">WARSZTAT</b><small>NAPRAWY • PORADY • TWOJE AUTO</small></div>`;
  const remind = backupDue() ? `<div class="note warn" data-bkrem>${icon('download', 22)}<div><b>Zrób kopię poza telefonem</b><p>Ostatnia kopia do pliku jest starsza niż tydzień. Jedno dotknięcie zapisze ją do Plików lub iCloud.</p><div class="row2"><button class="btn small primary" data-bkgo>Zapisz kopię</button><button class="btn small" data-bklater>Później</button></div></div></div>` : '';
  if (!car) return { tab: '#/', html: `<section class="hs"><div class="hs-sky"></div>${brand}<p class="hs-tag">Mechanik, który prowadzi Cię za rękę, śruba po śrubie.</p><a class="btn primary block hs-cta" href="#/add">${icon('plus', 18)} Dodaj auto do garażu</a></section><div class="wrap">${installBannerHtml()}</div>`, bind(el) { bindInstall(el, render); } };
  const pack = await matchPack(car).catch(() => null);
  const last = S.getLast(), resume = last && last.carId === car.id ? last : null;
  const pct = resume && resume.of ? Math.round(Math.min(resume.step + 1, resume.of) / resume.of * 100) : 0;
  const plan = S.getPlan(), planN = plan.carId === car.id ? plan.ids.length : 0;
  const nBook = S.bookEntries(car.id).length;
  const id = car.id;
  const tiles = [
    [`#/car/${id}`, 'blue', 'turn', 'Auto 360°'],
    ['#/repairs', 'green', 'wrench', 'Naprawy'],
    ['#/plan', 'orange', 'plan', planN ? `Plan (${planN})` : 'Plan dnia'],
    ['#/repairs?tab=parts', 'purple', 'part', 'Części'],
    [`#/book/${id}`, 'lime', 'book', nBook ? `Książka (${nBook})` : 'Książka'],
    ['#/search', 'teal', 'search', 'Szukaj'],
    ...(pack ? [[`#/car/${id}/diag`, 'red', 'pulse', 'Diagnostyka'], [`#/car/${id}/sources`, 'indigo', 'link', 'Źródła']] : [])
  ];
  const sub = [car.engine && (car.engine.match(/\(([^)]+)\)/) || [])[1], car.year].filter(Boolean).join(' • ') || car.engine || '';
  return {
    tab: '#/',
    html: `
    <section class="hs">
      <div class="hs-sky"></div>
      ${brand}
      <div class="hs-stage">
        ${cars.length > 1 ? `<button class="hs-arrow l" data-swap="-1" aria-label="Poprzednie auto">${icon('back', 18)}</button><button class="hs-arrow r" data-swap="1" aria-label="Następne auto">${icon('chevron', 18)}</button>` : ''}
        ${heroArt(pack)}
      </div>
      <h1 class="hs-name"><a href="#/garage">${esc(carName(car))}${car.nick ? '' : car.gen ? ' ' + esc(car.gen) : ''}</a></h1>
      <p class="hs-sub">${esc(sub)}</p>
      <a class="btn primary block hs-cta" href="${resume ? `#/car/${id}/r/${resume.rid}` : '#/repairs'}">${resume ? 'Kontynuuj naprawę' : 'Zacznij naprawę'}</a>
    </section>
    <div class="wrap">
      ${resume ? `<a class="card hs-prog" href="#/car/${id}/r/${resume.rid}"><span><small>Aktualny postęp prac</small><b>${esc(resume.title || resume.rid)}</b></span><em>${resume.of ? `krok ${Math.min(resume.step + 1, resume.of)} z ${resume.of}` : ''}</em><i class="zprog"><u style="width:${pct}%"></u></i></a>` : ''}
      ${remind}${installBannerHtml()}
      <div class="qgrid">${tiles.map(([h, c, ic, l]) => `<a class="qt" href="${h}"><span class="qi ${c}">${icon(ic, 26)}</span><b>${esc(l)}</b></a>`).join('')}</div>
      <p class="hs-tag">Mechanik, który prowadzi Cię za rękę, śruba po śrubie.</p>
    </div>`,
    bind(el) {
      bindInstall(el, render);
      const go = $('[data-bkgo]', el), later = $('[data-bklater]', el);
      if (go) go.onclick = async () => { const { saveBackupFile } = await import('../backup.js'); const r = await saveBackupFile(); if (r.how !== 'cancel') render(); };
      if (later) later.onclick = () => { S.setBackupMeta({ remindedAt: Date.now() }); render(); };
      $$('[data-swap]', el).forEach(b => b.onclick = () => { const i = cars.findIndex(c => c.id === car.id); S.setCurrent(cars[(i + +b.dataset.swap + cars.length) % cars.length].id); render(); });
    }
  };
}
route(/^$/, start);
