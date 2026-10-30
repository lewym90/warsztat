// Dane użytkownika (garaż, postęp, zlecenia) trzymane wyłącznie w localStorage tego urządzenia.
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

let mem = null;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* tryb prywatny */ }
  return null;
}
function write() {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (_) { /* brak pamięci */ }
}

export function init() {
  mem = read() || SEED();
  write();
  return mem;
}
export const state = () => mem;

export const cars = () => [...mem.cars].sort((a, b) => (b.fav - a.fav) || (b.created - a.created));
export const car = id => mem.cars.find(c => c.id === id);

export function addCar(c) {
  const item = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), created: Date.now(), fav: false, vin: '', nick: '', ...c };
  mem.cars.push(item); write(); return item;
}
export function updateCar(id, patch) { const c = car(id); if (c) { Object.assign(c, patch); write(); } return c; }
export function removeCar(id) {
  mem.cars = mem.cars.filter(c => c.id !== id);
  Object.keys(mem.prog).forEach(k => { if (k.startsWith(id + ':')) delete mem.prog[k]; });
  write();
}
export function toggleFav(id) { const c = car(id); if (c) { c.fav = !c.fav; write(); } return c; }

export function prog(carId, rid) {
  const k = carId + ':' + rid;
  if (!mem.prog[k]) mem.prog[k] = { steps: {}, tools: {}, after: {}, started: 0 };
  return mem.prog[k];
}
export function saveProg() { write(); }
export function resetProg(carId, rid) { delete mem.prog[carId + ':' + rid]; write(); }

export function addRequest(r) { mem.requests.push({ ...r, ts: Date.now() }); write(); }
export const requests = () => mem.requests;

export function exportAll() { return JSON.stringify(mem, null, 2); }
export function importAll(text) {
  const obj = JSON.parse(text);
  if (!obj || !Array.isArray(obj.cars)) throw new Error('To nie jest kopia zapasowa Warsztatu.');
  mem = { v: 1, cars: obj.cars, prog: obj.prog || {}, requests: obj.requests || [] };
  write();
}
