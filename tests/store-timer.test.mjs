import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage } from './helpers.mjs';
fakeStorage();
const S = await import('../js/store.js');
const { suggestMinutes, fmtClock } = await import('../js/timer-core.js');
const { backupDue, hasUserData } = await import('../js/backup.js');

test('store: stary zapis dostaje nowe pola', () => {
  const n = S.normalize({ cars: [], prog: {} });
  assert.deepEqual(n.book, []); assert.equal(n.prefs.theme, 'dark'); assert.equal(n.plan.ids.length, 0); assert.equal(n.backup.lastExport, 0);
});
test('store: notatki zapisują się i kasują pustym tekstem', () => {
  S.init(); const c = S.cars()[0].id;
  S.setNote(c, 'r1', 3, 'śruba z lewej'); assert.equal(S.noteOf(c, 'r1', 3), 'śruba z lewej');
  S.setNote(c, 'r1', 3, '  '); assert.equal(S.noteOf(c, 'r1', 3), '');
});
test('store: plan przełącza naprawy i zeruje się przy zmianie auta', () => {
  S.togglePlan('a', 'c1'); S.togglePlan('b', 'c1'); assert.deepEqual(S.getPlan().ids, ['a', 'b']);
  S.togglePlan('a', 'c1'); assert.deepEqual(S.getPlan().ids, ['b']);
  S.togglePlan('x', 'c2'); assert.deepEqual(S.getPlan().ids, ['x']);
});
test('store: wpis w książce aktualizuje przebieg auta', () => {
  const c = S.cars()[0]; S.addEntry({ carId: c.id, title: 'Test', date: '2026-11-01', km: 250000, cost: 10 });
  assert.equal(S.car(c.id).km, 250000); assert.equal(S.bookEntries(c.id).length, 1);
});
test('store: ustawienia zapisują się w localStorage', () => {
  S.setPref('theme', 'dark'); assert.equal(JSON.parse(localStorage.getItem('warsztat.v1')).prefs.theme, 'dark');
});
test('minutnik: podpowiedź czasu z opisu kroku', () => {
  assert.equal(suggestMinutes(['Odłącz akumulator i odczekaj co najmniej 30 minut.']), 30);
  assert.equal(suggestMinutes(['Poczekaj 10 min aż klej zwiąże']), 10);
  assert.equal(suggestMinutes(['Zdejmij boczek']), null);
  assert.equal(fmtClock(90000), '1:30'); assert.equal(fmtClock(3661000), '1:01:01'); assert.equal(fmtClock(-5), '0:00');
});
test('minutnik: wykrywa czas w prawdziwych naprawach', async () => {
  const { repairs } = await import('./helpers.mjs');
  const hit = repairs().some(r => r.steps.some(s => suggestMinutes([s.b, ...(s.how || []), s.check, s.tip, typeof s.danger === 'string' ? s.danger : '']) === 30));
  assert.ok(hit, 'krok z odczekaniem 30 minut dostaje minutnik');
});
test('kopia: przypomnienie raz w tygodniu, tylko gdy są dane', () => {
  const day = 86400000, now = 100 * day;
  const st = { prog: {}, book: [], backup: { lastExport: 0, remindedAt: 0 } };
  assert.equal(backupDue(now, st), false, 'brak danych = brak przypomnienia');
  st.book = [{ id: 'e' }]; assert.ok(hasUserData(st));
  assert.equal(backupDue(now, st), true);
  st.backup.lastExport = now - 2 * day; assert.equal(backupDue(now, st), false);
  st.backup.lastExport = now - 8 * day; st.backup.remindedAt = now - 1000; assert.equal(backupDue(now, st), false, 'nie częściej niż raz na dobę');
});
