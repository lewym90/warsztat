// Plan „Dzisiaj robię”: łączy części i narzędzia z kilku napraw w jedną listę bez powtórzeń (czyste funkcje, bez DOM).
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/\s+/g, ' ').trim();
const NEED = { must: 3, should: 2, opt: 1 };

// repairs: [{id,title,parts[],tools[],steps[]}] → { parts, tools, titles }
export function aggregatePlan(repairs) {
  const parts = new Map(), tools = new Map();
  for (const r of repairs) {
    for (const p of r.parts || []) {
      const key = p.oe ? 'oe:' + p.oe : 'n:' + norm(p.name);
      const e = parts.get(key) || { key, name: p.name, oe: p.oe || '', note: p.note || '', price: p.price || '', conf: p.conf, from: [] };
      if (!e.from.includes(r.title)) e.from.push(r.title);
      parts.set(key, e);
    }
    for (const t of r.tools || []) {
      const key = norm(t.name);
      const e = tools.get(key) || { key, name: t.name, note: t.note || '', need: t.need, from: [] };
      if ((NEED[t.need] || 0) > (NEED[e.need] || 0)) e.need = t.need;
      if (!e.note && t.note) e.note = t.note;
      if (!e.from.includes(r.title)) e.from.push(r.title);
      tools.set(key, e);
    }
  }
  const byNeed = (a, b) => (NEED[b.need] || 0) - (NEED[a.need] || 0) || a.name.localeCompare(b.name, 'pl');
  return { parts: [...parts.values()].sort((a, b) => b.from.length - a.from.length || a.name.localeCompare(b.name, 'pl')), tools: [...tools.values()].sort(byNeed), titles: repairs.map(r => r.title) };
}

// Wspólna faza „zdejmowanie boczka” występuje w wielu naprawach drzwi: podpowiedź kolejności, żeby nie zdejmować boczka dwa razy.
export function orderHint(repairs) {
  const hasBoczek = r => (r.steps || []).some(s => /boczk/i.test(s.phase || '') || /boczk/i.test(s.t || ''));
  const withB = repairs.filter(hasBoczek);
  if (withB.length < 2) return '';
  return `Naprawy: ${withB.map(r => '„' + r.title + '”').join(', ')} wymagają zdjęcia boczka drzwi. Jeśli dotyczą tych samych drzwi, zdejmij boczek raz, zrób wszystkie prace w środku i dopiero potem złóż drzwi.`;
}

export function planText(title, agg) {
  return [title, '', 'NAPRAWY:', ...agg.titles.map(t => '- ' + t), '', 'CZĘŚCI:', ...agg.parts.map(p => `- ${p.name}${p.oe ? ' [' + p.oe + ']' : ' [numer do potwierdzenia]'}${p.from.length > 1 ? ' (x' + p.from.length + ' naprawy)' : ''}`), '', 'NARZĘDZIA:', ...agg.tools.map(t => `- ${t.name}${t.note ? ' (' + t.note + ')' : ''}`)].join('\n');
}
