// Ładowanie paczek wiedzy (JSON) z cache w pamięci. Service worker zapewnia tryb offline.
const cache = new Map();

async function getJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const url = new URL(path, document.baseURI).href;
  const p = fetch(url).then(r => {
    if (!r.ok) throw new Error(`${r.status} ${path}`);
    return r.json();
  });
  cache.set(path, p);
  try { return await p; } catch (e) { cache.delete(path); throw e; }
}

export const getPacks = () => getJSON('data/packs.json');
export const getPack = id => getJSON(`data/packs/${id}/pack.json`);
export const getRepair = (packId, rid) => getJSON(`data/packs/${packId}/repairs/${rid}.json`);

// Dopasowanie auta z garażu do paczki wiedzy.
export async function matchPack(car) {
  const { packs } = await getPacks();
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
  return packs.find(p =>
    norm(p.match.make) === norm(car.make) &&
    norm(p.match.model) === norm(car.model) &&
    (!p.match.gen || norm(p.match.gen) === norm(car.gen)) &&
    car.year >= p.match.years[0] && car.year <= p.match.years[1]
  ) || null;
}
