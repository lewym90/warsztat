// Schematyczny rysunek drzwi (lewe przednie, widok z wnętrza: przód auta po prawej).
// Cztery warstwy: outer (z zewnątrz), card (boczek), inner (po zdjęciu boczka), edge (krawędź zamka).
// Położenie elementów jest orientacyjne i służy do wskazania, „gdzie szukać”.

export const VIEW_LABELS = {
  outer: 'Z zewnątrz',
  card: 'Wnętrze: boczek',
  inner: 'Środek drzwi (boczek zdjęty)',
  edge: 'Krawędź drzwi (strona zamka)'
};

export const ANCHORS = {
  // boczek
  'card.switch': [352, 230], 'card.handle': [292, 208], 'card.puddle': [300, 478],
  'card.trim': [216, 184], 'card.screw_map': [150, 336], 'card.screw_handle': [262, 230],
  'card.screw_trim': [54, 186], 'card.screw_grommet': [150, 290], 'card.speaker': [338, 396],
  'card.clip_a': [60, 440], 'card.clip_b': [210, 488], 'card.clip_c': [372, 440], 'card.clip_d': [374, 300],
  'card.top_clips': [210, 162], 'card.pull': [170, 238], 'card.led': [292, 224],
  // środek drzwi
  'inner.foam': [210, 340], 'inner.airbag': [230, 222], 'inner.int_carrier': [292, 208],
  'inner.carrier': [100, 214], 'inner.handle_nut': [128, 236], 'inner.collar': [118, 262],
  'inner.ball': [98, 284], 'inner.actuator': [76, 330], 'inner.harness': [78, 384],
  'inner.bowden': [190, 262], 'inner.indicator': [56, 190], 'inner.regulator': [230, 410],
  // krawędź
  'edge.plug': [210, 214], 'edge.latch': [210, 320], 'edge.seal': [170, 420],
  // z zewnątrz
  'outer.handle': [286, 214], 'outer.keyhole': [364, 218], 'outer.mirror': [28, 170],
  'outer.glass': [210, 100], 'outer.rubber': [244, 232]
};

// Zdjęcia drzwi z rzeczywistego auta (widok z zewnątrz) i położenie elementów na zdjęciu (układ 430x520).
export const DOOR_PHOTOS = {
  'bmw-e53': {
    front: { src: 'img/doors/e53-front.webp', alt: 'Lewe przednie drzwi BMW X5 E53 z zewnątrz', anchors: { 'outer.handle': [348, 248], 'outer.keyhole': [396, 252], 'outer.mirror': [121, 188], 'outer.glass': [220, 110], 'outer.rubber': [372, 270] } },
    rear: { src: 'img/doors/e53-rear.webp', alt: 'Lewe tylne drzwi BMW X5 E53 z zewnątrz', anchors: { 'outer.handle': [300, 234], 'outer.glass': [200, 100], 'outer.rubber': [326, 256] } }
  }
};
let PHOTO = null;
export function setDoorPhoto(p) { PHOTO = p || null; }
export function anchorOf(a) { return (PHOTO && PHOTO.anchors && PHOTO.anchors[a]) || ANCHORS[a]; }

export function viewOf(anchor) { return anchor.split('.')[0]; }

const OUT = 'M26 498 L26 66 Q26 42 50 42 L318 42 Q336 42 346 58 L396 150 Q404 164 404 182 L404 476 Q404 498 382 498 Z';
const GLASS = 'M46 62 L312 62 L364 152 L46 152 Z';

function hsLayer(list = []) {
  return `<g class="hs-layer">${list.map(h => {
    const [x, y] = anchorOf(h.anchor) || [0, 0];
    return `<g class="hs ${h.state || ''}" data-hs="${h.id}" data-label="${h.label || ''}" transform="translate(${x} ${y})">
      <circle class="hs-hit" r="26"/><circle class="hs-ring" r="14"/><circle class="hs-dot" r="5"/></g>`;
  }).join('')}</g>`;
}

