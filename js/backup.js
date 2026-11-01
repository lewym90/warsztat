// Kopie zapasowe: plik (z notatkami i zdjęciami), migawki lokalne, przypomnienie, synchronizacja między urządzeniami.
import * as S from './store.js';
import { allPhotos, putPhoto, clearPhotos, putSnap, delSnap, listSnaps } from './photos.js';
import { mergeStates } from './merge.js';

const DAY = 86400000;
const blobToData = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
const dataToBlob = async d => (await fetch(d)).blob();

export async function buildBackup({ photos = true } = {}) {
  const ph = [];
  if (photos) for (const p of await allPhotos().catch(() => [])) ph.push({ id: p.id, carId: p.carId, rid: p.rid, step: p.step, ts: p.ts, data: await blobToData(p.blob) });
  return { app: 'warsztat', v: 2, ts: Date.now(), state: S.state(), photos: ph };
}
export const backupFileName = () => `warsztat-kopia-${new Date().toISOString().slice(0, 10)}.json`;

// Zapis kopii: arkusz udostępniania (Pliki/iCloud na iPhonie) lub pobranie pliku.
export async function saveBackupFile() {
  const obj = await buildBackup();
  const file = new File([JSON.stringify(obj)], backupFileName(), { type: 'application/json' });
  let how = 'download';
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Kopia Warsztatu' }); how = 'share'; }
    else throw new Error('no-share');
  } catch (e) {
    if (e && e.name === 'AbortError') return { how: 'cancel', photos: obj.photos.length };
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  S.setBackupMeta({ lastExport: Date.now() });
  return { how, photos: obj.photos.length };
}

// Wczytanie kopii (plik v1 lub v2). mode: 'merge' (domyślnie, nic nie kasuje) albo 'replace'.
export async function restoreBackup(text, mode = 'merge') {
  const obj = JSON.parse(text);
  const st = obj && obj.app === 'warsztat' ? obj.state : obj;
  if (!st || !Array.isArray(st.cars)) throw new Error('To nie jest kopia Warsztatu.');
  S.setState(mode === 'replace' ? st : mergeStates(S.state(), st));
  let n = 0;
  if (mode === 'replace') await clearPhotos().catch(() => {});
  for (const p of (obj.photos || [])) { await putPhoto({ id: p.id, carId: p.carId, rid: p.rid, step: p.step, ts: p.ts, blob: await dataToBlob(p.data) }); n++; }
  return { cars: S.state().cars.length, photos: n };
}
export function mergeIncoming(state) { S.setState(mergeStates(S.state(), state)); return S.state(); }

/* ----- automatyczne migawki (raz na dobę, zostaje 5 ostatnich) ----- */
export async function snapshotIfDue(now = Date.now()) {
  const m = S.backupMeta();
  if (now - (m.lastSnap || 0) < DAY) return false;
  const snaps = await listSnaps().catch(() => null);
  if (snaps === null) return false;
  await putSnap({ id: 's' + now, ts: now, state: JSON.parse(JSON.stringify(S.state())) });
  for (const old of snaps.slice(4)) await delSnap(old.id);
  S.setBackupMeta({ lastSnap: now });
  return true;
}
export const snapshots = () => listSnaps();
export async function restoreSnapshot(id) {
  const s = (await listSnaps()).find(x => x.id === id);
  if (!s) throw new Error('Brak migawki.');
  S.setState(s.state); return s.ts;
}

/* ----- przypomnienie o kopii poza urządzeniem ----- */
export function hasUserData(st = S.state()) {
  return Object.values(st.prog || {}).some(p => Object.keys(p.notes || {}).length || Object.values(p.steps || {}).some(Boolean)) || (st.book || []).length > 0;
}
export function backupDue(now = Date.now(), st = S.state()) {
  const m = st.backup || {};
  return hasUserData(st) && now - (m.lastExport || 0) > 7 * DAY && now - (m.remindedAt || 0) > DAY;
}
