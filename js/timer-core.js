// Czyste funkcje minutnika (bez DOM), testowane osobno.
export const fmtClock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
// z tekstu kroku wyciąga czas oczekiwania, np. „odczekaj co najmniej 30 minut” → 30
export function suggestMinutes(texts) {
  for (const s of texts || []) { const m = String(s).match(/(?:odczekaj|poczekaj|odstaw|zostaw|odczekanie)[^.]{0,60}?(\d{1,3})\s*(?:min|minut)/i); if (m) return +m[1]; }
  for (const s of texts || []) { const m = String(s).match(/(\d{1,3})\s*minut/i); if (m && +m[1] >= 5) return +m[1]; }
  return null;
}

