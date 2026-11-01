// Tryb offline "na dziś": zapisuje zdjęcia i grafiki wybranych napraw w pamięci telefonu na 24 godziny.
// Teksty kart i aplikacja są w pamięci service workera cały czas. Filmów z YouTube nie da się zapisać
// w aplikacji (zasady serwisu), więc zapisujemy tylko listę filmów do pobrania w aplikacji YouTube.
import { getRepair, getPack } from './data.js';

export const OFFLINE_CACHE = 'offline-24h';
const KEY = 'warsztat.offline';
const TTL = 24 * 3600 * 1000;

export function offlineMeta() {
  try { const m = JSON.parse(localStorage.getItem(KEY) || 'null'); return m && m.ts ? m : null; } catch (_) { return null; }
}
export async function offlineExpire(force) {
  const m = offlineMeta();
  if (!force && m && Date.now() - m.ts < TTL) return false;
  try { await caches.delete(OFFLINE_CACHE); } catch (_) {}
  try { localStorage.removeItem(KEY); } catch (_) {}
  return !!m;
}
export const offlineLeft = m => Math.max(0, TTL - (Date.now() - m.ts));
export const fmtLeft = ms => { const h = Math.floor(ms / 3600000), mi = Math.floor(ms % 3600000 / 60000); return `${h} h ${mi} min`; };

async function urlsFor(packId, rids) {
  const urls = new Set(), films = new Map(), items = [];
  for (let k = 1; k <= 81; k++) urls.add(`img/spin/f${String(k).padStart(2, '0')}.webp`);
  ['e53-front', 'e53-rear', 'e53-front-r', 'e53-rear-r'].forEach(n => urls.add(`img/doors/${n}.webp`));
  urls.add('img/x5-e53.webp');
  for (const id of rids) {
    const r = await getRepair(packId, id).catch(() => null);
    if (!r) continue;
    items.push({ id, title: r.title });
    for (const s of r.steps || []) for (const m of s.media || []) {
      if (m.type === 'photo') urls.add(m.url);
      if (m.type === 'film') { films.set(m.id, { id: m.id, len: m.len, cap: m.cap, from: r.title }); urls.add(`https://i.ytimg.com/vi/${m.id}/hqdefault.jpg`); }
    }
  }
  return { urls: [...urls], films: [...films.values()], items };
}

// onProgress(done, total). Zwraca meta.
export async function saveOffline(packId, rids, onProgress) {
  const { urls, films, items } = await urlsFor(packId, rids);
  const old = offlineMeta();
  const cache = await caches.open(OFFLINE_CACHE);
  let done = 0, fail = [];
  const total = urls.length;
  const one = async u => {
    const abs = new URL(u, document.baseURI).href;
    try {
      if (await cache.match(abs)) return;
      let resp;
      try { resp = await fetch(abs, { mode: abs.startsWith(location.origin) ? 'same-origin' : 'cors', referrerPolicy: 'no-referrer' }); if (!resp.ok) throw 0; }
      catch (_) { resp = await fetch(abs, { mode: 'no-cors', referrerPolicy: 'no-referrer' }); }
      if (resp.type !== 'opaque' && !resp.ok) throw 0;
      await cache.put(abs, resp);
    } catch (_) { fail.push(u); }
    finally { onProgress && onProgress(++done, total); }
  };
  const q = urls.slice(); const workers = Array.from({ length: 6 }, async () => { while (q.length) await one(q.shift()); });
  await Promise.all(workers);
  const merged = new Map([...(old ? old.items : []), ...items].map(i => [i.id, i]));
  const fmap = new Map([...(old ? old.films : []), ...films].map(f => [f.id, f]));
  const meta = { ts: old ? old.ts : Date.now(), packId, items: [...merged.values()], films: [...fmap.values()], fail: fail.filter(u => /^https?:/.test(u)).length, total };
  localStorage.setItem(KEY, JSON.stringify(meta));
  return meta;
}
