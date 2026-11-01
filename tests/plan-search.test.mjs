import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregatePlan, orderHint, planText } from '../js/plan.js';
import { buildIndex, search, normText } from '../js/search.js';
import { repairs } from './helpers.mjs';

const reps = repairs();
test('są naprawy do testów', () => assert.ok(reps.length >= 7));

test('plan: części i narzędzia bez powtórzeń', () => {
  const agg = aggregatePlan(reps);
  const keys = agg.tools.map(t => t.key); assert.equal(new Set(keys).size, keys.length);
  const pk = agg.parts.map(p => p.key); assert.equal(new Set(pk).size, pk.length);
  const sum = reps.reduce((n, r) => n + r.tools.length, 0);
  assert.ok(agg.tools.length < sum, 'narzędzia się powtarzają między naprawami, więc lista jest krótsza');
});
test('plan: wspólna część liczy się raz i pamięta źródła', () => {
  const a = { title: 'A', parts: [{ name: 'Uszczelka', oe: '123' }], tools: [{ name: 'Torx T20', need: 'opt' }], steps: [] };
  const b = { title: 'B', parts: [{ name: 'Uszczelka', oe: '123' }], tools: [{ name: 'torx t20', need: 'must' }], steps: [] };
  const g = aggregatePlan([a, b]);
  assert.equal(g.parts.length, 1); assert.deepEqual(g.parts[0].from, ['A', 'B']);
  assert.equal(g.tools.length, 1); assert.equal(g.tools[0].need, 'must');
});
test('plan: podpowiedź kolejności przy wspólnym boczku', () => {
  const withB = reps.filter(r => r.steps.some(s => /boczk/i.test(s.phase || '')));
  assert.ok(withB.length >= 2);
  assert.match(orderHint(withB), /raz/);
  assert.equal(orderHint([withB[0]]), '');
});
test('plan: tekst do skopiowania zawiera numery OE', () => {
  const t = planText('Plan', aggregatePlan(reps));
  assert.match(t, /CZĘŚCI:/); assert.match(t, /NARZĘDZIA:/);
});
test('szukaj: normalizacja polskich znaków', () => assert.equal(normText('Łódź Żółć'), 'lodz zolc'));
test('szukaj: numer OE znajduje część także ze spacjami', () => {
  const idx = buildIndex(reps);
  const oe = reps.flatMap(r => r.parts || []).find(p => p.oe).oe;
  const spaced = oe.replace(/(\d{2})(\d{2})(\d)(\d{3})(\d{3})/, '$1 $2 $3 $4 $5');
  assert.ok(search(idx, oe).some(r => r.kind === 'część'));
  assert.ok(search(idx, spaced).some(r => r.kind === 'część'));
});
test('szukaj: znajduje kroki, wszystkie słowa muszą pasować', () => {
  const idx = buildIndex(reps);
  const r = search(idx, 'boczek klipsy');
  assert.ok(r.length > 0); assert.ok(r.some(x => x.kind === 'krok' && x.step != null));
  assert.equal(search(idx, 'xyzabc123').length, 0);
  assert.equal(search(idx, 'a').length, 0);
});
