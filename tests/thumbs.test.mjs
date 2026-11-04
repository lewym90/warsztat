import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { thumbCell } from '../js/thumbs.js';
const reps = fs.readdirSync('data/packs/bmw-e53/repairs').map(f => JSON.parse(fs.readFileSync('data/packs/bmw-e53/repairs/' + f, 'utf8')));
test('każda część ma miniaturę', () => { for (const r of reps) for (const p of r.parts || []) assert.ok(thumbCell(p.name) >= 0, p.name); });
test('narzędzia mają miniaturę (poza narzędziem specjalnym BMW)', () => { for (const r of reps) for (const t of r.tools) if (!/^Narzędzie BMW/.test(t.name) && !/Narzędzie do spinek/.test(t.name)) assert.ok(thumbCell(t.name) >= 0, t.name); });
test('przypisania kluczowych pozycji', () => {
  assert.equal(thumbCell('Mechanizm klamki zewnętrznej, tył'), 2); assert.equal(thumbCell('Klipsy szyby'), 7); assert.equal(thumbCell('Tuleja (bush) klipsa szyby'), 8); assert.equal(thumbCell('Zapasowe klipsy uszczelki'), 14);
  assert.equal(thumbCell('Silnik podnośnika szyby (płaski)'), 10); assert.equal(thumbCell('Płaska łopatka metalowa lub wąski wkrętak'), 33); assert.equal(thumbCell('coś nieznanego'), -1);
});
