// Rysunek BMW X5 (E53) w rzucie bocznym, przód po prawej. Proporcje oparte na danych fabrycznych
// (długość 4667 mm, rozstaw osi 2820 mm, wysokość 1707 mm, opony 255/55 R18; skala 0,2 px/mm).
// Rysunek własny i poglądowy; nie jest reprodukcją materiałów producenta.

export const ZONES = {
  door_rear:  { label: 'Drzwi tylne',        system: 'doors', door: 'rear',  pin: [418, 206] },
  door_front: { label: 'Drzwi przednie',     system: 'doors', door: 'front', pin: [610, 206] },
  engine:     { label: 'Silnik i przód',     system: 'engine', pin: [858, 214] },
  wheels:     { label: 'Koła i zawieszenie', system: 'susp',  pin: [786, 298] },
  tail:       { label: 'Klapa i tył',        system: 'body',  pin: [92, 196] }
};

const BODY = 'M40 322 L36 270 Q33 240 40 208 L54 128 L98 60 Q106 47 138 42 Q320 33 520 30 Q612 29 664 38 L726 152 L896 168 Q948 174 962 192 L970 232 Q975 270 969 300 Q966 322 946 324 L60 326 Q41 326 40 322 Z';
const CLAD = 'M37 296 L969 296 Q969 312 966 318 Q962 324 946 324 L60 326 Q41 326 40 322 Z';

function spokes(n = 5, r0 = 15, r1 = 50, w0 = 7, w1 = 11) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i * 360 / n - 90) * Math.PI / 180, p = (r, w, s) => `${(r * Math.cos(a) - s * w * Math.sin(a)).toFixed(1)} ${(r * Math.sin(a) + s * w * Math.cos(a)).toFixed(1)}`;
    d += `M${p(r0, w0, -1)} L${p(r1, w1, -1)} L${p(r1, w1, 1)} L${p(r0, w0, 1)} Z `;
  }
  return d;
}

function wheel(x) {
  return `<g class="wheel" transform="translate(${x} 298)">
    <circle class="tyre" r="74"/><circle class="tyre-wall" r="66"/><circle class="rimbarrel" r="54"/>
    <circle class="disc" r="44"/><path class="caliper" d="M14 -42 A44 44 0 0 1 40 -18 L30 -12 A33 33 0 0 0 11 -31 Z"/>
    <g class="spokes"><path class="spoke" d="${spokes()}"/></g>
    <circle class="rim" r="54"/><circle class="hub" r="15"/><circle class="hubcap" r="8"/>
  </g>`;
}

export const PHOTOS = { 'bmw-e53': 'img/x5-e53.webp' };

// Strefy dla zdjęcia (układ 1050×500, auto wycięte z tła, przód po prawej)
const PZ = {
  tail:       'M18 160 L80 62 L236 38 L238 332 L18 332 Z',
  door_rear:  'M240 42 L448 38 L472 318 L236 318 L222 150 Z',
  door_front: 'M452 40 L650 40 L738 150 L738 322 L472 322 Z',
  engine:     'M740 150 L1010 192 L1034 270 L1030 362 L740 362 Z',
  wheels:     'M128 335 a92 92 0 1 0 184 0 a92 92 0 1 0 -184 0 M778 335 a92 92 0 1 0 184 0 a92 92 0 1 0 -184 0'
};
const PPIN = { door_rear: [273, 165], door_front: [505, 177], engine: [880, 190], wheels: [870, 335], tail: [96, 200] };

