// Wyszukiwarka globalna: indeks napraw (tytuły, kroki, części, numery OE, narzędzia). Czyste funkcje.
export const normText = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

// repairs: [{id,title,steps[],parts[],tools[]}] → lista wpisów { kind, rid, step, title, text, hay }
export function buildIndex(repairs) {
  const out = [];
  for (const r of repairs) {
    out.push({ kind: 'naprawa', rid: r.id, step: null, title: r.title, text: r.subtitle || '', hay: normText([r.title, r.subtitle, r.summary].join(' ')) });
    (r.steps || []).forEach((s, i) => out.push({ kind: 'krok', rid: r.id, step: i, title: s.t, text: `${r.title} · krok ${i + 1}`, hay: normText([s.t, s.b, ...(s.how || []), s.see, s.tip, s.check, ...(s.tools || []), s.phase].join(' ')) }));
    for (const p of r.parts || []) out.push({ kind: 'część', rid: r.id, step: null, title: p.name, text: `${p.oe || 'numer do potwierdzenia'} · ${r.title}`, hay: normText([p.name, p.oe, p.note, ...(p.alt || []).map(a => a.brand + ' ' + a.no)].join(' ')) });
    for (const t of r.tools || []) out.push({ kind: 'narzędzie', rid: r.id, step: null, title: t.name, text: `${t.note || ''} · ${r.title}`, hay: normText([t.name, t.note].join(' ')) });
  }
  return out;
}
const KIND_W = { naprawa: 0, część: 1, narzędzie: 2, krok: 3 };
// wszystkie słowa zapytania muszą wystąpić (kolejność dowolna); numery OE znajdujemy także ze spacjami
export function search(index, query, limit = 40) {
  const q = normText(query).replace(/(\d)\s+(?=\d)/g, '$1').trim();
  if (q.length < 2) return [];
  // polska fleksja: „boczek” ma znaleźć też „boczka”, więc dłuższe słowa porównujemy po rdzeniu (numery bez zmian)
  const stem = w => /\d/.test(w) || w.length < 5 ? w : w.slice(0, w.length >= 6 ? w.length - 2 : w.length - 1);
  const words = q.split(/\s+/).map(stem);
  const res = [];
  for (const e of index) {
    const hay = e.hay.replace(/(\d)\s+(?=\d)/g, '$1');
    if (!words.every(w => hay.includes(w))) continue;
    const inTitle = words.every(w => normText(e.title).includes(w));
    res.push({ ...e, score: (inTitle ? 0 : 10) + KIND_W[e.kind] });
  }
  return res.sort((a, b) => a.score - b.score).slice(0, limit);
}
