// Zdjęcia użytkownika przy krokach napraw: IndexedDB tego urządzenia (nigdy nie wysyłane w sieć).
const DB = 'warsztat-media';
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('photos')) { const s = db.createObjectStore('photos', { keyPath: 'id' }); s.createIndex('rep', ['carId', 'rid']); }
      if (!db.objectStoreNames.contains('snaps')) db.createObjectStore('snaps', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
const tx = async (store, mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => { const t = db.transaction(store, mode); const out = fn(t.objectStore(store)); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); });
};
const pid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const hasDB = () => typeof indexedDB !== 'undefined';
export async function addPhoto({ carId, rid, step, blob, ts }) {
  const rec = { id: pid(), carId, rid, step, ts: ts || Date.now(), blob };
  await tx('photos', 'readwrite', s => s.put(rec)); return rec;
}
export const putPhoto = rec => tx('photos', 'readwrite', s => s.put(rec));
export const deletePhoto = id => tx('photos', 'readwrite', s => s.delete(id));
export async function listPhotos(carId, rid) {
  const db = await open();
  return new Promise((res, rej) => { const q = db.transaction('photos').objectStore('photos').index('rep').getAll([carId, rid]); q.onsuccess = () => res(q.result.sort((a, b) => a.ts - b.ts)); q.onerror = () => rej(q.error); });
}
export async function allPhotos() {
  const db = await open();
  return new Promise((res, rej) => { const q = db.transaction('photos').objectStore('photos').getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
export const clearPhotos = () => tx('photos', 'readwrite', s => s.clear());
export const countPhotos = async () => (await allPhotos()).length;

// zmniejsza zdjęcie z aparatu (długi bok max 1600 px, JPEG), żeby oszczędzać miejsce
export async function compressImage(file, max = 1600, q = 0.82) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(b || file), 'image/jpeg', q));
}

/* ----- migawki stanu (automatyczna lokalna kopia) ----- */
export const putSnap = rec => tx('snaps', 'readwrite', s => s.put(rec));
export const delSnap = id => tx('snaps', 'readwrite', s => s.delete(id));
export async function listSnaps() {
  const db = await open();
  return new Promise((res, rej) => { const q = db.transaction('snaps').objectStore('snaps').getAll(); q.onsuccess = () => res(q.result.sort((a, b) => b.ts - a.ts)); q.onerror = () => rej(q.error); });
}
