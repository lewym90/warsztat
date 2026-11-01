import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css = fs.readFileSync('css/app.css', 'utf8');
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const vars = block => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m => [m[1], m[2]]));
const blockOf = sel => { const i = css.indexOf(sel + ' {'); assert.ok(i >= 0, sel); return css.slice(i, css.indexOf('}', i)); };
const sets = {
  'jasny': [vars(blockOf(':root')), [['text', 'bg'], ['text', 'surface'], ['muted', 'bg'], ['muted', 'surface'], ['accent', 'bg'], ['accent', 'surface']]],
  'ciemny': [vars(blockOf(':root[data-theme="dark"]')), [['text', 'bg'], ['text', 'surface'], ['muted', 'bg'], ['muted', 'surface'], ['accent', 'bg'], ['accent', 'surface']]],
  'talia jasna': [vars(blockOf('.dk')), [['ink', 'bg'], ['ink', 'surface'], ['muted', 'bg'], ['muted', 'surface'], ['gold', 'surface'], ['gold', 'bg'], ['on-gold', 'gold'], ['danger', 'dangerbg'], ['warnc', 'warnbg'], ['okc', 'okbg']]],
  'talia ciemna': [vars(blockOf(':root[data-theme="dark"] .dk')), [['ink', 'bg'], ['ink', 'surface'], ['muted', 'bg'], ['muted', 'surface'], ['gold', 'surface'], ['gold', 'bg'], ['on-gold', 'gold'], ['danger', 'dangerbg'], ['warnc', 'warnbg'], ['okc', 'okbg']]]
};
for (const [name, [v, pairs]] of Object.entries(sets)) {
  test(`kontrast WCAG AA (4.5:1) – ${name}`, () => {
    for (const [fg, bg] of pairs) { assert.ok(v[fg] && v[bg], `${fg}/${bg} zdefiniowane`); const r = ratio(v[fg], v[bg]); assert.ok(r >= 4.5, `${fg} na ${bg}: ${r.toFixed(2)}:1`); }
  });
}
test('wymagane style dostępności', () => {
  assert.match(css, /:focus-visible/); assert.match(css, /prefers-reduced-motion/); assert.match(css, /\.sr-only/);
});
