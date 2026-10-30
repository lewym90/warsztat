#!/usr/bin/env python3
"""Ikona aplikacji: felga aluminiowa z 5 podwójnymi ramionami i nakrętką-piastą (złoto na czerni). Wymaga Pillow."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

OUT = Path(__file__).resolve().parent.parent / 'icons'
OUT.mkdir(exist_ok=True)
S = 2048

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def gold(size, c0=(250, 238, 200), c1=(168, 120, 52), mid=(222, 184, 112)):
    g = Image.new('RGB', (size, size)); d = ImageDraw.Draw(g)
    for i in range(size * 2):
        t = i / (size * 2)
        col = lerp(c0, mid, t * 2) if t < .5 else lerp(mid, c1, (t - .5) * 2)
        d.line([(i, 0), (0, i)], fill=col, width=2)
    return g

def mask(fn):
    m = Image.new('L', (S, S), 0); fn(ImageDraw.Draw(m)); return m

def spoke_poly(cx, cy, ang, r0, r1, w0, w1, off):
    """Jedno ramię: trapez od piasty (r0) do obręczy (r1), przesunięte bocznie o off."""
    a = math.radians(ang); ux, uy = math.cos(a), math.sin(a); nx, ny = -uy, ux
    def P(r, w): return (cx + ux * r + nx * (off + w), cy + uy * r + ny * (off + w))
    return [P(r0, -w0), P(r1, -w1), P(r1, w1), P(r0, w0)]

def draw(maskable=False):
    bg = Image.new('RGB', (S, S), (8, 8, 10)); bd = ImageDraw.Draw(bg)
    for i in range(60):  # ciepła poświata
        r = int(S * .62 * (1 - i / 60)); c = lerp((8, 8, 10), (46, 36, 20), i / 60)
        bd.ellipse([S / 2 - r, S / 2 - r, S / 2 + r, S / 2 + r], fill=c)
    cx = cy = S / 2
    k = .70 if maskable else .88  # skala (maskable ma większy margines)
    R = S * .5 * k
    G = gold(S)
    # opona
    tire = mask(lambda d: d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=255))
    bg.paste((22, 22, 25), mask=tire)
    ring = mask(lambda d: (d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=255, width=int(S * .006))))
    bg.paste(G, mask=ring)
    # obręcz felgi
    Rr = R * .80; rw = R * .075
    rim = mask(lambda d: (d.ellipse([cx - Rr, cy - Rr, cx + Rr, cy + Rr], fill=255), d.ellipse([cx - Rr + rw, cy - Rr + rw, cx + Rr - rw, cy + Rr - rw], fill=0)))
    bg.paste(G, mask=rim)
    # tarcza w głębi felgi
    inner = Rr - rw
    disc = mask(lambda d: d.ellipse([cx - inner, cy - inner, cx + inner, cy + inner], fill=255))
    bg.paste((12, 12, 14), mask=disc)
    # zacisk hamulcowy (łuk) z tyłu
    cal = mask(lambda d: d.pieslice([cx - inner * .86, cy - inner * .86, cx + inner * .86, cy + inner * .86], -28, 32, fill=255))
    cal = ImageChops.subtract(cal, mask(lambda d: d.ellipse([cx - inner * .58, cy - inner * .58, cx + inner * .58, cy + inner * .58], fill=255)))
    # (zacisk pominięty dla czystszego wyglądu)
    # 5 podwójnych ramion
    sp = Image.new('L', (S, S), 0); sd = ImageDraw.Draw(sp)
    for i in range(5):
        base = -90 + i * 72
        for off in (-R * .055, R * .055):
            sd.polygon(spoke_poly(cx, cy, base, R * .17, inner * .98, R * .035, R * .05, off), fill=255)
    sp = sp.filter(ImageFilter.GaussianBlur(S * .0015))
    # cień pod ramionami
    sh = sp.filter(ImageFilter.GaussianBlur(S * .008)); sh = ImageChops.offset(sh, int(S * .006), int(S * .01))
    bg.paste((0, 0, 0), mask=sh.point(lambda v: int(v * .7)))
    bg.paste(G, mask=sp)
    # krawędź ramion (połysk)
    edge = ImageChops.subtract(sp, sp.filter(ImageFilter.GaussianBlur(S * .004)).point(lambda v: min(255, int(v * 1.0))))
    bg.paste((255, 245, 215), mask=edge.point(lambda v: min(255, v * 3)))
    # piasta + nakrętka
    hub = R * .205
    bg.paste((14, 14, 16), mask=mask(lambda d: d.ellipse([cx - hub * 1.15, cy - hub * 1.15, cx + hub * 1.15, cy + hub * 1.15], fill=255)))
    bg.paste(G, mask=mask(lambda d: d.ellipse([cx - hub, cy - hub, cx + hub, cy + hub], fill=255)))
    bg.paste((24, 20, 12), mask=mask(lambda d: d.ellipse([cx - hub * .86, cy - hub * .86, cx + hub * .86, cy + hub * .86], fill=255)))
    hexr = hub * .62
    hx = [(cx + hexr * math.cos(math.radians(60 * i + 30)), cy + hexr * math.sin(math.radians(60 * i + 30))) for i in range(6)]
    bg.paste(G, mask=mask(lambda d: d.polygon(hx, fill=255)))
    hr = hexr * .5
    bg.paste((18, 14, 8), mask=mask(lambda d: d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=255)))
    # połysk
    gl = Image.new('L', (S, S), 0); gd = ImageDraw.Draw(gl)
    gd.ellipse([cx - R * .95, cy - R * 1.35, cx + R * .35, cy - R * .1], fill=38)
    gl = gl.filter(ImageFilter.GaussianBlur(S * .03))
    gl = ImageChops.multiply(gl, tire)
    bg.paste((255, 255, 255), mask=gl)
    return bg

def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)

a = draw(False); m = draw(True)
save(a, 'icon-512.png', 512); save(a, 'icon-192.png', 192); save(a, 'apple-touch-icon.png', 180); save(m, 'icon-maskable-512.png', 512)
print('ikony gotowe')
