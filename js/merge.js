// Czyste funkcje (bez DOM): łączenie stanów dwóch urządzeń i kodowanie paczek synchronizacji (QR).
const newer = (a, b) => ((b && b.u) || 0) > ((a && a.u) || 0) ? b : a;

// Łączy dane z drugiego urządzenia z lokalnymi: nic nie jest kasowane, przy konflikcie wygrywa nowszy zapis.
export function mergeStates(local, inc) {
  const out = JSON.parse(JSON.stringify(local));
  const byId = (arr = []) => new Map(arr.map(x => [x.id, x]));
  const cars = byId(out.cars);
  for (const c of inc.cars || []) cars.set(c.id, cars.has(c.id) ? newer(cars.get(c.id), c) : c);
  out.cars = [...cars.values()];
  const book = byId(out.book);
  for (const e of inc.book || []) book.set(e.id, book.has(e.id) ? newer(book.get(e.id), e) : e);
  out.book = [...book.values()];
  out.prog = out.prog || {};
  for (const [k, p] of Object.entries(inc.prog || {})) {
    const l = out.prog[k];
    if (!l) { out.prog[k] = p; continue; }
    const base = newer(l, p) === p ? p : l;
    const notes = { ...(l.notes || {}) };
    for (const [i, n] of Object.entries(p.notes || {})) if (!notes[i] || (n.u || 0) > (notes[i].u || 0)) notes[i] = n;
    out.prog[k] = { ...base, notes, tools: { ...(l.tools || {}), ...(p.tools || {}) }, after: { ...(l.after || {}), ...(p.after || {}) }, safety: { ...(l.safety || {}), ...(p.safety || {}) } };
  }
  const reqs = new Map((out.requests || []).map(r => [r.ts + r.topic, r]));
  for (const r of inc.requests || []) reqs.set(r.ts + r.topic, r);
  out.requests = [...reqs.values()];
  if ((inc.plan && inc.plan.ts || 0) > (out.plan && out.plan.ts || 0)) out.plan = inc.plan;
  if ((inc.last && inc.last.ts || 0) > (out.last && out.last.ts || 0)) out.last = inc.last;
  return out;
}

/* ---- paczki synchronizacji: stan skompresowany, pocięty na kody QR ---- */
export const b64u = {
  enc: bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec: str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); return Uint8Array.from(s, c => c.charCodeAt(0)); }
};
async function gz(bytes, dir) {
  const S = dir === 'c' ? globalThis.CompressionStream : globalThis.DecompressionStream;
  const st = new S('gzip'); const w = st.writable.getWriter(); w.write(bytes); w.close();
  return new Uint8Array(await new Response(st.readable).arrayBuffer());
}
// do paczki trafia stan bez dużych i zbędnych pól
export function syncPayload(state) {
  const { cars, prog, book, requests, plan, last } = state;
  return { w: 1, cars, prog, book, requests, plan, last };
}
export async function encodeSync(state) {
  const raw = new TextEncoder().encode(JSON.stringify(syncPayload(state)));
  const can = typeof CompressionStream !== 'undefined';
  return (can ? 'g' : 'r') + b64u.enc(can ? await gz(raw, 'c') : raw);
}
export async function decodeSync(str) {
  const flag = str[0]; const bytes = b64u.dec(str.slice(1));
  const raw = flag === 'g' ? await gz(bytes, 'd') : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}
export function chunkSync(str, size = 1100) {
  const id = Math.random().toString(36).slice(2, 7); const n = Math.ceil(str.length / size);
  return Array.from({ length: n }, (_, i) => `${id}.${i + 1}.${n}.${str.slice(i * size, (i + 1) * size)}`);
}
// bufor odebranych części: { id, n, parts:{1:..} }; zwraca kompletną paczkę lub null
export function acceptChunk(buf, chunk) {
  const [id, i, n, ...rest] = chunk.split('.'); const data = rest.join('.');
  if (!id || !+i || !+n || !data) throw new Error('Nieprawidłowy kod synchronizacji.');
  const b = buf && buf.id === id ? buf : { id, n: +n, parts: {} };
  b.parts[+i] = data;
  const done = Object.keys(b.parts).length === b.n;
  return { buf: b, done, str: done ? Array.from({ length: b.n }, (_, k) => b.parts[k + 1]).join('') : null };
}
