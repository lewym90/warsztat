#!/usr/bin/env python3
"""Warsztat: skrypt budujący i sprawdzający paczki wiedzy.

Uruchom po każdej zmianie w data/ lub plikach aplikacji:  python3 tools/build.py

1. Waliduje paczki (źródła, kotwice rysunku, powiązania kart).
2. Odświeża indeks napraw w pack.json (tytuły, trudność, liczba kroków).
3. Generuje listę plików i wersję w sw.js (offline + wymuszenie aktualizacji).
"""
import hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
errors = []

def err(msg): errors.append(msg)

anchors_src = (ROOT / 'js/art-door.js').read_text(encoding='utf-8')
ANCHORS = set(re.findall(r"'((?:card|inner|edge|outer)\.[a-z_]+)'\s*:", anchors_src))

ICON_BY_ID = {'tapicerka': 'door', 'klamka-zewn': 'wrench', 'klamka-wewn': 'wrench', 'silownik': 'bolt'}
def icon_for(rid):
    for k, v in ICON_BY_ID.items():
        if rid.startswith(k): return v
    return 'wrench'

packs = json.loads((ROOT / 'data/packs.json').read_text(encoding='utf-8'))['packs']
for p in packs:
    pdir = ROOT / 'data/packs' / p['id']
    pack_path = pdir / 'pack.json'
    pack = json.loads(pack_path.read_text(encoding='utf-8'))
    srcs = pack['sources']
    index = []
    source_use = {}
    media_cred = {}
    for f in sorted((pdir / 'repairs').glob('*.json')):
        r = json.loads(f.read_text(encoding='utf-8'))
        rid = r['id']
        if f.stem != rid: err(f'{f.name}: id "{rid}" nie zgadza się z nazwą pliku')
        used = set()
        def collect(items):
            for it in items or []:
                for k in it.get('src', []):
                    used.add(k)
                    if k not in srcs: err(f'{rid}: nieznane źródło "{k}"')
        collect(r.get('extras')); collect(r.get('parts')); collect(r.get('warnings')); collect(r.get('steps'))
        for i, s in enumerate(r['steps']):
            if s['view'] not in ('outer', 'card', 'inner', 'edge'): err(f'{rid} krok {i+1}: zły widok {s["view"]}')
            if s['conf'] not in ('high', 'med', 'low'): err(f'{rid} krok {i+1}: zła pewność')
            for a in s.get('focus', []):
                if a not in ANCHORS: err(f'{rid} krok {i+1}: nieznana kotwica {a}')
                elif a.split('.')[0] != s['view']: err(f'{rid} krok {i+1}: kotwica {a} nie pasuje do widoku {s["view"]}')
            if not s.get('focus'): err(f'{rid} krok {i+1}: brak focus')
            for m in s.get('media', []):
                if m.get('type') not in ('photo', 'video', 'link', 'film'): err(f'{rid} krok {i+1}: zły typ media')
                if m['type'] == 'video' and not (m.get('id') and isinstance(m.get('t'), int)): err(f'{rid} krok {i+1}: wideo bez id lub czasu')
                if m['type'] in ('photo', 'link') and not str(m.get('url', '')).startswith('https://'): err(f'{rid} krok {i+1}: media bez adresu https')
                if m['type'] != 'link' and not m.get('cap'): err(f'{rid} krok {i+1}: media bez opisu')
                if not m.get('credit'): err(f'{rid} krok {i+1}: media bez autora/źródła')
            if 'link' in s and not (pdir / 'repairs' / f'{s["link"]}.json').exists(): err(f'{rid} krok {i+1}: link do nieistniejącej karty {s["link"]}')
        for rel in r.get('related', []):
            if not (pdir / 'repairs' / f'{rel}.json').exists(): err(f'{rid}: related -> brak {rel}')
        for part in r.get('parts', []):
            if part.get('oe') and not re.fullmatch(r'\d{11}', part['oe']): err(f'{rid}: numer OE "{part["oe"]}" nie ma 11 cyfr')
            if not part.get('oe') and part['conf'] == 'high': err(f'{rid}: część bez numeru nie może mieć pewności high')
        for k in used: source_use.setdefault(k, []).append(rid)
        for s in r['steps']:
            for m in s.get('media', []):
                full = m['credit']; base = re.sub(r'\s*\(.*?\)', '', full).strip() or full
                e = media_cred.setdefault(base, {'credit': base, 'details': [], 'types': [], 'hosts': [], 'links': [], 'repairs': [], 'count': 0})
                e['count'] += 1
                m_host = re.sub(r'^https?://(www\.)?', '', m.get('url', 'youtube.com')).split('/')[0]
                if full != base and 'rys.' not in full and full[len(base):].strip(' ()') not in e['details']: e['details'].append(full[len(base):].strip(' ()'))
                if m['type'] not in e['types']: e['types'].append(m['type'])
                if m_host not in e['hosts']: e['hosts'].append(m_host)
                if m['type'] == 'link' and m['url'] not in e['links']: e['links'].append(m['url'])
                if rid not in e['repairs']: e['repairs'].append(rid)
        index.append({'id': rid, 'title': r['title'], 'subtitle': r['subtitle'], 'door': r['door'], 'difficulty': r['difficulty'],
                      'time': r['time'], 'completeness': r['completeness'], 'steps': len(r['steps']), 'icon': icon_for(rid)})
    pack['repairs'] = index
    pack['sourceUse'] = {k: sorted(v) for k, v in sorted(source_use.items())}
    pack['mediaCredits'] = sorted(media_cred.values(), key=lambda e: -e['count'])
    ids = {x['id'] for x in index}
    for side, views in pack['doors'].items():
        for view, spots in views.items():
            for h in spots:
                if h['anchor'] not in ANCHORS: err(f'hotspot {side}/{view}/{h["id"]}: nieznana kotwica {h["anchor"]}')
                if h['anchor'].split('.')[0] != view: err(f'hotspot {side}/{view}/{h["id"]}: kotwica {h["anchor"]} w złym widoku')
                if 'repair' in h and h['repair'] not in ids: err(f'hotspot {side}/{view}/{h["id"]}: brak karty {h["repair"]}')
    for d in pack['diagnosis']:
        for rid in (d.get('repair') or {}).values():
            if rid not in ids: err(f'diagnoza: brak karty {rid}')
    for s in pack['systems']:
        if s['id'] == 'doors':
            s['ready'] = True
            s['repairIds'] = sorted(ids)
    pack_path.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'paczka {p["id"]}: {len(index)} kart, {len(srcs)} źródeł')

