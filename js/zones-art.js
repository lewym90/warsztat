// Grafiki stref auta: img/zones/<prefiks>-<strefa>.webp (ilustracje generowane, poglądowe).
const ZONE_ART = { 'bmw-e53': { p: 'e53', z: ['doors', 'hood', 'interior', 'tail', 'wheels', 'under', 'service'] } };
export const zoneImg = (packId, zoneId) => { const a = ZONE_ART[packId]; return a && a.z.includes(zoneId) ? `img/zones/${a.p}-${zoneId}.webp` : ''; };