function photoSVG({ mini, pins, active, photo }) {
  const z = id => `<path class="zone${active === id ? ' active' : ''}" data-zone="${id}" data-label="${ZONES[id].label}" d="${PZ[id]}"${id === 'wheels' ? ' fill-rule="evenodd"' : ''}/>`;
  const pin = id => {
    if (!pins.includes(id)) return '';
    const [x, y] = PPIN[id];
    return `<g class="pin" transform="translate(${x} ${y})"><circle class="pin-ring" r="22"/><circle class="pin-dot" r="7"/></g>`;
  };
  return `
<svg class="car-art car-photo${mini ? ' mini' : ''}" viewBox="0 0 1050 500" role="img" aria-label="BMW X5 E53, widok z boku">
  <defs>
    <linearGradient id="cpFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="cpMask" maskUnits="userSpaceOnUse" x="0" y="417" width="1050" height="83"><rect x="0" y="417" width="1050" height="83" fill="url(#cpFade)"/></mask>
    <radialGradient id="cpFloor" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#d9b878" stop-opacity=".22"/><stop offset="1" stop-color="#d9b878" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="525" cy="424" rx="520" ry="34" fill="url(#cpFloor)"/>
  <ellipse class="car-shadow" cx="525" cy="420" rx="440" ry="9"/>
  <g mask="url(#cpMask)"><image href="${photo}" x="0" y="0" width="1050" height="430" transform="translate(0 834) scale(1 -1)" preserveAspectRatio="none"/></g>
  <image class="photo" href="${photo}" x="0" y="0" width="1050" height="430" preserveAspectRatio="none"/>
  <g class="zones">${['tail', 'door_rear', 'door_front', 'engine', 'wheels'].map(z).join('')}</g>
  ${pins.map(pin).join('')}
</svg>`;
}

