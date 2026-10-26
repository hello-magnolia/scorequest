"""Cut a lantern (or any lit prop) out of a realm painting and repaint it lit, as a
4-frame sheet for realm.js `fx.lanterns`. Usage:
  python3 tools/make_lantern.py assets/realms/lorewood.png X Y W H WX0 WX1 WY0 WY1 out.png
X Y W H = the prop's box in the painting (px). WX0..WY1 = the window box(es) inside it,
comma-separated pairs for several windows ("27,35;46,54" style for x ranges, one y range).
Prints the fx.lanterns row to paste into the realm manifest. No em dashes anywhere."""
import sys, numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage
src, X, Y, W, H = sys.argv[1], *map(int, sys.argv[2:6])
xr = [tuple(map(int, p.split(','))) for p in sys.argv[6].split(';')]
y0, y1 = map(int, sys.argv[7].split(',')); out = sys.argv[8]
PAD = 40
bg = Image.open(src).convert('RGBA')
crop = bg.crop((X - PAD, Y - PAD, X + W + PAD, Y + H + PAD))
a = np.array(crop).astype(int); g = a[..., :3].mean(-1)
win = np.zeros(g.shape, bool)
for (bx0, bx1) in xr:
    box = np.zeros_like(win); box[PAD + y0:PAD + y1, PAD + bx0:PAD + bx1] = True
    win |= box & (g > 55) & (g < 130)
ys, xs = np.where(win); cy, cx = ys.mean(), xs.mean()
frames = []
for t in (0, 0.45, 0.8, 1.0):
    f = crop.copy()
    if t:
        halo = Image.new('RGBA', crop.size, (0, 0, 0, 0)); d = ImageDraw.Draw(halo)
        r = int(55 * t + 15); d.ellipse((cx - r, cy - r * 0.85, cx + r, cy + r * 0.85), fill=(255, 180, 80, int(135 * t)))
        f = Image.alpha_composite(f, halo.filter(ImageFilter.GaussianBlur(16)))
        fa = np.array(f); col = np.array([255, int(205 - 30 * (1 - t)), int(110 + 50 * (1 - t)), 255])
        fa[win] = (fa[win] * (1 - t) + col * t).astype(np.uint8)
        core = ndimage.binary_erosion(win, iterations=2)
        fa[core] = (fa[core] * (1 - t * 0.9) + np.array([255, 246, 205, 255]) * t * 0.9).astype(np.uint8)
        f = Image.fromarray(fa)
    frames.append(f)
sheet = Image.new('RGBA', (crop.width * 4, crop.height))
for i, fr in enumerate(frames): sheet.paste(fr, (i * crop.width, 0))
sheet.save(out)
print({'sheet': out, 'frames': 4, 'x': round((X - PAD) / bg.width, 5), 'y': round((Y - PAD) / bg.height, 5),
       'w': round(crop.width / bg.width, 5), 'h': round(crop.height / bg.height, 5)})
