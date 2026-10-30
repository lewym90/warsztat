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

def draw(maskable=False):
    img = Image.new('RGB', (S, S), (7, 9, 13))
    px = img.load()
    # tło: pionowy gradient + poświata
    top, bot = (16, 22, 32), (6, 8, 12)
    d = ImageDraw.Draw(img)
    for y in range(S):
        d.line([(0, y), (S, y)], fill=lerp(top, bot, y / S))
    glow = Image.new('RGB', (S, S), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([S * .14, S * .12, S * .86, S * .84], fill=(40, 110, 190))
    glow = glow.filter(ImageFilter.GaussianBlur(S * .12))
    img = Image.blend(img, Image.composite(glow, img, glow.convert('L')), .55)
    d = ImageDraw.Draw(img)

    scale = .74 if maskable else .9
    cx, cy = S / 2, S / 2
    R = S * .34 * scale / .9
    # nakrętka: dwie obwiednie sześciokąta
    layers = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layers)
    ld.polygon(hexagon(cx, cy, R, 30), outline=(88, 180, 255, 255), width=int(S * .028))
    ld.polygon(hexagon(cx, cy, R * .82, 30), outline=(141, 123, 255, 150), width=int(S * .012))
    # otwór
    r_in = R * .44
    ld.ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], outline=(190, 225, 255, 255), width=int(S * .022))
    r_in2 = R * .22
    ld.ellipse([cx - r_in2, cy - r_in2, cx + r_in2, cy + r_in2], fill=(88, 180, 255, 255))
    # trzy rysy gwintu
    for a in (90, 210, 330):
        x1, y1 = cx + r_in * .62 * math.cos(math.radians(a)), cy + r_in * .62 * math.sin(math.radians(a))
        x2, y2 = cx + r_in * 1.0 * math.cos(math.radians(a)), cy + r_in * 1.0 * math.sin(math.radians(a))
        ld.line([(x1, y1), (x2, y2)], fill=(190, 225, 255, 200), width=int(S * .014))
    blur = layers.filter(ImageFilter.GaussianBlur(S * .02))
    base = img.convert('RGBA')
    base = Image.alpha_composite(base, blur)
    base = Image.alpha_composite(base, layers)
    return base.convert('RGB')

def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)

normal = draw(False)
for n, s in (('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)):
    save(normal, n, s)
save(draw(True), 'icon-maskable-512.png', 512)
print('ikony zapisane w', OUT)
