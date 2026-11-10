"""Cut a quill standing in an inkpot (Syntax Citadel bridge posts) out of a realm
painting as a sway prop that pivots at its FOOT (the pot), the opposite of a hanging
tag: sprite (the feather, alpha) plus patch (the painting with the feather inpainted
away). Usage:
  python3 tools/make_quill.py assets/realms/syntaxcitadel.png X0 Y0 X1 Y1 outdir name [POT_Y]
X0..Y1 = a box around the feather down to where it meets the pot. Prints the props
row to paste. No em dashes anywhere."""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage
src = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); outdir, name = sys.argv[6], sys.argv[7]
bg = Image.open(src).convert('RGB'); A = np.array(bg).astype(int)
a = A[y0:y1, x0:x1]; r, g, b = a[..., 0], a[..., 1], a[..., 2]; gray = a.mean(-1)
sat = a.max(-1) - a.min(-1)
POT_Y = int(sys.argv[8]) if len(sys.argv) > 8 else int((y1 - y0) * 0.7)   # box row where the pot's rim starts: nothing below it is feather
# the feather: cool grey, neither warm stone nor pale highlight stone; closed and
# hole-filled so the dark barb lines ride along, then the one big piece
warm = (r > b + 10) | (gray > 226)
cand = (~warm) & (gray > 112) & (sat < 60)
cand[POT_Y:] = False
cand = ndimage.binary_fill_holes(ndimage.binary_closing(cand, np.ones((3, 3)), iterations=3))
lab, n = ndimage.label(cand, np.ones((3, 3))); sizes = ndimage.sum(cand, lab, range(1, n + 1))
if n == 0: sys.exit('no feather found in that box')
hull = ndimage.binary_dilation(lab == (int(np.argmax(sizes)) + 1), np.ones((3, 3)), iterations=1)
ring = ndimage.binary_dilation(hull, np.ones((3, 3)), iterations=2) & ~hull
m = hull | (ring & (gray < 95) & ~warm)                            # plus the ink outline
rgba = np.zeros(a.shape[:2] + (4,), np.uint8); rgba[..., :3] = a; rgba[..., 3] = m * 255
Image.fromarray(rgba).save(f'{outdir}/{name}.png')
# the patch: fill the feather's hole by copying along the stair diagonal (2 px
# across per 1 px down), so the courses behind it run straight on; a diffusion
# inpaint smeared and a horizontal fill zig-zagged
SLOPE = (2, 1)
hole = ndimage.binary_dilation(m, iterations=2)
patch = a.copy()
H, W = a.shape[:2]
for y in range(H):
    for x in np.where(hole[y])[0]:
        done = False
        for k in range(1, max(H, W)):
            for sx in (1, -1):
                xx, yy = x + sx * k * SLOPE[0], y + sx * k * SLOPE[1]
                if 0 <= xx < W and 0 <= yy < H and not hole[yy, xx]: patch[y, x] = a[yy, xx]; done = True; break
            if done: break
patch = patch.clip(0, 255).astype(np.uint8)
Image.fromarray(patch).save(f'{outdir}/{name}-patch.png')
ys, xs = np.where(m)
row = {'kind': 'sway', 'sprite': f'{outdir}/{name}.png', 'patch': f'{outdir}/{name}-patch.png',
       'x': round(x0 / bg.width, 5), 'y': round(y0 / bg.height, 5), 'w': round((x1 - x0) / bg.width, 5), 'h': round((y1 - y0) / bg.height, 5),
       'pivot': [round(float(xs[ys == ys.max()].mean()) / (x1 - x0), 3), round(float(ys.max()) / (y1 - y0), 3)],   # swings from where it meets the pot
       'amp': 6,                                                         # a quiver, not a tag's swing (degrees)
       'base': round(y1 / bg.height, 3)}
print(json.dumps(row))
