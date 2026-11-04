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
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e} {getattr(e, "stack", "")[:400]}'))
    page.on('requestfailed', lambda r: errors.append(f'requestfailed: {r.url}'))

    def shot(name, full=False):
        page.wait_for_timeout(1400)
        sw = page.evaluate('document.documentElement.scrollWidth'); cw = page.evaluate('document.documentElement.clientWidth')
        if sw > cw + 1: errors.append(f'przepełnienie poziome na {name}: {sw} > {cw}')
        page.screenshot(path=str(OUT / f'{name}.png'), full_page=full)

    cid = lambda: page.evaluate("JSON.parse(localStorage.getItem('warsztat.v1')).cars[0].id")
    page.goto(BASE); page.wait_for_selector('.hs-cta'); shot('00-start')
    page.goto(BASE + '#/garage'); page.wait_for_selector('.gcard'); shot('01-garaz')
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

    # ---- nowe funkcje: notatki, zdjęcia, minutnik, ustawienia, bezpieczeństwo, plan, szukaj, książka, synchronizacja ----
    import zlib, struct
    def png(w=64, h=48):
        raw = b''.join(b'\x00' + bytes([200, 120, 40]) * w for _ in range(h))
        ch = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
        return b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw)) + ch(b'IEND', b'')
    state = lambda: page.evaluate("JSON.parse(localStorage.getItem('warsztat.v1'))")
    def check(cond, msg):
        if not cond: errors.append('TEST: ' + msg)
    page.set_viewport_size({'width': 390, 'height': 844})
    rid = 'klamka-zewn-przod'
    page.goto(BASE + f'#/car/{cid()}/r/{rid}'); page.wait_for_selector('.dk-card'); page.wait_for_timeout(500)
    page.click('#dk-menu'); page.click('.dk-si[data-go="1"]'); page.wait_for_timeout(500)
    check(page.evaluate("document.body.classList.contains('in-deck')"), 'brak trybu talii')
    # bezpieczeństwo
    ks = page.evaluate("[...document.querySelectorAll('.dk-card')].findIndex(c => c.getAttribute('aria-label').includes('Bezpiecze'))")
    page.click('#dk-menu'); page.click(f'.dk-si[data-go="{ks}"]'); page.wait_for_timeout(500)
    page.click('[data-safe="0"]'); check(state()['prog'][f'{cid()}:{rid}']['safety'].get('0') is True, 'karta bezpieczeństwa nie zapisuje odhaczenia')
    shot('20-bezpieczenstwo')
    # krok 1: notatka + zdjęcie + minutnik
    first = page.evaluate("[...document.querySelectorAll('.dk-card')].findIndex(c => c.classList.contains('is-step'))")
    page.click('#dk-menu'); page.click(f'.dk-si[data-go="{first}"]'); page.wait_for_timeout(600)
    page.fill('[data-note="0"]', 'Śruba po lewej była luźna'); page.click('.dk-in h2'); page.wait_for_timeout(200)
    check(state()['prog'][f'{cid()}:{rid}']['notes']['0']['t'].startswith('Śruba'), 'notatka nie zapisana')
    page.set_input_files('[data-addphoto="0"] >> nth=0', {'name': 'a.png', 'mimeType': 'image/png', 'buffer': png()})
    page.wait_for_selector('[data-thumbs="0"] img', timeout=6000)
    shot('21-krok-zdjecie-notatka')
    n_photos = page.evaluate("new Promise(r => { const q = indexedDB.open('warsztat-media'); q.onsuccess = () => { const g = q.result.transaction('photos').objectStore('photos').count(); g.onsuccess = () => r(g.result); }; })")
    check(n_photos == 1, f'zdjęcie nie w IndexedDB ({n_photos})')
    # montaż: pasek zdjęć z demontażu
    asm = page.evaluate("(() => { const i = [...document.querySelectorAll('[data-strip]')][0]; return i ? +i.dataset.strip : -1; })()")
    check(asm > 0, 'brak paska zdjęć z demontażu w krokach montażu')
    page.evaluate(f"document.querySelector('[data-strip=\"{asm}\"]').closest('.dk-card').scrollIntoView({{inline:'start'}})"); page.wait_for_timeout(600)
    check(page.evaluate(f"!document.querySelector('[data-strip=\"{asm}\"]').hidden"), 'pasek zdjęć z demontażu ukryty mimo zdjęcia')
    shot('22-krok-montaz-pasek')
    # minutnik
    page.click('#dk-timer'); page.wait_for_selector('#sheet.open [data-min]'); page.click('#sheet [data-min="10"]'); page.wait_for_timeout(300)
    check(page.evaluate("!document.getElementById('timerpill').hidden"), 'pigułka minutnika niewidoczna')
    shot('23-minutnik')
    page.click('#timerpill'); page.wait_for_selector('#sheet.open [data-cancel]'); page.click('#sheet [data-cancel]'); page.wait_for_timeout(300)
    check(page.evaluate("document.getElementById('timerpill').hidden"), 'minutnik nie zatrzymany')
    # ustawienia: ciemny motyw i wielkość liter
    page.click('#dk-aa'); page.click('button[data-theme="dark"]'); page.click('[data-fs="1"]'); page.wait_for_timeout(300)
    check(page.evaluate("document.documentElement.dataset.theme") == 'dark', 'motyw ciemny nie zastosowany')
    check(page.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fscale'))") > 1, 'A+ nie działa')
    shot('24-ustawienia-ciemny'); page.click('#dk-setx'); page.wait_for_timeout(200); shot('25-krok-ciemny')
    page.click('#dk-aa'); page.click('button[data-theme="dark"]'); page.click('[data-fs="-1"]'); page.click('#dk-setx')
    # plan
    page.click('#dk-menu'); page.click('.dk-si[data-go="0"]'); page.wait_for_timeout(500)
    page.click('#plan-add'); page.goto(BASE + f'#/car/{cid()}/r/tapicerka-przod'); page.wait_for_selector('#plan-add'); page.click('#plan-add')
    page.goto(BASE + '#/plan'); page.wait_for_selector('.plrow'); shot('26-plan', True)
    check(page.evaluate("document.querySelectorAll('.plrow').length") == 2, 'plan nie ma 2 napraw')
    check(page.evaluate("document.body.innerText.includes('Kolejność prac')"), 'brak podpowiedzi kolejności')
    # szukaj
    page.goto(BASE + '#/search'); page.fill('#gq', 'boczka'); page.wait_for_selector('.srow'); shot('27-szukaj')
    check(page.evaluate("document.querySelectorAll('.srow').length") > 0, 'szukaj nic nie znajduje')
    href = page.evaluate("[...document.querySelectorAll('.srow')].find(a => a.getAttribute('href').includes('step='))?.getAttribute('href')")
    check(bool(href), 'wyniki bez linku do kroku')
    if href:
        page.goto(BASE + href); page.wait_for_selector('.dk-card'); page.wait_for_timeout(700)
        check(page.evaluate("document.getElementById('dk-count').textContent").startswith('Krok'), 'link ?step= nie otwiera kroku')
    # wznów + postęp na liście
    page.goto(BASE + '#/'); page.wait_for_selector('.hs-prog'); shot('28-start-wznow')
    page.goto(BASE + '#/repairs'); page.wait_for_selector('.ritem'); check(page.locator('.ritem').count() == 14, 'lista napraw'); shot('28b-naprawy')
    page.goto(BASE + '#/repairs?tab=parts'); page.wait_for_selector('.plpart'); shot('28c-czesci')
    page.goto(BASE + '#/repairs?tab=catalog'); page.wait_for_selector('.srow'); shot('28d-katalog')
    page.goto(BASE + f'#/car/{cid()}/diag'); page.wait_for_selector('.diag details'); shot('28e-diagnostyka')
    check(page.locator('#tabs a').count() == 5, 'dolna nawigacja bez 5 pozycji')
    page.goto(BASE + f'#/car/{cid()}/zone/doors?door=front'); page.wait_for_selector('.zprog'); shot('29-lista-postep', True)
    # książka serwisowa
    page.goto(BASE + f'#/book/{cid()}'); page.wait_for_selector('#bk-new'); page.click('#bk-new'); page.fill('#bk-t', 'Wymiana klamki'); page.fill('#bk-km', '251000'); page.fill('#bk-c', '120.50'); shot('30-ksiazka-wpis')
    page.click('#bk-save'); page.wait_for_selector('.bk-row'); shot('31-ksiazka')
    check(len(state()['book']) == 1 and state()['cars'][0]['km'] == 251000, 'wpis w książce lub przebieg')
    # synchronizacja: kody QR
    page.goto(BASE + '#/sync'); page.click('#sy-show'); page.wait_for_selector('.sy-qr svg'); shot('32-sync')
    # więcej
    page.goto(BASE + '#/more'); page.wait_for_selector('#exp'); shot('33-wiecej-nowe', True)
    # kopia: zapis i wczytanie z plikiem (ze zdjęciami)
    with page.expect_download() as dl:
        page.click('#exp')
    path = dl.value.path(); import json as _j
    bk = _j.load(open(path)); check(bk.get('v') == 2 and len(bk['photos']) == 1 and bk['state']['book'], 'kopia v2 bez zdjęcia lub książki')
    page.evaluate("localStorage.removeItem('warsztat.v1'); indexedDB.deleteDatabase('warsztat-media')"); page.goto(BASE + '#/more'); page.reload(); page.wait_for_selector('#impfile', state='attached')
    page.set_input_files('#impfile', path); page.wait_for_timeout(1500)
    check(len(state()['book']) == 1, 'wczytanie kopii nie przywróciło książki')
    check(page.evaluate("new Promise(r => { const q = indexedDB.open('warsztat-media'); q.onsuccess = () => { const g = q.result.transaction('photos').objectStore('photos').count(); g.onsuccess = () => r(g.result); }; })") == 1, 'wczytanie kopii nie przywróciło zdjęcia')
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
    page.goto(BASE + f'#/car/{cid()}'); page.wait_for_selector('.src-row')
    check('źródeł' in page.inner_text('.src-row'), 'wiersz Źródła bez liczby')
    page.click('.src-row'); page.wait_for_selector('.src-card')
    check(page.locator('.src-card').count() >= 40, 'za mało kart źródeł')
    check(page.locator('.src-card a[href^="https://"]').count() >= 40, 'karty źródeł bez odnośników')
    shot('s-zrodla')
    page.fill('#srcq', 'fepat55'); check(page.locator('.src-card:visible').count() == 1, 'szukanie po autorze nie działa')
    page.fill('#srcq', 'zzzz'); check(page.locator('.src-card:visible').count() == 0, 'szukanie bez wyniku pokazuje karty')
    page.fill('#srcq', '')
    import json as _jr, glob as _gl
    for f in sorted(_gl.glob('data/packs/bmw-e53/repairs/*.json')):
        rid = _jr.load(open(f))['id']; nst = len(_jr.load(open(f))['steps'])
        page.goto(BASE + f'#/car/{cid()}/r/{rid}'); page.wait_for_selector('.dk-card')
        check(page.locator('.dk-card').count() >= nst, f'{rid}: za mało kart ({page.locator(".dk-card").count()} < {nst})')
    for z in ['doors', 'hood', 'interior', 'tail', 'wheels', 'under', 'service']:
        page.goto(BASE + f'#/car/{cid()}/zone/{z}'); page.wait_for_selector('#zlist .zg')
    for name, w, h in [('tel-se', 320, 568), ('tel-mini', 375, 667), ('tel-max', 430, 932), ('tab-pion', 768, 1024), ('laptop', 1440, 900)]:
        page.set_viewport_size({'width': w, 'height': h})
        for tag, hsh in [('garaz', '#/'), ('auto', f'#/car/{cid()}'), ('drzwi', f'#/car/{cid()}/zone/doors'), ('naprawa', f'#/car/{cid()}/r/klamka-zewn-przod'), ('wiecej', '#/more'), ('plan', '#/plan'), ('szukaj', '#/search')]:
            page.goto(BASE + hsh); shot(f'r-{name}-{tag}')
    b.close()

httpd.shutdown()
errors = [e for e in errors if 'Failed to load resource' not in e and not any(k in e for k in ('pelicanparts', 'ERR_TUNNEL', 'youtube', 'ytimg', 'xoutpost', 'leathersteering', 'workshop-manuals'))]  # zasoby zewnętrzne: sandbox ich nie ładuje
print('BŁĘDY:' if errors else 'brak błędów konsoli')
for e in errors: print(' -', e)
