"""Cut a hanging/loose object (paper tag, sign, bell) out of a realm painting as a
sway prop for realm.js fx.props: a sprite (the object, alpha) plus a patch (the
painting with the object inpainted away). Usage:
  python3 tools/make_prop.py assets/realms/lorewood.png X0 Y0 X1 Y1 outdir name
X0..Y1 = a box around the object INCLUDING its string, in painting px. The mask is
the cream/paper pixels, closed and hole-filled, plus the dark outline ring around them;
tune the color test below for a non-paper object. Prints the props row to paste.
No em dashes anywhere."""
import sys, json, numpy as np, cv2
from PIL import Image
from scipy import ndimage
src = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); outdir, name = sys.argv[6], sys.argv[7]
bg = Image.open(src).convert('RGB'); A = np.array(bg).astype(int)
a = A[y0:y1, x0:x1]; r, g, b = a[..., 0], a[..., 1], a[..., 2]; gray = a.mean(-1)
cream = (r > 150) & (g > 115) & (b > 80) & (r > b + 25)          # paper: warm and bright
lab, n = ndimage.label(cream, np.ones((3, 3))); sizes = ndimage.sum(cream, lab, range(1, n + 1))
cream = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 3])
hull = ndimage.binary_fill_holes(ndimage.binary_closing(cream, np.ones((3, 3)), iterations=2))
ring = ndimage.binary_dilation(hull, np.ones((3, 3)), iterations=2) & ~hull
m = hull | (ring & (gray < 90))                                   # plus the ink outline
rgba = np.zeros(a.shape[:2] + (4,), np.uint8); rgba[..., :3] = a; rgba[..., 3] = m * 255
Image.fromarray(rgba).save(f'{outdir}/{name}.png')
hole = (ndimage.binary_dilation(m, iterations=1) * 255).astype(np.uint8)
patch = cv2.inpaint(a.astype(np.uint8)[..., ::-1], hole, 4, cv2.INPAINT_TELEA)[..., ::-1]
Image.fromarray(patch).save(f'{outdir}/{name}-patch.png')
ys, xs = np.where(m)
row = {'kind': 'sway', 'sprite': f'{outdir}/{name}.png', 'patch': f'{outdir}/{name}-patch.png',
       'x': round(x0 / bg.width, 5), 'y': round(y0 / bg.height, 5), 'w': round((x1 - x0) / bg.width, 5), 'h': round((y1 - y0) / bg.height, 5),
       'pivot': [round(float(xs[ys == ys.min()].mean()) / (x1 - x0), 3), round(float(ys.min()) / (y1 - y0), 3)],
       'base': round(y1 / bg.height, 3)}
print(json.dumps(row))
