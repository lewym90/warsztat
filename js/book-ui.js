// Arkusz wpisu do książki serwisowej (nowy lub edycja). Używany w książce i po zakończeniu naprawy.
import * as S from './store.js';
import { $, closeSheet, esc, openSheet, toast } from './ui.js';

const today = () => new Date().toISOString().slice(0, 10);
export const money = v => (v || v === 0) && !isNaN(v) ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(+v) : '';

export function openEntrySheet(carId, preset = {}, done) {
  const car = S.car(carId); if (!car) return;
  const e = { date: today(), km: car.km || '', title: '', cost: '', parts: [], note: '', ...preset };
  openSheet(`<h3 style="margin:6px 0 12px">${e.id ? 'Edytuj wpis' : 'Nowy wpis w książce serwisowej'}</h3>
    <div class="bk-form">
      <label>Co zrobiono<input class="input" id="bk-t" value="${esc(e.title)}" placeholder="np. Wymiana klamki zewnętrznej"></label>
      <div class="row2"><label>Data<input class="input" id="bk-d" type="date" value="${esc(e.date)}"></label><label>Przebieg (km)<input class="input" id="bk-km" type="number" inputmode="numeric" min="0" value="${esc(e.km)}"></label></div>
      <label>Koszt (zł)<input class="input" id="bk-c" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(e.cost)}"></label>
      <label>Kupione części (po jednej w wierszu)<textarea class="input" id="bk-p" rows="3" placeholder="nazwa, numer, sklep">${esc((e.parts || []).join('\n'))}</textarea></label>
      <label>Notatka<textarea class="input" id="bk-n" rows="3">${esc(e.note)}</textarea></label>
      <button class="btn primary block" id="bk-save">Zapisz wpis</button>
      ${e.id ? '<button class="btn ghost block" id="bk-del">Usuń wpis</button>' : ''}
    </div>`, el => {
    $('#bk-save', el).onclick = () => {
      const title = $('#bk-t', el).value.trim();
      if (!title) { toast('Wpisz, co zrobiono'); $('#bk-t', el).focus(); return; }
      const data = { carId, title, date: $('#bk-d', el).value || today(), km: +$('#bk-km', el).value || 0, cost: $('#bk-c', el).value === '' ? '' : +$('#bk-c', el).value,
        parts: $('#bk-p', el).value.split('\n').map(x => x.trim()).filter(Boolean), note: $('#bk-n', el).value.trim(), rid: e.rid || '' };
      if (e.id) S.updateEntry(e.id, data); else S.addEntry(data);
      closeSheet(); toast('Zapisano w książce serwisowej'); done && done();
    };
    const d = $('#bk-del', el); if (d) d.onclick = () => { if (confirm('Usunąć ten wpis?')) { S.removeEntry(e.id); closeSheet(); done && done(); } };
  });
}
