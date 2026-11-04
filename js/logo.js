// Znak WARSZTAT: zębatka połączona z kluczem (rysowany lokalnie, ostry w każdym rozmiarze).
const teeth = Array.from({ length: 8 }, (_, i) => `<rect x="44" y="9" width="12" height="17" rx="2.5" transform="rotate(${i * 45} 50 50)"/>`).join('');
export const logoMark = (size = 64) => `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Warsztat"><defs>
<linearGradient id="lgGear" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd4ff"/><stop offset=".5" stop-color="#2a97ff"/><stop offset="1" stop-color="#0e5fc4"/></linearGradient>
<linearGradient id="lgKey" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#a9d8ff"/></linearGradient></defs>
<g fill="url(#lgGear)">${teeth}<path fill-rule="evenodd" d="M50 18a32 32 0 1 0 0 64 32 32 0 0 0 0-64zm0 15a17 17 0 1 1 0 34 17 17 0 0 1 0-34z"/></g>
<path fill="url(#lgKey)" stroke="#081321" stroke-width="2.4" stroke-linejoin="round" d="M71 21.5a15 15 0 0 0-19.6 19.6L25.2 67.3a7 7 0 1 0 9.9 9.9L61.3 51a15 15 0 0 0 19.6-19.6L71.6 40.7l-8-2.2-2.2-8z"/></svg>`;
