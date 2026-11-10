"""Cut a painted floor glyph (the gold and blue punctuation runes in Syntax Citadel)
out of a realm painting and repaint it lit, as a 4-frame sheet for a realm.js
fx.props row of kind 'frames' (same frame grammar as a lantern: dark / kindling /
full / full-minus, so it kindles as Pomelo steps up, pulses slowly while he stands
there, and dims after he leaves). Usage:
  python3 tools/make_glyph.py assets/realms/syntaxcitadel.png X0 Y0 X1 Y1 out.png
X0..Y1 = a box around the glyph in painting px. The glyph pixels are found by color
(warm gold or saturated blue against pale stone); tune GOLD / BLUE for other realms.
Prints the props row to paste. No em dashes anywhere."""
import sys, json, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
src = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); out = sys.argv[6]
PAD = 22
bg = Image.open(src).convert('RGBA')
crop = bg.crop((x0 - PAD, y0 - PAD, x1 + PAD, y1 + PAD))
a = np.array(crop).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
GOLD = (r > 150) & (g > 100) & (b < 120) & (r > b + 50)
BLUE = (b > 120) & (b > r + 35) & (b > g + 10)
inner = np.zeros(GOLD.shape, bool); inner[PAD:-PAD, PAD:-PAD] = True
m = (GOLD | BLUE) & inner
lab, n = ndimage.label(m, np.ones((3, 3))); sizes = ndimage.sum(m, lab, range(1, n + 1))
m = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 6])
if not m.any(): sys.exit('no glyph pixels found in that box')
gold = GOLD[m].sum() >= BLUE[m].sum()
glow = np.array([255, 200, 90]) if gold else np.array([110, 185, 255])
hot = np.array([255, 222, 110]) if gold else np.array([140, 205, 255])      # a brighter, still saturated, version of the rune's own color
frames = []
for t in (0, 0.45, 1.0, 0.8):
    f = crop.copy()
    if t:
        # a soft halo around the rune, then the rune itself brightened toward a hot core
        wide = ndimage.binary_dilation(m, iterations=3)
        for blur, alpha in ((12 + 4 * t, 170 * t), (4, 120 * t)):     # a wide soft glow and a tight bright rim
            halo = np.zeros(a.shape[:2] + (4,), np.uint8); halo[wide] = [glow[0], glow[1], glow[2], int(alpha)]
            f = Image.alpha_composite(f, Image.fromarray(halo).filter(ImageFilter.GaussianBlur(blur)))
        fa = np.array(f).astype(float)
        k = 0.7 * t
        fa[m, :3] = fa[m, :3] * (1 - k) + hot * k
        f = Image.fromarray(fa.clip(0, 255).astype(np.uint8))
    frames.append(f)
sheet = Image.new('RGBA', (crop.width * 4, crop.height))
for i, fr in enumerate(frames): sheet.paste(fr, (i * crop.width, 0))
sheet.save(out)
row = {'kind': 'frames', 'sheet': out, 'frames': 4,
       'x': round((x0 - PAD) / bg.width, 5), 'y': round((y0 - PAD) / bg.height, 5),
       'w': round(crop.width / bg.width, 5), 'h': round(crop.height / bg.height, 5),
       'base': round((y0 - PAD) / bg.height, 3)}     # floor: always behind him
print(json.dumps(row))
