import { route, render } from '../router.js';
import { $, $$, esc, toast, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { acceptChunk, chunkSync, decodeSync, encodeSync } from '../merge.js';
import { mergeIncoming } from '../backup.js';
import qrcode from '../vendor/qrcode.js';
import jsQR from '../vendor/jsqr.js';
import * as S from '../store.js';

/* ---------- SYNCHRONIZACJA telefon ↔ komputer: kody QR (bez zdjęć) albo plik kopii ---------- */
const BUF = 'warsztat.syncbuf';
const loadBuf = () => { try { return JSON.parse(sessionStorage.getItem(BUF) || 'null'); } catch (_) { return null; } };
const saveBuf = b => { try { if (b) sessionStorage.setItem(BUF, JSON.stringify(b)); else sessionStorage.removeItem(BUF); } catch (_) { /* brak */ } };
export function qrSvg(text, size = 280) {
  const q = qrcode(0, 'L'); q.addData(text); q.make();
  const n = q.getModuleCount(), cell = size / (n + 8);
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${((c + 4) * cell).toFixed(2)} ${((r + 4) * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Kod QR synchronizacji"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
async function applyPayload(str) {
  const inc = await decodeSync(str);
  if (!inc || !Array.isArray(inc.cars)) throw new Error('Nieprawidłowe dane synchronizacji.');
  mergeIncoming(inc); saveBuf(null);
  return S.state().cars.length;
}
// przyjmuje jeden kod (tekst z QR lub link z #/sync?c=…); zwraca stan odbioru
export async function feedChunk(text) {
  const chunk = text.includes('c=') ? decodeURIComponent(text.split('c=').pop()) : text;
  const r = acceptChunk(loadBuf(), chunk.trim());
  if (r.done) { await applyPayload(r.str); return { done: true }; }
  saveBuf(r.buf); return { done: false, have: Object.keys(r.buf.parts).length, n: r.buf.n };
}
async function syncScreen(q) {
  const incoming = q && q.get && q.get('c');
  return {
    tab: null,
    html: `${topbar({ back: '#/more', title: 'Synchronizacja', sub: 'Telefon ↔ komputer' })}
    <div class="wrap">
      <p class="zblurb">Łączy dane obu urządzeń: nic nie jest kasowane, a przy konflikcie wygrywa nowszy zapis. Kody QR przenoszą auta, postęp, notatki i książkę serwisową. Zdjęcia przenosi plik kopii.</p>
      <div class="section-h">${icon('upload', 16)} Wyślij z tego urządzenia</div>
      <div class="card pad" style="display:grid;gap:10px">
        <button class="btn primary block" id="sy-show">${icon('spark', 18)} Pokaż kody QR</button>
        <div id="sy-qr" class="sy-qr" hidden></div>
      </div>
      <div class="section-h">${icon('eye', 16)} Odbierz na tym urządzeniu</div>
      <div class="card pad" style="display:grid;gap:10px">
        <button class="btn primary block" id="sy-scan">${icon('eye', 18)} Skanuj kody aparatem</button>
        <div id="sy-cam" class="sy-cam" hidden><video id="sy-video" playsinline muted></video><canvas id="sy-cv" hidden></canvas></div>
        <p class="foot" id="sy-st" role="status">${incoming ? '' : 'Na drugim urządzeniu wybierz „Pokaż kody QR”, potem tu „Skanuj”.'}</p>
        <label class="zsearch"><input id="sy-paste" placeholder="Albo wklej kod lub link" aria-label="Wklej kod synchronizacji"></label>
      </div>
      <div class="section-h">${icon('download', 16)} Przez plik (ze zdjęciami)</div>
      <div class="card pad" style="display:grid;gap:10px">
        <p class="foot" style="margin:0">Na drugim urządzeniu zapisz kopię (Więcej → Kopia zapasowa), prześlij plik (AirDrop, mail) i wczytaj go tutaj jako „Połącz”.</p>
        <a class="btn block" href="#/more">Przejdź do kopii zapasowej</a>
      </div>
    </div>`,
    bind(el) {
      const st = $('#sy-st', el);
      const status = t => { st.textContent = t; };
      const feed = async text => {
        try { const r = await feedChunk(text); status(r.done ? `Połączono. Aut w garażu: ${S.state().cars.length}.` : `Odebrano ${r.have} z ${r.n}. Pokaż kolejny kod.`); if (r.done) { stopCam(); toast('Dane połączone'); } return r; } catch (e) { status(e.message || 'Nie udało się odczytać kodu.'); }
      };
      if (incoming) feed(incoming);
      $('#sy-paste', el).addEventListener('change', e => { feed(e.target.value); e.target.value = ''; });
      // nadawanie
      let timer = null;
      $('#sy-show', el).onclick = async () => {
        const box = $('#sy-qr', el); box.hidden = false; box.innerHTML = 'Przygotowuję…';
        const base = location.href.split('#')[0];
        const chunks = chunkSync(await encodeSync(S.state()), 700);
        let i = 0, auto = true;
        const paint = () => { box.innerHTML = `${qrSvg(`${base}#/sync?c=${chunks[i]}`)}<p>Kod ${i + 1} z ${chunks.length}</p><div class="row2"><button class="btn small" data-p>Wstecz</button><button class="btn small" data-n>Dalej</button></div><button class="btn small ghost" data-a>${auto ? 'Zatrzymaj automat' : 'Włącz automat'}</button>`; };
        paint();
        clearInterval(timer);
        const step = d => { i = (i + d + chunks.length) % chunks.length; paint(); };
        timer = setInterval(() => { if (!$('#sy-qr', document)) { clearInterval(timer); return; } if (auto && chunks.length > 1) step(1); }, 3500);
        box.onclick = e => { if (e.target.closest('[data-p]')) step(-1); if (e.target.closest('[data-n]')) step(1); if (e.target.closest('[data-a]')) { auto = !auto; paint(); } };
      };
      // odbiór kamerą
      let stream = null, raf = 0;
      const stopCam = () => { cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; const cam = $('#sy-cam', el); if (cam) cam.hidden = true; };
      $('#sy-scan', el).onclick = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { status('Ta przeglądarka nie daje dostępu do aparatu. Wklej kod lub użyj pliku.'); return; }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          const v = $('#sy-video', el), cv = $('#sy-cv', el), ctx = cv.getContext('2d', { willReadFrequently: true });
          $('#sy-cam', el).hidden = false; v.srcObject = stream; await v.play(); status('Skieruj aparat na kod QR.');
          let last = '';
          const tick = async () => {
            if (!stream) return;
            if (v.readyState >= 2 && v.videoWidth) {
              cv.width = v.videoWidth; cv.height = v.videoHeight; ctx.drawImage(v, 0, 0);
              const img = ctx.getImageData(0, 0, cv.width, cv.height);
              const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
              if (code && code.data && code.data !== last) { last = code.data; const r = await feed(code.data); if (r && r.done) return; }
            }
            raf = requestAnimationFrame(tick);
          };
          tick();
        } catch (e) { status('Brak zgody na aparat. Włącz ją w ustawieniach lub wklej kod.'); }
      };
      window.addEventListener('hashchange', () => { stopCam(); clearInterval(timer); }, { once: true });
      void render; void esc; void $$;
    }
  };
}
route(/^sync$/, q => syncScreen(q));
