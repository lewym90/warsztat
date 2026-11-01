import { icon } from './icons.js';
import * as S from './store.js';

export const APP_VERSION = '0.1.0';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const app = $('#app');

/* ---------- narzędzia UI ---------- */
let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
export async function copy(text, okMsg = 'Skopiowano') {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch (_) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(okMsg); } catch (__) { toast('Nie udało się skopiować'); }
    ta.remove();
  }
}
export function openSheet(html, bind) {
  $('#sheet-body').innerHTML = html;
  const sh = $('#sheet'); sh.classList.add('open'); sh.setAttribute('aria-hidden', 'false');
  if (bind) bind($('#sheet-body'));
}
export function closeSheet() { const sh = $('#sheet'); sh.classList.remove('open'); sh.setAttribute('aria-hidden', 'true'); }
$('#sheet .scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

export const carName = c => c.nick || `${c.make} ${c.model}`;
export const carSub = c => [c.gen, c.year, c.engine].filter(Boolean).join(' · ');
export const dots = n => `<span class="dots" aria-label="Trudność ${n} z 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
export const fmtTime = ([a, b]) => {
  const f = m => m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`;
  return a === b ? f(a) : `${f(a)} – ${f(b)}`;
};
export const CONF = { high: ['high', 'Pewność: wysoka'], med: ['med', 'Pewność: średnia (jedno źródło)'], low: ['low', 'Pewność: niska. Zweryfikuj'] };
export const COMPLETE = { 'pełne': ['ok', 'Opracowanie pełne'], 'częściowe': ['warn', 'Opracowanie częściowe'], 'szkic': ['danger', 'Szkic do uzupełnienia'] };

export function topbar({ back, title, sub, right = '' }) {
  return `<header class="topbar">
    ${back ? `<a class="iconbtn" href="${back}" aria-label="Wróć">${icon('back', 20)}</a>` : ''}
    <div class="title"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>${right}</header>`;
}
export function setTabs(active) {
  const tabs = [['#/', 'Garaż', 'car'], ['#/add', 'Dodaj auto', 'plus'], ['#/more', 'Więcej', 'more']];
  $('#tabs').innerHTML = tabs.map(([h, l, i]) => `<a href="${h}" class="${active === h ? 'on' : ''}">${icon(i, 22)}<span>${l}</span></a>`).join('');
  document.body.classList.toggle('no-tabs', !active);
}

export function requestText(car, topic) {
  return `Przygotuj opracowanie napraw do aplikacji „Warsztat” dla tego auta:
Marka i model: ${car.make} ${car.model}${car.gen ? ' ' + car.gen : ''}
Rok produkcji: ${car.year}
Silnik: ${car.engine || 'nie podano'}${car.fuel ? ', ' + car.fuel : ''}${car.kw ? ', ' + car.kw + ' kW' : ''}
Zakres: ${topic || 'wszystkie układy, zaczynając od drzwi i zamków'}

Zasady: własnymi słowami, bez kopiowania podręczników. Źródła z linkami. Numery części tylko z potwierdzeniem. Momenty dokręcania tylko ze źródła (inaczej „brak w źródłach”). Poziom pewności przy każdym kroku. Format jak paczka bmw-e53 w repozytorium Warsztatu (pack.json i repairs/*.json).`;
}
export function openRequest(car, topic) {
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

