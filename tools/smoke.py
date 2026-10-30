#!/usr/bin/env python3
"""Test dymny w przeglądarce (Playwright): przechodzi po ekranach w rozmiarze telefonu,
zbiera błędy konsoli i zapisuje zrzuty do podanego katalogu.
Użycie: python3 tools/smoke.py /ścieżka/do/zrzutów"""
import http.server, socketserver, threading, sys, functools
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'); OUT.mkdir(parents=True, exist_ok=True)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
handler = functools.partial(Q, directory=str(ROOT))
httpd = socketserver.TCPServer(('127.0.0.1', 0), handler)
port = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{port}/'

errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='pl-PL')
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.on('requestfailed', lambda r: errors.append(f'requestfailed: {r.url}'))

    def shot(name, full=False):
        page.wait_for_timeout(1400)
        sw = page.evaluate('document.documentElement.scrollWidth'); cw = page.evaluate('document.documentElement.clientWidth')
        if sw > cw + 1: errors.append(f'przepełnienie poziome na {name}: {sw} > {cw}')
        page.screenshot(path=str(OUT / f'{name}.png'), full_page=full)

    page.goto(BASE); page.wait_for_selector('.gcard'); shot('01-garaz')
    page.click('.gcard'); page.wait_for_selector('.car-art'); shot('02-auto')
    page.screenshot(path=str(OUT / '02b-auto-pelny.png'), full_page=True)
    page.click('[data-zone="door_front"]'); page.wait_for_selector('.door-art'); shot('03-drzwi-zewn')
    page.click('#seg-view [data-v="card"]'); shot('04-drzwi-boczek')
    page.click('#seg-view [data-v="inner"]'); shot('05-drzwi-srodek')
    page.click('#seg-view [data-v="outer"]')
    page.click('.hs[data-hs="h"]'); shot('06-hotspot')
    page.screenshot(path=str(OUT / '06b-drzwi-pelny.png'), full_page=True)
    page.click('#hscap a'); page.wait_for_selector('.step'); shot('07-naprawa-gora')
    page.screenshot(path=str(OUT / '07b-naprawa-pelny.png'), full_page=True)
    page.click('[data-open="3"]'); shot('08-krok4-krawedz')
    page.eval_on_selector('[data-done="3"]', 'e => e.click()'); shot('09-krok5-zewn')
    page.click('[data-open="6"]'); shot('10-krok7-srodek')
    page.goto(BASE + '#/car/' + page.evaluate("JSON.parse(localStorage.getItem('warsztat.v1')).cars[0].id") + '/r/tapicerka-przod'); shot('11-tapicerka')
    page.goto(BASE + '#/add'); shot('12-dodaj')
    page.click('[data-make="Opel"]'); shot('13-dodaj-model')
    page.click('[data-model^="Vectra|C"]'); shot('14-dodaj-szczegoly')
    page.fill('#w-engine', '1.9 CDTI'); page.click('#w-save'); page.wait_for_selector('.matchbox.no'); shot('15-vectra-brak')
    page.click('#req'); shot('16-zamow')
    page.goto(BASE + '#/more'); shot('17-wiecej')
    # rysunek poglądowy auta w układzie desktop
    page.set_viewport_size({'width': 1280, 'height': 900})
    page.goto(BASE + '#/'); shot('18-desktop-garaz')
    page.click('.gcard'); shot('19-desktop-auto')
    page.goto(BASE + '#/car/' + page.evaluate("JSON.parse(localStorage.getItem('warsztat.v1')).cars[0].id") + '/r/klamka-zewn-przod'); shot('20-desktop-naprawa')
    # macierz rozmiarów: telefon, tablet pion/poziom, laptop, duży monitor
    cid = page.evaluate("JSON.parse(localStorage.getItem('warsztat.v1')).cars[0].id")
    for name, w, h in [('tel-se', 320, 568), ('tel-mini', 375, 667), ('tel-max', 430, 932), ('tab-pion', 768, 1024), ('tab-poz', 1180, 820), ('laptop', 1440, 900), ('monitor', 2200, 1200)]:
        page.set_viewport_size({'width': w, 'height': h})
        for tag, hsh in [('garaz', '#/'), ('auto', f'#/car/{cid}'), ('drzwi', f'#/car/{cid}/sys/doors?door=front'), ('naprawa', f'#/car/{cid}/r/klamka-zewn-przod'), ('wiecej', '#/more')]:
            page.goto(BASE + hsh); shot(f'r-{name}-{tag}')
    b.close()

httpd.shutdown()
errors = [e for e in errors if 'pelicanparts' not in e and 'ERR_TUNNEL' not in e and 'youtube' not in e]  # zasoby zewnętrzne: sandbox ich nie ładuje
print('BŁĘDY:' if errors else 'brak błędów konsoli')
for e in errors: print(' -', e)
