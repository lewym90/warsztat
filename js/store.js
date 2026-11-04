// Dane użytkownika (garaż, postęp, notatki, książka serwisowa, plan dnia, ustawienia) trzymane w localStorage tego urządzenia.
// Zdjęcia użytkownika są osobno w IndexedDB (photos.js).
const KEY = 'warsztat.v1';

const SEED = () => ({
  v: 1,
  cars: [{
    id: 'c' + Date.now().toString(36),
    make: 'BMW', model: 'X5', gen: 'E53', year: 2003,
    engine: '3.0d (M57)', fuel: 'diesel', kw: 135, ccm: 2926,
    nick: '', vin: '', fav: true, created: Date.now()
  }],
  prog: {},
  requests: []
});

export const DEFAULT_PREFS = { theme: 'dark', fs: 1, wake: true, installDismissed: 0, car: '', skin: 0 };

let mem = null;
const ls = () => { try { return globalThis.localStorage || null; } catch (_) { return null; } };

function read() {
  try {
    const raw = ls() && ls().getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* tryb prywatny */ }
  return null;
}
function write() {
  try { ls() && ls().setItem(KEY, JSON.stringify(mem)); } catch (_) { /* brak pamięci */ }
}
// uzupełnia nowe pola w danych zapisanych starszą wersją aplikacji
export function normalize(m) {
  m.v = 1;
  m.cars = m.cars || []; m.prog = m.prog || {}; m.requests = m.requests || [];
  m.prefs = { ...DEFAULT_PREFS, ...(m.prefs || {}) };
  if (m.prefs.skin < 2) { m.prefs.theme = 'dark'; m.prefs.skin = 2; } // nowa szata graficzna: ciemny motyw domyślny, jasny do wyboru
  m.book = m.book || [];
  m.plan = m.plan || { ids: [], carId: null, ts: 0 };
  m.last = m.last || null;
  m.backup = { lastExport: 0, lastSnap: 0, remindedAt: 0, ...(m.backup || {}) };
  return m;
}

export function init() {
  mem = normalize(read() || SEED());
  write();
  return mem;
}
export const state = () => mem;
export function setState(m) { mem = normalize(m); write(); return mem; }

export const cars = () => [...mem.cars].sort((a, b) => (b.fav - a.fav) || (b.created - a.created));
export const car = id => mem.cars.find(c => c.id === id);
// auto bieżące: ostatnio wybrane, potem to z ostatniej naprawy, potem ulubione
export const currentCar = () => car(mem.prefs.car) || (mem.last && car(mem.last.carId)) || cars()[0] || null;
export const setCurrent = id => { if (mem.prefs.car !== id) setPref('car', id); };

export function addCar(c) {
  const item = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), created: Date.now(), fav: false, vin: '', nick: '', ...c };
  mem.cars.push(item); write(); return item;
}
export function updateCar(id, patch) { const c = car(id); if (c) { Object.assign(c, patch, { u: Date.now() }); write(); } return c; }
export function removeCar(id) {
  mem.cars = mem.cars.filter(c => c.id !== id);
  Object.keys(mem.prog).forEach(k => { if (k.startsWith(id + ':')) delete mem.prog[k]; });
  mem.book = mem.book.filter(e => e.carId !== id);
  write();
}
export function toggleFav(id) { const c = car(id); if (c) { c.fav = !c.fav; c.u = Date.now(); write(); } return c; }

/* ----- postęp i notatki ----- */
export function prog(carId, rid) {
  const k = carId + ':' + rid;
  if (!mem.prog[k]) mem.prog[k] = { steps: {}, tools: {}, after: {}, safety: {}, notes: {}, started: 0 };
  const p = mem.prog[k];
  p.notes = p.notes || {}; p.safety = p.safety || {};
  return p;
}
export function saveProg(p) { if (p) p.u = Date.now(); write(); }
export function resetProg(carId, rid) { delete mem.prog[carId + ':' + rid]; write(); }
// notatka do kroku: { t: tekst, u: czas }; pusty tekst kasuje
export function setNote(carId, rid, step, text) {
  const p = prog(carId, rid);
  if (text && text.trim()) p.notes[step] = { t: text, u: Date.now() }; else delete p.notes[step];
  p.u = Date.now(); write();
}
export const noteOf = (carId, rid, step) => (prog(carId, rid).notes[step] || {}).t || '';
// ostatnio otwarta naprawa (do „Wznów”)
export function setLast(carId, rid, info = {}) { mem.last = { carId, rid, ts: Date.now(), ...info }; write(); }
export const getLast = () => mem.last;

/* ----- ustawienia ----- */
export const prefs = () => mem.prefs;
export function setPref(k, v) { mem.prefs[k] = v; write(); return mem.prefs; }

/* ----- plan dnia ----- */
export const getPlan = () => mem.plan;
export function setPlan(ids, carId) { mem.plan = { ids: [...new Set(ids)], carId, ts: Date.now(), bought: ids.length ? (mem.plan.bought || {}) : {} }; write(); return mem.plan; }
export function toggleBought(key) { const b = { ...(mem.plan.bought || {}) }; if (b[key]) delete b[key]; else b[key] = true; mem.plan = { ...mem.plan, bought: b, ts: Date.now() }; write(); return !!b[key]; }
export function togglePlan(id, carId) {
  const p = mem.plan; const ids = p.carId && carId && p.carId !== carId ? [] : [...p.ids];
  const i = ids.indexOf(id); if (i >= 0) ids.splice(i, 1); else ids.push(id);
  return setPlan(ids, carId || p.carId);
}
export const clearPlan = () => setPlan([], mem.plan.carId);

/* ----- książka serwisowa ----- */
const eid = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const bookEntries = carId => mem.book.filter(e => e.carId === carId).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.u - a.u);
export function addEntry(e) { const item = { id: eid(), u: Date.now(), parts: [], ...e }; mem.book.push(item); const c = car(e.carId); if (c && e.km && (!c.km || e.km > c.km)) { c.km = e.km; c.u = Date.now(); } write(); return item; }
export function updateEntry(id, patch) { const e = mem.book.find(x => x.id === id); if (e) { Object.assign(e, patch, { u: Date.now() }); write(); } return e; }
export function removeEntry(id) { mem.book = mem.book.filter(e => e.id !== id); write(); }

/* ----- kopie zapasowe ----- */
export const backupMeta = () => mem.backup;
export function setBackupMeta(patch) { Object.assign(mem.backup, patch); write(); }

export function requests() { return mem.requests; }
export function addRequest(r) { mem.requests.push({ ...r, ts: Date.now() }); write(); }
export function exportAll() { return JSON.stringify(mem, null, 2); }
