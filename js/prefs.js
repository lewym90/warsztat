// Ustawienia wyglądu i pracy: motyw, wielkość liter, blokada wygaszania ekranu.
import * as S from './store.js';
import { icon } from './icons.js';
import { $$ } from './ui.js';

export const FS_STEPS = [0.9, 1, 1.15, 1.3, 1.5];
export function applyPrefs() {
  const p = S.prefs(); const r = document.documentElement;
  r.dataset.theme = p.theme; r.style.setProperty('--fscale', p.fs);
  const m = document.querySelector('meta[name="theme-color"]');
  const dark = p.theme === 'dark' || (p.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  if (m) m.content = dark ? '#081321' : '#eef3f9';
}
export function stepFont(dir) {
  const i = FS_STEPS.findIndex(x => Math.abs(x - S.prefs().fs) < 0.01);
  const j = Math.max(0, Math.min(FS_STEPS.length - 1, (i < 0 ? 1 : i) + dir));
  S.setPref('fs', FS_STEPS[j]); applyPrefs(); return FS_STEPS[j];
}

/* ----- blokada wygaszania ekranu (Wake Lock) ----- */
let sentinel = null, wanted = false;
export const wakeSupported = () => 'wakeLock' in navigator;
async function acquire() {
  if (!wanted || !wakeSupported() || !S.prefs().wake || document.visibilityState !== 'visible') return;
  try { sentinel = await navigator.wakeLock.request('screen'); sentinel.addEventListener('release', () => { sentinel = null; }); } catch (_) { sentinel = null; }
}
export function wakeOn() { wanted = true; return acquire(); }
export function wakeOff() { wanted = false; if (sentinel) { sentinel.release().catch(() => {}); sentinel = null; } }
export const wakeActive = () => !!sentinel;
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wanted && !sentinel) acquire(); });

/* ----- panel ustawień (w talii i w „Więcej”) ----- */
export function settingsHtml() {
  const p = S.prefs();
  return `<div class="setcard" data-settings>
    <div class="set-row"><span>Motyw</span><div class="seg3" role="group" aria-label="Motyw">
      ${[['light', 'Jasny'], ['dark', 'Ciemny'], ['auto', 'Auto']].map(([v, l]) => `<button data-theme="${v}" class="${p.theme === v ? 'on' : ''}" aria-pressed="${p.theme === v}">${l}</button>`).join('')}</div></div>
    <div class="set-row"><span>Wielkość liter</span><div class="fsbtns"><button data-fs="-1" aria-label="Mniejsze litery">A−</button><b data-fsv>${Math.round(p.fs * 100)}%</b><button data-fs="1" aria-label="Większe litery">A+</button></div></div>
    <div class="set-row"><span>Nie gaś ekranu przy naprawie<small data-wakeinfo>${wakeSupported() ? '' : 'Ta przeglądarka nie obsługuje blokady ekranu.'}</small></span><button class="switch ${p.wake ? 'on' : ''}" data-wake role="switch" aria-checked="${p.wake}" aria-label="Nie gaś ekranu"><i></i></button></div>
  </div>`;
}
export function bindSettings(root) {
  const box = root.querySelector('[data-settings]'); if (!box) return;
  box.addEventListener('click', e => {
    const t = e.target.closest('[data-theme]'), f = e.target.closest('[data-fs]'), w = e.target.closest('[data-wake]');
    if (t) { S.setPref('theme', t.dataset.theme); applyPrefs(); $$('[data-theme]', box).forEach(b => { const on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); }
    if (f) { const v = stepFont(+f.dataset.fs); box.querySelector('[data-fsv]').textContent = Math.round(v * 100) + '%'; }
    if (w) { const on = !S.prefs().wake; S.setPref('wake', on); w.classList.toggle('on', on); w.setAttribute('aria-checked', on); if (on) acquire(); else if (sentinel) { sentinel.release().catch(() => {}); } }
  });
}
export { icon };