export function doorSVG({ view = 'outer', hotspots = {}, rings = 3, rear = false } = {}) {
  const ringEls = Array.from({ length: rings }, (_, i) =>
    `<g class="ring" data-i="${i}" style="opacity:0"><circle class="ring-wave" r="30"/><circle class="ring-core" r="13"/><path class="ring-cross" d="M-22 0H-9M9 0H22M0 -22V-9M0 9V22"/></g>`).join('');
  return `
<svg class="door-art" data-view="${view}" viewBox="0 0 430 520" role="img" aria-label="Szkic drzwi">
  <defs>
    <linearGradient id="dgSkin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#42403e"/><stop offset="1" stop-color="#0e1013"/></linearGradient>
    <linearGradient id="dgCard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27282d"/><stop offset="1" stop-color="#17181b"/></linearGradient>
    <linearGradient id="dgGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9db3cf" stop-opacity=".38"/><stop offset="1" stop-color="#272523" stop-opacity=".18"/></linearGradient>
    <pattern id="dgHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V8" stroke="#d9b878" stroke-opacity=".18" stroke-width="2"/></pattern>
  </defs>

  <!-- ================= Z ZEWNĄTRZ ================= -->
  <g class="layer outer">
    ${PHOTO && PHOTO.src ? `<clipPath id="dgClip"><rect x="0" y="0" width="430" height="520" rx="22"/></clipPath><image class="door-photo" href="${PHOTO.src}" x="0" y="0" width="430" height="520" preserveAspectRatio="xMidYMid slice" clip-path="url(#dgClip)"><title>${PHOTO.alt}</title></image>` : `<g transform="translate(430 0) scale(-1 1)">
      <path class="skin" d="${OUT}"/>
      <path class="cladding" d="M26 404 L404 404 L404 476 Q404 498 382 498 L48 498 Q26 498 26 476 Z"/>
      <path class="streak" d="M80 480 L250 160 L300 160 L136 480 Z"/>
      <path class="streak s2" d="M170 480 L330 180 L350 180 L200 480 Z"/>
      <path class="bezel" d="${GLASS}"/>
      <path class="glass" d="${GLASS}"/>
      <path class="trim-line" d="M46 152 L364 152 M30 404 L402 404"/>
    </g>
    <rect class="marker" x="372" y="436" width="22" height="9" rx="4.5"/>
    <path class="mirror" d="M6 150 Q26 140 40 152 L36 186 Q20 192 6 184 Z"/>
    <path class="character" d="M52 240 Q220 232 402 242"/>
    <rect class="handle-body" x="232" y="204" width="112" height="22" rx="11"/>
    <path class="handle-recess" d="M222 196 Q290 186 356 196 L356 236 Q290 244 222 236 Z"/>
    <circle class="keyhole-cover" cx="364" cy="218" r="11"/><path class="keyhole" d="M364 214v7"/>
    <path class="seam" d="M404 66 L404 480"/>
    <rect class="hinge" x="24" y="120" width="6" height="26" rx="2"/><rect class="hinge" x="24" y="408" width="6" height="26" rx="2"/>`}
    ${hsLayer(hotspots.outer)}
  </g>

  <!-- ================= BOCZEK ================= -->
  <g class="layer card">
    <path class="card-skin" d="${OUT}"/>
    <path class="glass" d="${GLASS}"/>
    <rect class="trim" x="44" y="168" width="350" height="30" rx="8"/>
    <rect class="pull" x="62" y="212" width="214" height="48" rx="22"/>
    <rect class="release" x="262" y="198" width="60" height="18" rx="9"/>
    <rect class="switch-panel" x="318" y="206" width="72" height="52" rx="8"/>
    <g class="switch-keys"><rect x="326" y="214" width="14" height="12" rx="3"/><rect x="344" y="214" width="14" height="12" rx="3"/><rect x="362" y="214" width="14" height="12" rx="3"/><rect x="326" y="232" width="14" height="12" rx="3"/><rect x="344" y="232" width="14" height="12" rx="3"/><rect x="362" y="232" width="14" height="12" rx="3"/></g>
    <rect class="pocket" x="58" y="352" width="250" height="84" rx="14"/>
    <circle class="speaker" cx="338" cy="396" r="34"/><circle class="speaker-in" cx="338" cy="396" r="22"/>
    <rect class="lamp" x="282" y="470" width="40" height="10" rx="5"/>
    <circle class="grommet" cx="150" cy="290" r="9"/>
    <g class="screws"><circle cx="150" cy="336" r="4.5"/><circle cx="262" cy="230" r="4.5"/><circle cx="54" cy="186" r="4.5"/><circle cx="150" cy="290" r="3"/></g>
    <g class="clips"><circle cx="60" cy="440" r="3.2"/><circle cx="210" cy="488" r="3.2"/><circle cx="372" cy="440" r="3.2"/><circle cx="374" cy="300" r="3.2"/><circle cx="60" cy="300" r="3.2"/><circle cx="130" cy="488" r="3.2"/><circle cx="300" cy="488" r="3.2"/></g>
    <path class="top-clips" d="M80 160 H340" stroke-dasharray="3 9"/>
    ${hsLayer(hotspots.card)}
  </g>

  <!-- ================= ŚRODEK ================= -->
  <g class="layer inner">
    <path class="card-skin metal" d="${OUT}"/>
    <path class="glass" d="${GLASS}"/>
    <path class="foam" d="M44 172 L392 172 L392 486 L44 486 Z"/>
    <path class="foam-hatch" d="M44 172 L392 172 L392 486 L44 486 Z"/>
    <rect class="airbag" x="170" y="186" width="124" height="76" rx="12"/>
    <g class="airbag-bolts"><circle cx="182" cy="198" r="5"/><circle cx="282" cy="198" r="5"/><circle cx="232" cy="252" r="5"/></g>
    <rect class="carrier" x="64" y="190" width="84" height="64" rx="10"/>
    <rect class="nut" x="120" y="228" width="16" height="16" rx="3"/>
    <rect class="int-carrier" x="272" y="198" width="42" height="22" rx="7"/>
    <path class="bowden" d="M292 220 C250 262 150 262 96 292"/>
    <path class="bowden ext" d="M112 254 C116 268 104 276 98 288"/>
    <rect class="collar" x="108" y="254" width="20" height="14" rx="4"/>
    <circle class="ball" cx="98" cy="284" r="7"/>
    <rect class="actuator" x="44" y="292" width="68" height="76" rx="10"/>
    <circle class="motor" cx="78" cy="326" r="14"/>
    <path class="indicator" d="M56 292 V176"/><circle class="indicator-tip" cx="56" cy="174" r="3.5"/>
    <rect class="connector" x="62" y="372" width="32" height="22" rx="5"/>
    <path class="rail" d="M200 330 V470 M300 330 V470 M200 400 H300"/>
    ${hsLayer(hotspots.inner)}
  </g>

  <!-- ================= KRAWĘDŹ ================= -->
  <g class="layer edge">
    <rect class="edge-slab" x="140" y="42" width="140" height="456" rx="18"/>
    <rect class="edge-seal" x="132" y="60" width="8" height="420" rx="4"/>
    <circle class="plug-outer" cx="210" cy="214" r="26"/><circle class="plug-inner" cx="210" cy="214" r="16"/>
    <path class="bolt-hex" d="M210 205 l7.8 4.5 v9 l-7.8 4.5 l-7.8 -4.5 v-9 z"/>
    <rect class="latch" x="168" y="276" width="84" height="88" rx="12"/>
    <path class="latch-claw" d="M190 300 q20 -16 40 0 v34 h-40 z"/>
    <path class="edge-cut" d="M140 160 H280 M140 440 H280"/>
    ${hsLayer(hotspots.edge)}
  </g>

  <g class="rings">${ringEls}</g>
</svg>`;
}
