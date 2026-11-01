// Pomocnicze: atrapa localStorage i wczytywanie danych napraw z dysku.
import fs from 'node:fs';
export function fakeStorage() {
  const m = new Map();
  globalThis.localStorage = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() };
  return m;
}
export const repairs = () => fs.readdirSync('data/packs/bmw-e53/repairs').filter(f => f.endsWith('.json')).map(f => ({ ...JSON.parse(fs.readFileSync('data/packs/bmw-e53/repairs/' + f, 'utf8')), id: f.replace('.json', '') }));
