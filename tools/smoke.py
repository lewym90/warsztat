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

    cid = lambda: page.evaluate("JSON.parse(localStorage.getItem('warsztat.v1')).cars[0].id")
    page.goto(BASE); page.wait_for_selector('.gcard'); shot('01-garaz')
    page.click('.gcard'); page.wait_for_selector('.spin-stage'); shot('02-auto')
    page.screenshot(path=str(OUT / '02b-auto-pelny.png'), full_page=True)
    page.goto(BASE + f'#/car/{cid()}/zone/doors?side=left'); page.wait_for_selector('.zrow'); shot('03-strefa-drzwi', True)
    page.fill('#zq', 'klamka'); shot('04-strefa-szukaj')
    for rid in ['klamka-zewn-przod', 'tapicerka-przod', 'klamka-wewn', 'okno-podnosnik-przod']:
        page.goto(BASE + f'#/car/{cid()}/r/{rid}'); page.wait_for_selector('.dk-card'); page.wait_for_timeout(600)
        n = page.evaluate("document.querySelectorAll('.dk-card').length")
        shot(f'05-{rid}-start')
        for _ in range(min(7, n - 1)):
            page.click('#dk-next'); page.wait_for_timeout(450)
        shot(f'05-{rid}-karta8')
        page.click('#dk-menu'); shot(f'05-{rid}-spis'); page.click('#dk-close')
        # cofnięcie cofa postęp
        a = page.evaluate("Object.values(JSON.parse(localStorage.getItem('warsztat.v1')).prog['%s:%s'].steps).filter(Boolean).length" % (cid(), rid))
        for _ in range(4): page.click('#dk-prev'); page.wait_for_timeout(450)
        c = page.evaluate("Object.values(JSON.parse(localStorage.getItem('warsztat.v1')).prog['%s:%s'].steps).filter(Boolean).length" % (cid(), rid))
        if not c < a and a > 0: errors.append(f'postęp nie cofa się w {rid}: {a} -> {c}')
    page.goto(BASE + '#/add'); shot('06-dodaj')
    page.click('[data-make="Opel"]'); shot('07-dodaj-model')
    page.click('[data-model^="Vectra|C"]'); shot('08-dodaj-szczegoly')
    page.fill('#w-engine', '1.9 CDTI'); page.click('#w-save'); page.wait_for_selector('.matchbox.no'); shot('09-vectra-brak')
    page.click('#req'); shot('10-zamow')
    page.goto(BASE + '#/more'); shot('11-wiecej')
    page.set_viewport_size({'width': 1280, 'height': 900})
    page.goto(BASE + '#/'); shot('12-desktop-garaz')
    page.goto(BASE + f'#/car/{cid()}'); shot('13-desktop-auto')
    page.goto(BASE + f'#/car/{cid()}/r/klamka-zewn-przod'); page.wait_for_selector('.dk-card'); shot('14-desktop-naprawa')
    for name, w, h in [('tel-se', 320, 568), ('tel-mini', 375, 667), ('tel-max', 430, 932), ('tab-pion', 768, 1024), ('laptop', 1440, 900)]:
        page.set_viewport_size({'width': w, 'height': h})
        for tag, hsh in [('garaz', '#/'), ('auto', f'#/car/{cid()}'), ('drzwi', f'#/car/{cid()}/zone/doors'), ('naprawa', f'#/car/{cid()}/r/klamka-zewn-przod'), ('wiecej', '#/more')]:
            page.goto(BASE + hsh); shot(f'r-{name}-{tag}')
    b.close()

httpd.shutdown()
errors = [e for e in errors if 'Failed to load resource' not in e and not any(k in e for k in ('pelicanparts', 'ERR_TUNNEL', 'youtube', 'ytimg', 'xoutpost', 'leathersteering', 'workshop-manuals'))]  # zasoby zewnętrzne: sandbox ich nie ładuje
print('BŁĘDY:' if errors else 'brak błędów konsoli')
for e in errors: print(' -', e)
