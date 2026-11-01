import { icon } from './icons.js';
import { app, closeSheet, setTabs, topbar, esc } from './ui.js';

// Rejestr tras: każdy ekran rejestruje się sam przez route(wyrażenie, funkcja).
export const routes = [];
export const route = (re, fn) => routes.push([re, fn]);

let renderId = 0;
export async function render() {
  const id = ++renderId;
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const q = new URLSearchParams(query);
  closeSheet();
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (!m) continue;
    try {
      const out = await fn(...m.slice(1).map(decodeURIComponent), q);
      if (id !== renderId) return;
      app.innerHTML = `<div class="screen">${out.html}</div>`;
      setTabs(out.tab ?? null);
      window.scrollTo(0, 0);
      out.bind && out.bind(app);
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="screen">${topbar({ back: '#/', title: 'Błąd' })}<div class="wrap"><div class="note danger">${icon('alert', 22)}<div><b>Nie udało się załadować ekranu</b><p>${esc(e.message || e)}</p></div></div></div></div>`;
      setTabs(null);
    }
    return;
  }
  location.hash = '#/';
}
window.addEventListener('hashchange', render);