export function carSVG({ mini = false, pins = [], active = '', photo = '' } = {}) {
  if (photo) return photoSVG({ mini, pins, active, photo });
  const z = (id, d, extra = '') =>
    `<path class="zone${active === id ? ' active' : ''}" data-zone="${id}" data-label="${ZONES[id].label}" d="${d}" ${extra}/>`;
  const pin = id => {
    if (!pins.includes(id)) return '';
    const [x, y] = ZONES[id].pin;
    return `<g class="pin" transform="translate(${x} ${y})"><circle class="pin-ring" r="20"/><circle class="pin-dot" r="6.5"/></g>`;
  };
  return `
<svg class="car-art${mini ? ' mini' : ''}" viewBox="0 0 1000 400" role="img" aria-label="BMW X5 E53, widok z boku">
  <defs>
    <linearGradient id="cgBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a7adb6"/><stop offset=".14" stop-color="#7a818b"/><stop offset=".48" stop-color="#4a5059"/><stop offset=".8" stop-color="#23262b"/><stop offset="1" stop-color="#0f1114"/>
    </linearGradient>
    <linearGradient id="cgGlass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8aa0bd" stop-opacity=".8"/><stop offset=".5" stop-color="#1b2431" stop-opacity=".93"/><stop offset="1" stop-color="#0a0d12" stop-opacity=".96"/>
    </linearGradient>
    <linearGradient id="cgShine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".17"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="cgLight" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff3d2" stop-opacity=".95"/><stop offset="1" stop-color="#d9b878" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cgDisc" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#444240"/><stop offset="1" stop-color="#1a1816"/>
    </radialGradient>
    <linearGradient id="cgLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d9b878" stop-opacity=".1"/><stop offset=".5" stop-color="#f1deb0" stop-opacity=".95"/><stop offset="1" stop-color="#d9b878" stop-opacity=".1"/>
    </linearGradient>
    <linearGradient id="cgRim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e6e9ee"/><stop offset=".5" stop-color="#8d97a5"/><stop offset="1" stop-color="#555351"/>
    </linearGradient>
  </defs>

  <ellipse class="car-shadow" cx="500" cy="376" rx="470" ry="12"/>

  <g class="car-body">
    <!-- relingi dachowe -->
    <path class="rail" d="M160 26 L636 24"/><path class="rail-post" d="M170 26 V35 M620 24 V34"/>
    <path class="body" d="${BODY}"/>
    <path class="cladding" d="${CLAD}"/>
    <path class="body-shine" d="M56 192 Q300 178 520 182 L716 188 Q800 192 890 208 L890 216 Q800 204 716 198 L520 192 Q300 188 54 204 Z"/>
    <path class="roofline" d="M116 52 Q132 42 166 40 Q320 33 520 30 Q612 29 660 38"/>

    <!-- szyby -->
    <path class="glass" d="M514 56 L664 43 L709 146 L514 146 Z"/>
    <path class="glass" d="M498 54 L350 57 Q338 59 334 72 L326 142 L498 147 Z"/>
    <path class="glass" d="M314 61 L146 58 Q124 60 114 80 L86 134 L314 141 Z"/>
    <path class="pillar" d="M498 56 L514 56 L514 146 L498 146 Z M312 60 L331 60 L328 146 L312 146 Z"/>
    <path class="glass-shine" d="M540 58 L600 52 L574 146 L530 146 Z M392 60 L440 59 L420 146 L380 146 Z"/>
    <path class="trim" d="M84 136 L330 142 L498 147 L712 150"/>

    <!-- szczeliny i przetłoczenia -->
    <path class="seam" d="M712 152 L706 316 M507 150 L507 318 M328 150 L324 318"/>
    <path class="seam soft" d="M104 64 L72 266 M726 152 L894 170 Q946 176 960 194"/>
    <path class="character" d="M58 196 Q300 184 520 188 L704 194 Q800 198 884 212"/>
    <path class="character low" d="M140 270 L318 270 M340 276 L700 276"/>

    <!-- klamki, lusterko -->
    <rect class="handle" x="636" y="172" width="46" height="7" rx="3.5"/>
    <rect class="handle" x="432" y="172" width="46" height="7" rx="3.5"/>
    <path class="mirror" d="M716 150 Q738 138 754 146 L752 166 Q736 172 718 166 Z"/>

    <!-- przód -->
    <path class="lamp" d="M896 170 Q946 176 958 192 L962 210 Q928 206 896 197 Z"/>
    <circle class="lamp-glow" cx="934" cy="192" r="34"/>
    <path class="grille" d="M946 236 L968 238 L968 266 L946 262 Z"/>
    <ellipse class="fog" cx="946" cy="284" rx="9" ry="6"/>
    <path class="bumper" d="M900 266 L968 268"/>

    <!-- tył -->
    <path class="tail-lamp" d="M55 122 L70 124 L60 208 L42 208 Z"/>
    <path class="bumper" d="M38 252 L104 254"/>
    <path class="sill" d="M338 300 L698 300"/>
  </g>

  <g class="wheels-g">
    <circle class="archlip" cx="222" cy="298" r="94"/><circle class="arch" cx="222" cy="298" r="88"/>
    <circle class="archlip" cx="786" cy="298" r="94"/><circle class="arch" cx="786" cy="298" r="88"/>
    ${wheel(222)}
    ${wheel(786)}
  </g>

  <path class="outline" d="${BODY}" pathLength="1"/>

  <g class="zones">
    ${z('tail', 'M40 322 L36 270 Q33 240 40 208 L54 128 L100 54 Q106 40 126 37 L326 36 L326 322 Z')}
    ${z('door_rear', 'M330 58 L508 56 L508 322 L330 322 Z')}
    ${z('door_front', 'M512 54 L664 41 L716 152 L710 322 L512 322 Z')}
    ${z('engine', 'M724 152 L896 168 Q948 174 962 192 L970 232 Q975 270 969 300 Q966 322 946 324 L880 324 L880 160 Z')}
    ${z('wheels', 'M134 298 a88 88 0 1 0 176 0 a88 88 0 1 0 -176 0 M698 298 a88 88 0 1 0 176 0 a88 88 0 1 0 -176 0', 'fill-rule="evenodd"')}
  </g>
  ${pins.map(pin).join('')}
</svg>`;
}
