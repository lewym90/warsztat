import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeStates, chunkSync, acceptChunk, encodeSync, decodeSync, b64u } from '../js/merge.js';

const base = () => ({ cars: [{ id: 'a', make: 'BMW', u: 1 }], prog: {}, book: [], requests: [], plan: { ids: [], carId: null, ts: 0 }, last: null });

test('łączenie: suma aut, nowszy zapis wygrywa', () => {
  const l = base(), i = base();
  i.cars[0] = { id: 'a', make: 'BMW X5', u: 5 }; i.cars.push({ id: 'b', make: 'Audi', u: 2 });
  const m = mergeStates(l, i);
  assert.equal(m.cars.length, 2);
  assert.equal(m.cars.find(c => c.id === 'a').make, 'BMW X5');
  const old = mergeStates(i, l);
  assert.equal(old.cars.find(c => c.id === 'a').make, 'BMW X5', 'starszy zapis nie nadpisuje nowszego');
});
test('łączenie: notatki per krok, nic nie ginie', () => {
  const l = base(), i = base();
  l.prog['a:x'] = { u: 5, steps: {}, notes: { 1: { t: 'lokalna', u: 10 }, 2: { t: 'tylko lokalna', u: 1 } }, tools: { 0: true } };
  i.prog['a:x'] = { u: 9, steps: {}, notes: { 1: { t: 'zdalna nowsza', u: 20 }, 3: { t: 'zdalna', u: 2 } }, tools: { 1: true } };
  const p = mergeStates(l, i).prog['a:x'];
  assert.equal(p.notes[1].t, 'zdalna nowsza'); assert.equal(p.notes[2].t, 'tylko lokalna'); assert.equal(p.notes[3].t, 'zdalna');
  assert.deepEqual(p.tools, { 0: true, 1: true });
});
test('łączenie: książka serwisowa po id', () => {
  const l = base(), i = base();
  l.book = [{ id: 'e1', title: 'A', u: 1 }]; i.book = [{ id: 'e1', title: 'A2', u: 3 }, { id: 'e2', title: 'B', u: 1 }];
  const m = mergeStates(l, i);
  assert.equal(m.book.length, 2); assert.equal(m.book.find(e => e.id === 'e1').title, 'A2');
});
test('base64url w obie strony', () => {
  const bytes = Uint8Array.from({ length: 300 }, (_, k) => (k * 37) % 256);
  assert.deepEqual([...b64u.dec(b64u.enc(bytes))], [...bytes]);
});
test('synchronizacja QR: kodowanie, cięcie na części i odbiór w dowolnej kolejności', async () => {
  const st = base(); st.cars.push(...Array.from({ length: 40 }, (_, k) => ({ id: 'c' + k, make: 'Marka ' + k, model: 'Model', u: k })));
  const enc = await encodeSync(st);
  const chunks = chunkSync(enc, 300);
  assert.ok(chunks.length > 1);
  let buf = null, res;
  for (const c of [...chunks].reverse()) { res = acceptChunk(buf, c); buf = res.buf; }
  assert.ok(res.done);
  const back = await decodeSync(res.str);
  assert.equal(back.cars.length, 41);
});
test('nieprawidłowy kod synchronizacji', () => { assert.throws(() => acceptChunk(null, 'abc')); });
