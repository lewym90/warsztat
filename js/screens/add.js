import { route } from '../router.js';
import { $, $$, esc, toast, topbar } from '../ui.js';
import { icon } from '../icons.js';
import { matchPack } from '../data.js';
import { CATALOG, FUELS } from '../catalog.js';
import * as S from '../store.js';

/* ---------- DODAJ AUTO ---------- */
async function addScreen() {
  const st = { step: 1, make: '', model: '', gen: '', year: '', engine: '', fuel: 'diesel', kw: '', vin: '', nick: '', range: null, customMake: false, customModel: false };
  return {
    tab: '#/add',
    html: `${topbar({ back: '#/', title: 'Dodaj auto', sub: 'Garaż' })}<div class="wrap" id="wiz"></div>`,
    bind(el) {
      const wiz = $('#wiz', el);
      const bar = () => `<div class="stepper">${[1, 2, 3].map(i => `<i class="${i <= st.step ? 'on' : ''}"></i>`).join('')}</div>`;
      async function paint() {
        if (st.step === 1) {
          wiz.innerHTML = `${bar()}<div class="section-h">${icon('car', 16)} Marka</div>
            <div class="pick">${Object.keys(CATALOG).map(m => `<button data-make="${esc(m)}" class="${st.make === m && !st.customMake ? 'on' : ''}">${esc(m)}</button>`).join('')}<button data-make="__other" class="${st.customMake ? 'on' : ''}">Inna…</button></div>
            ${st.customMake ? `<div class="field"><label>Marka</label><input class="input" id="w-make" value="${esc(st.make)}" placeholder="np. Seat"></div><button class="btn primary block" id="w-next1">Dalej</button>` : ''}`;
          $$('[data-make]', wiz).forEach(b => b.onclick = () => {
            if (b.dataset.make === '__other') { st.customMake = true; st.make = ''; paint(); return; }
            st.customMake = false; st.make = b.dataset.make; st.step = 2; paint();
          });
          const n1 = $('#w-next1', wiz); if (n1) n1.onclick = () => { const v = $('#w-make', wiz).value.trim(); if (!v) return toast('Wpisz markę'); st.make = v; st.customModel = true; st.step = 2; paint(); };
        } else if (st.step === 2) {
          const list = CATALOG[st.make] || [];
          wiz.innerHTML = `${bar()}<div class="section-h">${icon('car', 16)} Model: ${esc(st.make)}</div>
            <div class="pick">${list.map(([m, g, a, b]) => `<button data-model="${esc(m)}|${esc(g)}|${a}|${b}" class="${st.model === m && st.gen === g ? 'on' : ''}">${esc(m)} ${esc(g)}<small>${a}–${b}</small></button>`).join('')}<button data-model="__other" class="${st.customModel ? 'on' : ''}">Inny…</button></div>
            ${st.customModel || !list.length ? `<div class="row2"><div class="field"><label>Model</label><input class="input" id="w-model" value="${esc(st.model)}" placeholder="np. Leon"></div><div class="field"><label>Generacja (opc.)</label><input class="input" id="w-gen" value="${esc(st.gen)}" placeholder="np. MK2"></div></div><button class="btn primary block" id="w-next2">Dalej</button>` : ''}
            <button class="btn ghost block" id="w-back">Wstecz</button>`;
          $$('[data-model]', wiz).forEach(b => b.onclick = () => {
            if (b.dataset.model === '__other') { st.customModel = true; st.model = ''; st.gen = ''; paint(); return; }
            const [m, g, a, bb] = b.dataset.model.split('|'); st.customModel = false; st.model = m; st.gen = g; st.range = [+a, +bb]; st.year = st.year || Math.round((+a + +bb) / 2); st.step = 3; paint();
          });
          const n2 = $('#w-next2', wiz); if (n2) n2.onclick = () => { const m = $('#w-model', wiz).value.trim(); if (!m) return toast('Wpisz model'); st.model = m; st.gen = $('#w-gen', wiz).value.trim(); st.range = null; st.step = 3; paint(); };
          $('#w-back', wiz).onclick = () => { st.step = 1; paint(); };
        } else {
          const probe = { make: st.make, model: st.model, gen: st.gen, year: +st.year || 0 };
          const m = st.year ? await matchPack(probe).catch(() => null) : null;
          wiz.innerHTML = `${bar()}<div class="section-h">${icon('key', 16)} Szczegóły: ${esc(st.make)} ${esc(st.model)} ${esc(st.gen)}</div>
            <div class="row2"><div class="field"><label>Rok produkcji</label><input class="input" id="w-year" type="number" inputmode="numeric" min="1950" max="2030" value="${esc(st.year)}" placeholder="2003"></div>
            <div class="field"><label>Paliwo</label><select class="input" id="w-fuel">${FUELS.map(f => `<option ${f === st.fuel ? 'selected' : ''}>${f}</option>`).join('')}</select></div></div>
            <div class="row2"><div class="field"><label>Silnik</label><input class="input" id="w-engine" value="${esc(st.engine)}" placeholder="np. 3.0d (M57)"></div>
            <div class="field"><label>Moc (kW)</label><input class="input" id="w-kw" type="number" inputmode="numeric" value="${esc(st.kw)}" placeholder="135"></div></div>
            <div class="field"><label>VIN (opcjonalnie, tylko w tym urządzeniu)</label><input class="input" id="w-vin" maxlength="17" autocapitalize="characters" value="${esc(st.vin)}" placeholder="17 znaków"></div>
            <div class="field"><label>Nazwa własna (opcjonalnie)</label><input class="input" id="w-nick" value="${esc(st.nick)}" placeholder="np. Mój X5"></div>
            <div class="matchbox ${m ? 'yes' : 'no'}" id="w-match">${m ? `<b>${icon('check', 16)} Mamy opracowanie: ${esc(m.title)}</b><p style="color:var(--muted);font-size:14px">Po dodaniu auta od razu zobaczysz poradniki.</p>` : `<b>${icon('clock', 16)} Brak opracowania dla tego auta</b><p style="color:var(--muted);font-size:14px">Dodasz auto do garażu, a na jego ekranie zamówisz opracowanie.</p>`}</div>
            <button class="btn primary block" id="w-save">${icon('check', 18)} Dodaj do garażu</button>
            <button class="btn ghost block" id="w-back">Wstecz</button>`;
          const rematch = async () => {
            st.year = $('#w-year', wiz).value; st.engine = $('#w-engine', wiz).value; st.kw = $('#w-kw', wiz).value; st.vin = $('#w-vin', wiz).value; st.nick = $('#w-nick', wiz).value; st.fuel = $('#w-fuel', wiz).value;
            const mm = st.year ? await matchPack({ make: st.make, model: st.model, gen: st.gen, year: +st.year }).catch(() => null) : null;
            const box = $('#w-match', wiz); box.className = 'matchbox ' + (mm ? 'yes' : 'no');
            box.innerHTML = mm ? `<b>${icon('check', 16)} Mamy opracowanie: ${esc(mm.title)}</b><p style="color:var(--muted);font-size:14px">Po dodaniu auta od razu zobaczysz poradniki.</p>` : `<b>${icon('clock', 16)} Brak opracowania dla tego auta</b><p style="color:var(--muted);font-size:14px">Dodasz auto do garażu, a na jego ekranie zamówisz opracowanie.</p>`;
          };
          $('#w-year', wiz).addEventListener('input', rematch);
          $('#w-back', wiz).onclick = () => { rematch(); st.step = 2; paint(); };
          $('#w-save', wiz).onclick = () => {
            const y = +$('#w-year', wiz).value;
            if (!y || y < 1950 || y > 2030) return toast('Podaj rok produkcji');
            const car = S.addCar({ make: st.make, model: st.model, gen: st.gen, year: y, engine: $('#w-engine', wiz).value.trim(), fuel: $('#w-fuel', wiz).value, kw: +$('#w-kw', wiz).value || 0, vin: $('#w-vin', wiz).value.trim().toUpperCase(), nick: $('#w-nick', wiz).value.trim() });
            toast('Dodano do garażu'); location.hash = `#/car/${car.id}`;
          };
        }
        wiz.classList.remove('screen'); void wiz.offsetWidth; wiz.classList.add('screen');
      }
      paint();
    }
  };
}

route(/^add$/, addScreen);
