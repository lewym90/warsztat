#!/usr/bin/env python3
"""Generuje ikony aplikacji (PNG) w icons/. Wymaga Pillow."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / 'icons'
OUT.mkdir(exist_ok=True)
S = 2048  # rysujemy dużo większe i zmniejszamy

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def hexagon(cx, cy, r, rot=0):
    return [(cx + r * math.cos(math.radians(60 * i + rot)), cy + r * math.sin(math.radians(60 * i + rot))) for i in range(6)]

def gold_gradient(size, c0=(247, 232, 190), c1=(176, 128, 58)):
    g = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(g)
    for i in range(size * 2):
        t = i / (size * 2)
        t = 1 - abs(2 * t - 1) * .9  # połysk w środku przekątnej
        d.line([(i, 0), (0, i)], fill=lerp(c1, c0, t), width=2)
    return g

def ring_mask(draw_fn):
    m = Image.new('L', (S, S), 0)
    draw_fn(ImageDraw.Draw(m))
    return m

def draw(maskable=False):
    img = Image.new('RGB', (S, S), (8, 8, 10))
    d = ImageDraw.Draw(img)
    top, bot = (24, 22, 20), (6, 6, 8)
    for y in range(S):
        d.line([(0, y), (S, y)], fill=lerp(top, bot, y / S))
    glow = Image.new('L', (S, S), 0)
    ImageDraw.Draw(glow).ellipse([S * .2, S * .16, S * .8, S * .76], fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(S * .14))
    warm = Image.new('RGB', (S, S), (120, 88, 40))
    img = Image.composite(Image.blend(img, warm, .38), img, glow)

    k = .74 if maskable else .9
    cx = cy = S / 2
    R = S * .34 * k / .9
    gold = gold_gradient(S)

    def nut(dr):
        dr.polygon(hexagon(cx, cy, R, 30), outline=255, width=int(S * .03))
        dr.polygon(hexagon(cx, cy, R * .8, 30), outline=255, width=int(S * .008))
        r1 = R * .46
        dr.ellipse([cx - r1, cy - r1, cx + r1, cy + r1], outline=255, width=int(S * .024))
        r2 = R * .2
        dr.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=255)
        for a in (90, 210, 330):
            x1, y1 = cx + r1 * .5 * math.cos(math.radians(a)), cy + r1 * .5 * math.sin(math.radians(a))
            x2, y2 = cx + r1 * .92 * math.cos(math.radians(a)), cy + r1 * .92 * math.sin(math.radians(a))
            dr.line([(x1, y1), (x2, y2)], fill=255, width=int(S * .012))
    m = ring_mask(nut)
    # miękka poświata pod złotem
    halo = Image.composite(Image.new('RGB', (S, S), (217, 170, 90)), Image.new('RGB', (S, S), (0, 0, 0)), m).filter(ImageFilter.GaussianBlur(S * .02))
    img = Image.blend(img, Image.composite(halo, img, halo.convert('L')), .5)
    img.paste(gold, (0, 0), m)
    # cienka rama premium
    if not maskable:
        fm = ring_mask(lambda dr: dr.rounded_rectangle([S * .035, S * .035, S * .965, S * .965], radius=S * .2, outline=255, width=int(S * .006)))
        img.paste(Image.blend(Image.new('RGB', (S, S), (8, 8, 10)), gold, .55), (0, 0), fm)
    return img

def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)

normal = draw(False)
for n, s in (('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)):
    save(normal, n, s)
save(draw(True), 'icon-maskable-512.png', 512)
print('ikony zapisane w', OUT)
