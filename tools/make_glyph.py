"""Cut a painted floor glyph (or, with --crystal, any saturated glowing object: crystal
cluster, lit lantern glass, mushroom caps) (the gold and blue punctuation runes in Syntax Citadel)
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
args = [x for x in sys.argv[1:] if not x.startswith('--')]
CRYSTAL = '--crystal' in sys.argv     # any saturated, non-green object (crystals, lit lantern glass, mushroom caps)
ONLY_BLUE = '--blue' in sys.argv      # ignore gold in the box (a gold door frame beside blue wall runes)
NEAR = '--near' in sys.argv           # a wall rune: glows as he passes (default reach), not only underfoot
src = args[0]; x0, y0, x1, y1 = map(int, args[1:5]); out = args[5]
PAD = 7
bg = Image.open(src).convert('RGBA')
crop = bg.crop((x0 - PAD, y0 - PAD, x1 + PAD, y1 + PAD))
a = np.array(crop).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
GOLD = (r > 150) & (g > 100) & (b < 120) & (r > b + 50)
BLUE = (b > 120) & (b > r + 35) & (b > g + 10)
inner = np.zeros(GOLD.shape, bool); inner[PAD:-PAD, PAD:-PAD] = True
sat = a[..., :3].max(-1) - a[..., :3].min(-1); gray = a[..., :3].mean(-1)
GREEN = (g > r + 12) & (g > b + 12)
small = (x1 - x0) * (y1 - y0) < 6000                   # a lantern's glass: a tight box, a softer color test
m = ((sat > (60 if small else 88)) & ~GREEN & (gray > 105) & inner) if CRYSTAL else (((BLUE if ONLY_BLUE else (GOLD | BLUE))) & inner)   # crystal: bright AND vivid; the cave rock is dull purple
lab, n = ndimage.label(m, np.ones((3, 3))); sizes = ndimage.sum(m, lab, range(1, n + 1))
keep = [i + 1 for i, s in enumerate(sizes) if s > (6 if not CRYSTAL else 10 if small else 40)]
# a piece of a NEIGHBOURING rune caught by the box edge would light with this one
# (the bleed Magnolia saw): drop any piece that touches the box edge, unless that
# leaves nothing (a big wall-rune box legitimately runs to its edges)
edge = np.zeros(m.shape, bool); edge[PAD, :] = edge[-PAD - 1, :] = edge[:, PAD] = edge[:, -PAD - 1] = True
inside = [k for k in keep if not (edge & (lab == k)).any()]
m = np.isin(lab, keep if (NEAR or CRYSTAL) else (inside if inside else keep))   # wall runes and crystals keep everything: their boxes are drawn to contain whole strings
if not m.any(): sys.exit('no glyph pixels found in that box')
gold = GOLD[m].sum() >= BLUE[m].sum()
glow = np.array([255, 200, 90]) if gold else np.array([110, 185, 255])
if CRYSTAL:
    mean = a[m][:, :3].mean(0)                         # the object's own color, lightened
    glow = (mean + (255 - mean) * 0.45)
hot = np.array([255, 236, 150]) if gold else np.array([175, 225, 255])      # a brighter, still saturated, version of the rune's own color
# eight crisp frames (no blur: pixel art stays pixel art): off, five steps up to full
# light, then a slightly dimmer one the CSS pulses against. The rune itself shifts
# toward a saturated light of its own color; a 1px rim and a fainter 2px rim glow
# on the stone around it, hard edged.
LEVELS = (0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0, 0.88)
rim1 = ndimage.binary_dilation(m, iterations=1) & ~m
rim2 = ndimage.binary_dilation(m, iterations=2) & ~m & ~rim1
rim3 = ndimage.binary_dilation(m, iterations=3) & ~m & ~rim1 & ~rim2
frames = []
for t in LEVELS:
    fa = np.array(crop).astype(float)
    if t:
        if CRYSTAL:
            # brighten each facet in place: scale toward white by a third, then
            # pull the chroma back up so the lit crystal stays vivid, not chalky
            px = fa[m, :3]
            lit = px + (255 - px) * 0.34 * t
            mean = lit.mean(-1, keepdims=True)
            fa[m, :3] = mean + (lit - mean) * (1 + 0.45 * t)
        else:
            k = 0.95 * t
            fa[m, :3] = fa[m, :3] * (1 - k) + hot * k
        fa[rim1, :3] = fa[rim1, :3] * (1 - 0.9 * t) + glow * 0.9 * t
        fa[rim2, :3] = fa[rim2, :3] * (1 - 0.55 * t) + glow * 0.55 * t
        fa[rim3, :3] = fa[rim3, :3] * (1 - 0.25 * t) + glow * 0.25 * t
    frames.append(Image.fromarray(fa.clip(0, 255).astype(np.uint8)))
sheet = Image.new('RGBA', (crop.width * len(LEVELS), crop.height))
for i, fr in enumerate(frames): sheet.paste(fr, (i * crop.width, 0))
sheet.save(out)
row = {'kind': 'frames', 'mode': 'rune', 'sheet': out, 'frames': len(LEVELS)}
if not CRYSTAL and not NEAR: row['reach'] = 0.05      # a floor rune: he has to stand on it; a crystal or wall rune glows as he passes
row.update({
       'x': round((x0 - PAD) / bg.width, 5), 'y': round((y0 - PAD) / bg.height, 5),
       'w': round(crop.width / bg.width, 5), 'h': round(crop.height / bg.height, 5),
       'base': round(((y0 - PAD) if not (CRYSTAL or NEAR) else y1) / bg.height, 3)})     # floor: always behind him; a standing thing sorts by its foot
print(json.dumps(row))
