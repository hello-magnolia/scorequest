"""Cut a painted floor glyph (the gold and blue punctuation runes in Syntax Citadel)
out of a realm painting and repaint it lit, as an 8-frame sheet for a realm.js
fx.props row of kind 'frames' with mode 'rune' (ramps up as Pomelo steps ON it,
reach 0.05 of the stage, pulses softly while he stands there, ramps down after he
leaves; see .rw-prop-rune in style.css). Usage:
  python3 tools/make_glyph.py assets/realms/syntaxcitadel.png X0 Y0 X1 Y1 out.png
X0..Y1 = a box around the glyph in painting px. The glyph pixels are found by color
(warm gold or saturated blue against pale stone); tune GOLD / BLUE for other realms.
Prints the props row to paste. No em dashes anywhere."""
import sys, json, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
src = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); out = sys.argv[6]
PAD = 6
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
hot = np.array([255, 226, 120]) if gold else np.array([150, 212, 255])      # a brighter, still saturated, version of the rune's own color
# eight crisp frames (no blur: pixel art stays pixel art): off, five steps up to full
# light, then a slightly dimmer one the CSS pulses against. The rune itself shifts
# toward a saturated light of its own color; a 1px rim and a fainter 2px rim glow
# on the stone around it, hard edged.
LEVELS = (0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0, 0.88)
rim1 = ndimage.binary_dilation(m, iterations=1) & ~m
rim2 = ndimage.binary_dilation(m, iterations=2) & ~m & ~rim1
frames = []
for t in LEVELS:
    fa = np.array(crop).astype(float)
    if t:
        k = 0.78 * t
        fa[m, :3] = fa[m, :3] * (1 - k) + hot * k
        fa[rim1, :3] = fa[rim1, :3] * (1 - 0.6 * t) + glow * 0.6 * t
        fa[rim2, :3] = fa[rim2, :3] * (1 - 0.25 * t) + glow * 0.25 * t
    frames.append(Image.fromarray(fa.clip(0, 255).astype(np.uint8)))
sheet = Image.new('RGBA', (crop.width * len(LEVELS), crop.height))
for i, fr in enumerate(frames): sheet.paste(fr, (i * crop.width, 0))
sheet.save(out)
row = {'kind': 'frames', 'mode': 'rune', 'sheet': out, 'frames': len(LEVELS), 'reach': 0.05,
       'x': round((x0 - PAD) / bg.width, 5), 'y': round((y0 - PAD) / bg.height, 5),
       'w': round(crop.width / bg.width, 5), 'h': round(crop.height / bg.height, 5),
       'base': round((y0 - PAD) / bg.height, 3)}     # floor: always behind him
print(json.dumps(row))
