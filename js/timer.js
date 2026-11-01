// Minutnik robót (np. „odczekaj 30 minut po odłączeniu akumulatora”). Stan w localStorage, więc przeżywa odświeżenie.
// Uwaga: w tle telefon może wstrzymać stronę, dlatego po powrocie do aplikacji czas jest liczony od zegara.
import { icon } from './icons.js';
import { openSheet, closeSheet, esc, $, $$ } from './ui.js';
import { fmtClock, suggestMinutes } from './timer-core.js';
export { fmtClock, suggestMinutes };

const KEY = 'warsztat.timer';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; } };
const write = v => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch (_) {} };

export const getTimer = () => read();
export const timerLeft = (t = read(), now = Date.now()) => t ? t.end - now : 0;
export function startTimer(min, label) { const t = { end: Date.now() + min * 60000, label: label || 'Minutnik', min, fired: false }; write(t); tick(); return t; }
export function cancelTimer() { write(null); tick(); }
export function addTime(min) { const t = read(); if (!t) return; t.end += min * 60000; t.fired = false; write(t); tick(); }
let pill = null, audio = null;
function beep() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 4; i++) { const o = audio.createOscillator(), g = audio.createGain(); o.connect(g); g.connect(audio.destination); o.frequency.value = 880; g.gain.value = 0.2; o.start(audio.currentTime + i * 0.45); o.stop(audio.currentTime + i * 0.45 + 0.25); }
  } catch (_) { /* brak dźwięku */ }
  try { navigator.vibrate && navigator.vibrate([300, 150, 300, 150, 300]); } catch (_) { /* iOS */ }
}
function ring(t) {
  t.fired = true; write(t); beep();
  const ov = document.createElement('div'); ov.className = 'timeup'; ov.setAttribute('role', 'alertdialog');
  ov.innerHTML = `<div class="timeup-in"><b>Czas minął</b><p>${esc(t.label)}</p><button class="btn primary block" data-ok>OK</button><button class="btn block" data-more>Jeszcze 5 min</button></div>`;
  ov.addEventListener('click', e => { if (e.target.closest('[data-ok]')) { cancelTimer(); ov.remove(); } if (e.target.closest('[data-more]')) { addTime(5); ov.remove(); } });
  document.body.appendChild(ov);
}
export function tick() {
  const t = read();
  if (!pill) { pill = document.createElement('button'); pill.id = 'timerpill'; pill.setAttribute('aria-label', 'Minutnik'); pill.onclick = () => openTimerSheet(); document.body.appendChild(pill); }
  if (!t) { pill.hidden = true; return; }
  const left = timerLeft(t);
  pill.hidden = false; pill.classList.toggle('done', left <= 0);
  pill.innerHTML = `${icon('clock', 16)}<b>${left <= 0 ? 'Czas minął' : fmtClock(left)}</b><small>${esc(t.label)}</small>`;
  if (left <= 0 && !t.fired) ring(t);
}
export function initTimer() { tick(); setInterval(tick, 1000); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); }); }

export function openTimerSheet(suggest, label) {
  const t = read(); const pre = [5, 10, 15, 30, 45, 60];
  openSheet(`<h3 style="margin:6px 0 10px">Minutnik</h3>
    ${t ? `<p class="tm-run"><b data-left>${fmtClock(timerLeft(t))}</b> · ${esc(t.label)}</p><div class="row2"><button class="btn" data-add="5">+5 min</button><button class="btn" data-cancel>Zatrzymaj</button></div><hr class="tm-hr">` : ''}
    <p class="tm-l">${suggest ? `Z opisu kroku: ${suggest} min.` : 'Ustaw czas:'}</p>
    <div class="tm-pre">${pre.map(m => `<button class="btn ${m === suggest ? 'primary' : ''}" data-min="${m}">${m} min</button>`).join('')}</div>
    <div class="tm-cus"><input class="input" id="tm-c" type="number" inputmode="numeric" min="1" max="600" placeholder="Własny czas (min)" aria-label="Własny czas w minutach"><button class="btn primary" id="tm-go">Start</button></div>
    <p class="tm-n">Na iPhonie dzwonek działa, gdy aplikacja jest na ekranie. W tle czas jest liczony dalej, a komunikat pojawi się po powrocie.</p>`, el => {
    $$('[data-min]', el).forEach(b => b.onclick = () => { startTimer(+b.dataset.min, label || 'Minutnik'); closeSheet(); });
    $('#tm-go', el).onclick = () => { const v = +$('#tm-c', el).value; if (v > 0) { startTimer(v, label || 'Minutnik'); closeSheet(); } };
    $$('[data-add]', el).forEach(b => b.onclick = () => { addTime(+b.dataset.add); closeSheet(); });
    const c = $('[data-cancel]', el); if (c) c.onclick = () => { cancelTimer(); closeSheet(); };
  });
}
