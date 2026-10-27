"""Cut a fire out of a realm painting as a 4-frame burning strip for realm.js fx.props
(kind 'frames', always on). Frames are the painting with the flame pixels licking up
and down a few px per column and brightening a little, so the fire looks alive without
anyone drawing it. Usage:
  python3 tools/make_fire.py assets/realms/storyforge.png X0 Y0 X1 Y1 outdir name [gentle]
Box in painting px around the fire with a little room above it. 'gentle' = windows and
lanterns: brightness only, no lick. Prints the props row to paste. No em dashes anywhere."""
import sys, json, numpy as np
from PIL import Image
src = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); outdir, name = sys.argv[6], sys.argv[7]
gentle = len(sys.argv) > 8 and sys.argv[8] == 'gentle'
PAD = 6
bg = Image.open(src).convert('RGBA'); W, H = bg.size
crop = bg.crop((x0 - PAD, y0 - PAD, x1 + PAD, y1 + PAD)); a = np.array(crop).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mask = (r > 215) & (g > 100) & (b < 130) & (r - g > 25) | ((r > 235) & (g > 190) & (b < 150))
mask[:PAD] = False; mask[-PAD:] = False; mask[:, :PAD] = False; mask[:, -PAD:] = False
rng = np.random.default_rng(7)
frames = []
for k, (lick, gain) in enumerate([(0, 1.0), (1, 1.05), (2, 0.96), (1, 1.08)]):
    f = a.copy()
    if not gentle and lick:
        for x in range(a.shape[1]):
            ys = np.where(mask[:, x])[0]
            if len(ys) < 3: continue
            s = int(lick + rng.integers(-1, 2)); s = max(0, min(s, 3))
            if not s: continue
            col = a[ys, x].copy()
            top = ys[0]
            # the flame grows by s: its pixels move up, the new top rows take the
            # old top colors so the tip stays the tip
            f[ys - s, x] = col
    fm = mask | (np.roll(mask, -3, axis=0))
    f[fm, :3] = np.clip(f[fm, :3] * gain, 0, 255)
    frames.append(Image.fromarray(f.astype(np.uint8)))
sheet = Image.new('RGBA', (crop.width * 4, crop.height))
for i, fr in enumerate(frames): sheet.paste(fr, (i * crop.width, 0))
sheet.save(f'{outdir}/{name}.png')
print(json.dumps({'kind': 'frames', 'always': True, 'sheet': f'{outdir}/{name}.png', 'frames': 4,
  'x': round((x0 - PAD) / W, 5), 'y': round((y0 - PAD) / H, 5), 'w': round(crop.width / W, 5), 'h': round(crop.height / H, 5),
  'base': round((y1 + PAD) / H, 3)}))
