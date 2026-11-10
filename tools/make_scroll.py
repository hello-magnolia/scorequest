"""A painted scroll held by a statue unrolls a little as Pomelo comes near: an
8-frame sheet for a realm.js fx.props row of kind 'frames', mode 'rune' (ramp up
in 0.55s, breathe, roll back up after he leaves). Frames are baked straight from
the painting: the paper just above the bottom roll is repeated downward and the
roll itself is pasted lower, over whatever is below (robe, plinth).
Usage:
  python3 tools/make_scroll.py SRC X0 Y0 X1 Y1  BX0 BX1  SY0 SY1  RY0 RY1  MAXDROP out.png [SX0 SX1]
X0..Y1 = the prop box (leave room below for the drop); BX0..BX1 = the paper's
x-range to extend (skip a hand that covers one end); SY0..SY1 = rows of plain paper
just above the roll (the strip that gets repeated); RY0..RY1 = the bottom roll's rows;
MAXDROP = how far it unrolls at full, in painting px. --ink draws a 2px ink
edge down the left side of the unrolled part (when a hand or curl hides the real edge). No em dashes anywhere."""
import sys, json, numpy as np
from PIL import Image
a = sys.argv
INK = '--ink' in a; a = [x for x in a if x != '--ink']
src = a[1]; x0, y0, x1, y1, bx0, bx1, sy0, sy1, ry0, ry1, drop = map(int, a[2:13]); out = a[13]
bg = Image.open(src).convert('RGBA'); W, H = bg.size
crop = np.array(bg.crop((x0, y0, x1, y1)))
# the paper strip may come from a narrower x-range (SX0 SX1, optional) and is
# tiled sideways to the roll's width: when a hand covers one end of the paper
# the clean part supplies the texture for the whole unrolled width
sx0, sx1 = (int(a[14]), int(a[15])) if len(a) > 15 else (bx0, bx1)
src_strip = crop[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0]
reps = int(np.ceil((bx1 - bx0) / src_strip.shape[1]))
strip = np.concatenate([src_strip] * reps, 1)[:, :bx1 - bx0].copy()
roll = crop[ry0 - y0:ry1 - y0, bx0 - x0:bx1 - x0].copy()
if len(a) > 15:   # same for the roll: tile its clean part sideways (its hidden end cap is redrawn as an ink edge)
    src_roll = crop[ry0 - y0:ry1 - y0, sx0 - x0:sx1 - x0]
    roll = np.concatenate([src_roll] * reps, 1)[:, :bx1 - bx0].copy()
LEVELS = (0, 0.12, 0.3, 0.5, 0.72, 0.88, 1.0, 0.93)
frames = []
for t in LEVELS:
    f = crop.copy(); d = int(round(drop * t))
    if d:
        # paper fills from the top of the old roll down by d, strip tiled; roll goes below it
        y = ry0 - y0; end = y + d; k = 0
        while y < end:
            h = min(strip.shape[0], end - y)
            f[y:y + h, bx0 - x0:bx1 - x0] = strip[(k * strip.shape[0]) % strip.shape[0]:][:h] if False else strip[:h]
            y += h; k += 1
        f[end:end + roll.shape[0], bx0 - x0:bx1 - x0] = roll
        if INK:   # a clean 2px ink edge down the unrolled side, where the strip could not carry one
            f[ry0 - y0:end + roll.shape[0], bx0 - x0:bx0 - x0 + 2] = [46, 36, 40, 255]
            if len(a) > 15: f[ry0 - y0:end + roll.shape[0], bx1 - x0 - 2:bx1 - x0] = [46, 36, 40, 255]
    frames.append(Image.fromarray(f))
sheet = Image.new('RGBA', (crop.shape[1] * len(LEVELS), crop.shape[0]))
for i, fr in enumerate(frames): sheet.paste(fr, (i * crop.shape[1], 0))
sheet.save(out)
print(json.dumps({'kind': 'frames', 'mode': 'rune', 'sheet': out, 'frames': len(LEVELS),
                  'x': round(x0 / W, 5), 'y': round(y0 / H, 5), 'w': round((x1 - x0) / W, 5), 'h': round((y1 - y0) / H, 5),
                  'base': round(y1 / H, 3)}))
