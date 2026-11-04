import { route } from '../router.js';
import { $, $$, carName, esc, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { getPack, matchPack } from '../data.js';
import * as S from '../store.js';

/* ---------- ŹRÓDŁA (zbiorczo, dla auta) ---------- */
const KIND = { 'instrukcja fabryczna': 'Instrukcje fabryczne BMW (TIS)', forum: 'Fora i wątki użytkowników', 'artykuł': 'Artykuły i poradniki', wideo: 'Filmy', 'sklep / wideo': 'Filmy', 'producent części': 'Producenci i katalogi części', sklep: 'Sklepy i katalogi części', ogłoszenia: 'Ogłoszenia (ceny, numery części)' };
const ORDER = ['Instrukcje fabryczne BMW (TIS)', 'Artykuły i poradniki', 'Fora i wątki użytkowników', 'Filmy', 'Producenci i katalogi części', 'Sklepy i katalogi części', 'Ogłoszenia (ceny, numery części)'];
const host = u => String(u).replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
export function groupSources(pack) {
  const use = pack.sourceUse || {}, titles = Object.fromEntries(pack.repairs.map(r => [r.id, r.title]));
  const g = {};
  Object.entries(pack.sources).filter(([k]) => use[k]).forEach(([k, s]) => {
    const label = KIND[s.kind] || 'Inne';
    (g[label] = g[label] || []).push({ key: k, ...s, repairs: (use[k] || []).map(id => ({ id, t: titles[id] || id })) });
  });
  return Object.keys(g).sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99)).map(label => ({ label, items: g[label] }));
}
export function sourceCount(pack) { return Object.keys(pack.sources).filter(k => (pack.sourceUse || {})[k]).length; }
async function sourcesScreen(carId) {
  const car = S.car(carId);
  if (!car) { location.hash = '#/'; return { html: '' }; }
  const match = await matchPack(car).catch(() => null);
  const pack = match ? await getPack(match.id) : null;
  if (!pack) { location.hash = `#/car/${carId}`; return { html: '' }; }
  const groups = groupSources(pack), n = sourceCount(pack), media = pack.mediaCredits || [];
  const rep = (carId, list) => list.map(r => `<a class="chip" href="#/car/${carId}/r/${r.id}">${esc(r.t)}</a>`).join('');
  const card = s => `<article class="src-card" data-q="${esc((s.title + ' ' + (s.authors || []).join(' ') + ' ' + host(s.url)).toLowerCase())}">
      <h3>${esc(s.title)}</h3>
      <div class="src-meta"><span>${esc(host(s.url))}</span>${s.authors ? `<span>autorzy cytowanych wypowiedzi: <b>${esc(s.authors.join(', '))}</b></span>` : ''}</div>
      <div class="src-use"><small>Użyte w:</small><div class="chips">${rep(carId, s.repairs)}</div></div>
      <a class="btn small" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${icon('link', 16)} Otwórz oryginał</a></article>`;
  const mediaHtml = media.length ? `<section class="src-group"><h2>Zdjęcia, filmy i odnośniki w krokach <em>${media.reduce((a, m) => a + m.count, 0)}</em></h2>
      ${media.map(m => `<article class="src-card" data-q="${esc((m.credit + ' ' + m.hosts.join(' ') + ' ' + m.details.join(' ')).toLowerCase())}"><h3>${esc(m.credit)}</h3><div class="src-meta"><span>${esc(m.hosts.join(', '))}</span><span>${m.count} ${m.count === 1 ? 'element' : 'elementów'} (${esc(m.types.map(t => ({ photo: 'zdjęcia', video: 'klipy', film: 'filmy', link: 'odnośniki' }[t] || t)).join(', '))})</span></div>
      ${m.details.length ? `<p class="src-note">${esc(m.details.join('; '))}</p>` : ''}
      ${m.links.length ? m.links.map(l => `<a class="btn small" href="${esc(l)}" target="_blank" rel="noopener noreferrer">${icon('link', 16)} ${esc(host(l))}</a>`).join(' ') : ''}
      <div class="src-use"><small>Użyte w:</small><div class="chips">${rep(carId, m.repairs.map(id => ({ id, t: (pack.repairs.find(r => r.id === id) || {}).title || id })))}</div></div></article>`).join('')}</section>` : '';
  return {
    tab: null,
    html: `${topbar({ back: `#/car/${carId}`, title: 'Źródła', sub: carName(car) })}
    <div class="wrap src-wrap">
      <p class="src-intro">Zestawienie wszystkiego, z czego korzysta Warsztat dla tego auta: ${n} źródeł z opisem, autorami wypowiedzi i miejscami użycia. Treści i zdjęcia należą do ich autorów i właścicieli stron. Aplikacja je tylko porządkuje i odsyła do oryginałów. Przy kartach napraw nie powtarzamy tych danych.</p>
      <label class="zsearch">${icon('search', 18)}<input id="srcq" type="search" placeholder="Szukaj w źródłach" aria-label="Szukaj w źródłach" autocomplete="off"></label>
      <div class="card src-sum">${groups.map((g, k) => `<button data-jump="${k}"><span>${esc(g.label)}</span><b>${g.items.length}</b></button>`).join('')}</div>
      <div id="srclist">${groups.map(g => `<section class="src-group" data-g="${groups.indexOf(g)}"><h2>${esc(g.label)} <em>${g.items.length}</em></h2>${g.items.map(card).join('')}</section>`).join('')}${mediaHtml}</div>
      <p class="foot">Nick autora pokazujemy tam, gdzie karta cytuje konkretną wypowiedź. Brak nicka oznacza, że autora jeszcze nie ustalono.</p>
    </div>`,
    bind(el) {
      $$('[data-jump]', el).forEach(b => b.onclick = () => { const s = $(`[data-g="${b.dataset.jump}"]`, el); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      $('#srcq', el).addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        $$('.src-card[data-q]', el).forEach(c => { c.hidden = !!q && !c.dataset.q.includes(q); });
        $$('.src-group', el).forEach(s => { const cs = $$('.src-card', s); s.hidden = !!q && cs.every(c => c.hidden); });
      });
    }
  };
}
route(/^car\/([^/]+)\/sources$/, sourcesScreen);