if errors:
    print('\nBŁĘDY:'); [print(' -', e) for e in errors]; sys.exit(1)

# ---- katalog napraw (strefy) ----
for pk in sorted((ROOT / 'data' / 'packs').iterdir()):
    cat = pk / 'catalog.json'
    if not cat.exists(): continue
    cj = json.loads(cat.read_text(encoding='utf-8'))
    zids = [z['id'] for z in cj['zones']]
    if len(zids) != len(set(zids)): err(f'{pk.name}: powtórzone id strefy')
    for z in cj['zones']:
        for g in z['groups']:
            for it in g['items']:
                if not it.get('t'): err(f'{pk.name}/{z["id"]}: pozycja bez tytułu')
                if it.get('id') and not (pk / 'repairs' / (it['id'] + '.json')).exists(): err(f'{pk.name}/{z["id"]}: brak karty {it["id"]}')
                if it.get('d') not in (None, 'front', 'rear'): err(f'{pk.name}/{z["id"]}: zły filtr drzwi')

if errors:
    print('\nBŁĘDY:'); [print(' -', e) for e in errors]; sys.exit(1)

# ---- service worker ----
skip_dirs = {'tools', 'tests', '.git', 'node_modules'}
files = []
for p in sorted(ROOT.rglob('*')):
    if p.is_dir(): continue
    rel = p.relative_to(ROOT).as_posix()
    if rel.split('/')[0] in skip_dirs or rel.startswith('.') or rel in ('README.md', 'CLAUDE.md', 'KONTYNUACJA.md', 'sw.js') or rel.startswith('img/spin/') or rel.startswith('docs/') or rel.endswith('.py'): continue
    files.append(rel)
digest = hashlib.sha1()
for rel in files: digest.update(rel.encode()); digest.update((ROOT / rel).read_bytes())
ver = digest.hexdigest()[:10]
sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
sw = re.sub(r'/\*V\*/.*?/\*ENDV\*/', f'/*V*/{ver}/*ENDV*/', sw, flags=re.S)
sw = re.sub(r'/\*FILES\*/.*?/\*ENDFILES\*/', '/*FILES*/' + json.dumps(['./'] + files, ensure_ascii=False) + '/*ENDFILES*/', sw, flags=re.S)
(ROOT / 'sw.js').write_text(sw, encoding='utf-8')
print(f'sw.js: {len(files)} plików, wersja {ver}')
