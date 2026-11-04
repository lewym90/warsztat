// Miniatury części i narzędzi: plansza 8×8 img/czesci.webp (kolejność pól: docs/projekt-graficzny/PLANSZE.md).
// To ilustracje poglądowe, nie zdjęcia konkretnych części.
const RULES = [
  [/tuleja/i, 8], [/klamk\w* wewn|zamiennik uro/i, 0], [/mechanizm klamki/i, 2], [/klamka zewn/i, 1],
  [/klips\w* listwy|klipsy uszczelki/i, 14], [/klips\w* szyby/i, 7], [/spink/i, 3],
  [/szkło lusterka/i, 4], [/lusterko/i, 5], [/silnik podno/i, 10], [/podnośnik szyby/i, 6],
  [/folia|pasta uszcz/i, 9], [/śruba sześciok/i, 11], [/siłownik zamka/i, 12],
  [/uszczelka szczeliny/i, 16], [/listwa szczeliny/i, 17], [/uszczelka drzwi/i, 13], [/listwa progowa/i, 15],
  [/kształcie litery u/i, 26], [/plastikowe łopatki/i, 18], [/łopatk\w* metal|metalowa łopatka/i, 33],
  [/szerokie płaskie/i, 29], [/torx/i, 19], [/klucz nasadowy|klucz 8 mm/i, 20], [/taśma/i, 21],
  [/opaska/i, 24], [/szczypce/i, 32], [/magnes/i, 28], [/śrubokręt|wkrętak/i, 22], [/sznurek/i, 23],
  [/ostrze|nóż/i, 25], [/imbus/i, 27], [/ścierecz|szmat|ręcznik/i, 30], [/multimetr/i, 31],
  [/młotek/i, 34], [/mydłem/i, 35], [/terpentyn/i, 36]
];
export function thumbCell(name) { const r = RULES.find(([re]) => re.test(name || '')); return r ? r[1] : -1; }
export function thumb(name) {
  const n = thumbCell(name);
  if (n < 0) return '';
  const pos = c => (c * 100 / 7).toFixed(3) + '%';
  return `<span class="th" role="img" aria-label="Ilustracja poglądowa" style="background-position:${pos(n % 8)} ${pos(Math.floor(n / 8))}"></span>`;
}
export const THUMB_NOTE = 'Miniatury to ilustracje poglądowe, nie zdjęcia tej konkretnej części. Przy zakupie liczy się numer części.';
