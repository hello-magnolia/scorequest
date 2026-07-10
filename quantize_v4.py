#!/usr/bin/env python3
"""ScoreQuest sprite quantizer v4 — the good one.

Converts a high-res AI render OF pixel art into a true sprite map.
Learned the hard way across four generations:
  - AI renders' pseudo-pixels WOBBLE; point sampling aliases into warps.
    Fix: area integration (BOX downsample) so each output pixel averages
    its whole source region, then palette-snapping re-crisps it.
  - Palettes built near sprite edges absorb background/checker grays that
    paint dirty fringes. Fix: build palettes from eroded-interior pixels
    only, with mid-luminance grays filtered.
  - AI edges are anti-aliased; matching them is wrong. Fix: enforce a
    continuous 1px outline (darkest palette color) around the silhouette.
  - Reconstruction-error metrics choose good SIZES but reward soft edges;
    the finish is always a human call.

Usage:
  python3 quantize_v4.py in.png out.json --palette NEW:pal.json --width 38
  python3 quantize_v4.py in.png out.json --palette pal.json --scale 16.4

--width sets the output width for THIS image; --scale (source px per cell)
keeps a whole frame set at one physical scale. Writes {"map": [...],
"chars": "...", "palette": [...]} . Requires numpy + pillow.
"""
import sys, json, argparse
import numpy as np
from PIL import Image
from collections import Counter

CHARS = 'obshmenwfg'


def load(path):
    im = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    bg = (np.abs(r - g) < 14) & (np.abs(g - b) < 14) & (r > 172)
    alpha = (~bg).astype(np.float64)
    ys, xs = np.where(alpha > 0)
    sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    return im[sl], alpha[sl]


def build_palette(im, alpha, n=6):
    er = alpha > 0
    for _ in range(4):
        er = er & np.roll(er, 1, 0) & np.roll(er, -1, 0) & np.roll(er, 1, 1) & np.roll(er, -1, 1)
    freq = Counter(map(tuple, im[er].astype(int)[::7]))
    pal = []
    for c, _ in freq.most_common(4000):
        r, g, b = c
        lum = (r + g + b) / 3
        if max(r, g, b) - min(r, g, b) < 22 and 60 < lum < 200:
            continue  # background/checker gray contamination
        for pc in pal:
            if abs(r - pc[0]) + abs(g - pc[1]) + abs(b - pc[2]) < 65:
                break
        else:
            pal.append(c)
        if len(pal) == n:
            break
    return pal


def quantize(path, palette, tw=None, scale=None):
    im, alpha = load(path)
    H, W = alpha.shape
    if tw is None:
        tw = max(1, round(W / scale))
    th = max(1, round(H * tw / W))
    prem = im * alpha[..., None]
    pi = Image.fromarray(np.concatenate([prem, alpha[..., None] * 255], axis=2).astype(np.uint8), 'RGBA')
    small = np.asarray(pi.resize((tw, th), Image.BOX), dtype=np.float64)
    a = small[..., 3] / 255.0
    m = a > 0.5
    rgb = np.zeros((th, tw, 3))
    rgb[m] = small[..., :3][m] / a[m][:, None]
    pal = np.array(palette, dtype=np.float64)
    idx = np.abs(rgb[..., None, :] - pal[None, None, :, :]).sum(axis=3).argmin(axis=2)
    g = [[CHARS[idx[y, x]] if m[y, x] else '.' for x in range(tw)] for y in range(th)]
    # despeckle orphans
    for _ in range(2):
        for y in range(th):
            for x in range(tw):
                if g[y][x] != '.':
                    n = sum(1 for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                            if (dx, dy) != (0, 0) and 0 <= y + dy < th and 0 <= x + dx < tw
                            and g[y + dy][x + dx] != '.')
                    if n <= 1:
                        g[y][x] = '.'
    # enforce the 1px dark outline around the silhouette
    outline = CHARS[int(np.array(palette).sum(axis=1).argmin())]
    for y in range(th):
        for x in range(tw):
            if g[y][x] not in ('.', outline):
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if not (0 <= yy < th and 0 <= xx < tw) or g[yy][xx] == '.':
                        g[y][x] = outline
                        break
    return [''.join(r) for r in g]


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('output')
    ap.add_argument('--palette', required=True, help='pal.json or NEW:pal.json to build one')
    ap.add_argument('--width', type=int)
    ap.add_argument('--scale', type=float)
    args = ap.parse_args()

    if args.palette.startswith('NEW:'):
        im, alpha = load(args.input)
        pal = build_palette(im, alpha)
        json.dump({'palette': ['#%02x%02x%02x' % tuple(c) for c in pal]}, open(args.palette[4:], 'w'))
    else:
        pal = [tuple(int(v[j:j + 2], 16) for j in (1, 3, 5))
               for v in json.load(open(args.palette))['palette']]

    amap = quantize(args.input, pal, tw=args.width, scale=args.scale)
    json.dump({'map': amap, 'chars': CHARS[:len(pal)],
               'palette': ['#%02x%02x%02x' % tuple(c) for c in pal]}, open(args.output, 'w'))
    print(len(amap[0]), 'x', len(amap), file=sys.stderr)
    for r in amap:
        print(r)
