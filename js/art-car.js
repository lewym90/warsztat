// Własny szkic SUV-a w rzucie bocznym (przód auta po prawej), z klikalnymi strefami.
// To rysunek poglądowy, nie reprodukcja żadnego rysunku producenta.

export const ZONES = {
  door_rear:  { label: 'Drzwi tylne',      system: 'doors',   door: 'rear',  pin: [226, 214] },
  door_front: { label: 'Drzwi przednie',   system: 'doors',   door: 'front', pin: [452, 214] },
  engine:     { label: 'Silnik i przód',   system: 'engine',  pin: [670, 214] },
  wheels:     { label: 'Koła i zawieszenie', system: 'susp',  pin: [606, 258] },
  tail:       { label: 'Klapa i tył',      system: 'body',    pin: [86, 190] }
};

export function carSVG({ mini = false, pins = [], active = '' } = {}) {
  const z = (id, d, extra = '') =>
    `<path class="zone${active === id ? ' active' : ''}" data-zone="${id}" data-label="${ZONES[id].label}" d="${d}" ${extra}/>`;
  const pin = id => {
    if (!pins.includes(id)) return '';
    const [x, y] = ZONES[id].pin;
    return `<g class="pin" transform="translate(${x} ${y})"><circle class="pin-ring" r="16"/><circle class="pin-dot" r="5.5"/></g>`;
  };
  return `
<svg class="car-art${mini ? ' mini' : ''}" viewBox="0 0 800 340" role="img" aria-label="Szkic samochodu">
  <defs>
    <linearGradient id="cgBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2d3b4f"/><stop offset=".55" stop-color="#18202c"/><stop offset="1" stop-color="#0d1219"/>
    </linearGradient>
    <linearGradient id="cgGlass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5fb8ff" stop-opacity=".42"/><stop offset="1" stop-color="#1d3a5c" stop-opacity=".25"/>
    </linearGradient>
    <radialGradient id="cgLight" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#bfe6ff" stop-opacity=".9"/><stop offset="1" stop-color="#58b4ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cgLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#58b4ff" stop-opacity=".1"/><stop offset=".5" stop-color="#9ad3ff" stop-opacity=".9"/><stop offset="1" stop-color="#58b4ff" stop-opacity=".1"/>
    </linearGradient>
  </defs>

  <ellipse class="car-shadow" cx="410" cy="312" rx="350" ry="13"/>

  <g class="car-body">
    <path class="body" d="M60 258 L58 232 Q58 222 64 214 L92 124 Q96 106 114 102 L470 94 Q506 92 526 110 L592 168 L704 184 Q738 190 748 208 L756 238 Q758 260 744 260 L60 260 Z"/>
    <path class="body-shine" d="M120 108 L470 100 Q500 100 518 114 L580 168 L330 166 L112 170 Z"/>
    <!-- szyby -->
    <path class="glass" d="M100 168 L108 116 L322 111 L322 168 Z"/>
    <path class="glass" d="M338 110 L488 106 Q506 106 516 118 L562 168 L338 168 Z"/>
    <path class="pillar" d="M322 110 L338 109 L338 168 L322 168 Z"/>
    <!-- szczeliny drzwi -->
    <path class="seam" d="M336 168 L336 250 M118 170 L120 250 M566 170 L570 250"/>
    <path class="seam soft" d="M338 250 L570 250 M120 250 L334 250"/>
    <!-- klamki, lusterko, relingi -->
    <rect class="handle" x="350" y="186" width="38" height="6" rx="3"/>
    <rect class="handle" x="132" y="186" width="34" height="6" rx="3"/>
    <path class="mirror" d="M552 164 Q566 158 574 166 L570 176 Q558 178 552 172 Z"/>
    <path class="rail" d="M128 94 L462 87"/>
    <!-- linia charakterystyczna -->
    <path class="character" d="M122 206 Q330 200 590 208 L700 214"/>
    <!-- przód -->
    <path class="lamp" d="M704 186 L742 196 Q748 202 748 212 L710 206 Z"/>
    <circle class="lamp-glow" cx="728" cy="198" r="26"/>
    <path class="grille" d="M742 218 L750 222 L752 236 L742 234 Z M726 216 L736 218 L738 232 L728 230 Z"/>
    <path class="bumper" d="M690 244 L752 244 M62 244 L120 244"/>
    <path class="tail-lamp" d="M60 128 L70 124 L66 168 L60 170 Z"/>
    <!-- progi -->
    <path class="sill" d="M236 262 L520 262"/>
  </g>

  <g class="wheels-g">
    <circle class="arch" cx="210" cy="258" r="62"/>
    <circle class="arch" cx="606" cy="258" r="62"/>
    <g class="wheel" transform="translate(210 258)">
      <circle class="tyre" r="52"/><circle class="rim" r="36"/>
      <g class="spokes"><path d="M0 -36V36M-36 0H36M-25 -25L25 25M-25 25L25 -25"/></g><circle class="hub" r="8"/>
    </g>
    <g class="wheel" transform="translate(606 258)">
      <circle class="tyre" r="52"/><circle class="rim" r="36"/>
      <g class="spokes"><path d="M0 -36V36M-36 0H36M-25 -25L25 25M-25 25L25 -25"/></g><circle class="hub" r="8"/>
    </g>
  </g>

  <path class="outline" d="M60 258 L58 232 Q58 222 64 214 L92 124 Q96 106 114 102 L470 94 Q506 92 526 110 L592 168 L704 184 Q738 190 748 208 L756 238 Q758 260 744 260 L60 260 Z" pathLength="1"/>

  <g class="zones">
    ${z('tail', 'M58 234 L64 214 L92 124 Q96 108 112 108 L118 252 L58 252 Z')}
    ${z('door_rear', 'M112 112 L334 109 L336 252 L120 252 Z')}
    ${z('door_front', 'M338 109 L488 105 Q506 105 516 117 L568 172 L570 252 L338 252 Z')}
    ${z('engine', 'M594 170 L704 186 Q736 192 746 208 L754 238 Q756 256 742 256 L600 256 Z')}
    ${z('wheels', 'M158 258 a52 52 0 1 0 104 0 a52 52 0 1 0 -104 0 M554 258 a52 52 0 1 0 104 0 a52 52 0 1 0 -104 0', 'fill-rule="evenodd"')}
  </g>
  ${pins.map(pin).join('')}
</svg>`;
}
