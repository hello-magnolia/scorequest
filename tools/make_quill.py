"""Cut a quill standing in an inkpot (Syntax Citadel bridge posts) out of a realm
painting as a sway prop that pivots at its FOOT (the pot), the opposite of a hanging
tag: sprite (the feather, alpha) plus patch (the painting with the feather inpainted
away). Usage:
  python3 tools/make_quill.py assets/realms/syntaxcitadel.png X0 Y0 X1 Y1 outdir name
X0..Y1 = a box around the feather down to where it meets the pot. Prints the props
row to paste. No em dashes anywhere."""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage
src = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); outdir, name = sys.argv[6], sys.argv[7]
bg = Image.open(src).convert('RGB'); A = np.array(bg).astype(int)
a = A[y0:y1, x0:x1]; r, g, b = a[..., 0], a[..., 1], a[..., 2]; gray = a.mean(-1)
sat = a.max(-1) - a.min(-1)
pale = (gray > 100) & (gray < 222) & (b >= r - 10) & (sat < 36)   # the feather: cool grey; the stone around it is warm
lab, n = ndimage.label(pale, np.ones((3, 3))); sizes = ndimage.sum(pale, lab, range(1, n + 1))
pale = lab == (int(np.argmax(sizes)) + 1)                           # the feather is the one big pale piece; the pot's rim stays put
hull = ndimage.binary_fill_holes(ndimage.binary_closing(pale, np.ones((3, 3)), iterations=2))
ring = ndimage.binary_dilation(hull, np.ones((3, 3)), iterations=2) & ~hull
m = hull | (ring & (gray < 100))                                   # plus the ink outline
rgba = np.zeros(a.shape[:2] + (4,), np.uint8); rgba[..., :3] = a; rgba[..., 3] = m * 255
Image.fromarray(rgba).save(f'{outdir}/{name}.png')
# the patch: fill the feather's hole with a normalized blur of the painting
# around it (a soft wash of the stone or shadow behind), which never ghosts the
# feather and has no streaks; only a sliver of it ever shows as the quill tilts
hole = ndimage.binary_dilation(m, iterations=3)
keep = (~hole).astype(float)
patch = a.astype(float).copy()
for sigma in (3, 6, 12):
    num = np.stack([ndimage.gaussian_filter(a[..., c] * keep, sigma) for c in range(3)], -1)
    den = ndimage.gaussian_filter(keep, sigma)[..., None]
    fill = num / np.maximum(den, 1e-3)
    ok = (den[..., 0] > 0.05) & hole
    patch[ok] = fill[ok]; keep[ok] = 1; a = np.where(hole[..., None], patch, a).astype(int) if False else a
patch = patch.clip(0, 255).astype(np.uint8)
Image.fromarray(patch).save(f'{outdir}/{name}-patch.png')
ys, xs = np.where(m)
row = {'kind': 'sway', 'sprite': f'{outdir}/{name}.png', 'patch': f'{outdir}/{name}-patch.png',
       'x': round(x0 / bg.width, 5), 'y': round(y0 / bg.height, 5), 'w': round((x1 - x0) / bg.width, 5), 'h': round((y1 - y0) / bg.height, 5),
       'pivot': [round(float(xs[ys == ys.max()].mean()) / (x1 - x0), 3), 1.0],   # swings from the pot
       'base': round(y1 / bg.height, 3)}
print(json.dumps(row))
