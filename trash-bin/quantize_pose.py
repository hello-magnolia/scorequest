#!/usr/bin/env python3
"""ScoreQuest sprite quantizer.

Converts a high-res image OF pixel art into a true pixel grid mapped onto
the capybara's shared palette (/tmp/capy_clean.json), with artifact cleanup.

Usage: python3 quantize_pose.py <input.png> <output.json> [palette.json]
palette.json defaults to /tmp/capy_clean.json; pass NEW:<path> to build a
fresh palette from this image and save it there.
Writes {"map": [...rows...]} and prints the grid.
"""
import sys, json
from PIL import Image

def quantize(path, palette_json='/tmp/capy_clean.json'):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    px = im.load()

    def is_bg(c):
        r, g, b = c
        return abs(r - g) < 12 and abs(g - b) < 12 and r > 175

    minx, miny, maxx, maxy = W, H, 0, 0
    for y in range(H):
        for x in range(W):
            if not is_bg(px[x, y]):
                minx = min(minx, x); maxx = max(maxx, x)
                miny = min(miny, y); maxy = max(maxy, y)

    def cell_score(p, ox, oy):
        import random
        random.seed(5); sc = 0
        for _ in range(300):
            cx = random.randrange(max(1, (maxx - minx) // p)) * p + minx + ox
            cy = random.randrange(max(1, (maxy - miny) // p)) * p + miny + oy
            cs = [px[min(cx + dx, W - 1), min(cy + dy, H - 1)]
                  for dx in (3, p // 2, p - 4) for dy in (3, p // 2, p - 4)]
            mr = sum(c[0] for c in cs) / 9; mg = sum(c[1] for c in cs) / 9; mb = sum(c[2] for c in cs) / 9
            sc += sum(abs(c[0] - mr) + abs(c[1] - mg) + abs(c[2] - mb) for c in cs)
        return sc

    import os
    fixed = os.environ.get('SQ_PITCH')
    pmin = int(os.environ.get('SQ_PMIN', 12))
    pmax = int(os.environ.get('SQ_PMAX', 32))
    pitches = [int(fixed)] if fixed else range(pmin, pmax + 1)
    # score each pitch at its best phase; multiples of the true pitch also
    # score well (harmonics), so pick the SMALLEST pitch within 12% of the
    # global best rather than the raw minimum
    per_pitch = {}
    for p in pitches:
        bestp = None
        for ox in range(0, p, 2):
            for oy in range(0, p, 2):
                v = cell_score(p, ox, oy)
                if bestp is None or v < bestp[0]:
                    bestp = (v, ox, oy)
        per_pitch[p] = bestp
    gmin = min(v[0] for v in per_pitch.values())
    P = min(p for p, v in per_pitch.items() if v[0] <= gmin * 1.12)
    _, OX, OY = per_pitch[P]
    print('pitch=%d phase=%d,%d (fundamental of %d candidates within tolerance)'
          % (P, OX, OY, sum(1 for v in per_pitch.values() if v[0] <= gmin * 1.12)), file=sys.stderr)

    gx0, gy0 = minx + OX, miny + OY
    while gx0 - P >= minx - P // 2: gx0 -= P
    while gy0 - P >= miny - P // 2: gy0 -= P
    cols = (maxx - gx0) // P + 1
    rows = (maxy - gy0) // P + 1

    def cell(cx, cy):
        xs = [gx0 + cx * P + P // 2 + d for d in (-3, 0, 3)]
        ys = [gy0 + cy * P + P // 2 + d for d in (-3, 0, 3)]
        cs = [px[min(max(x, 0), W - 1), min(max(y, 0), H - 1)] for x in xs for y in ys]
        cs.sort(key=lambda c: c[0] + c[1] + c[2])
        return cs[4]

    LEGS = 'obshmenwafg'
    if palette_json.startswith('NEW:'):
        # build a palette from this image: frequent cell colors, merged
        from collections import Counter
        freq = Counter()
        for cy in range(rows):
            for cx in range(cols):
                c = cell(cx, cy)
                if not is_bg(c): freq[c] += 1
        pal = []
        for c, n in freq.most_common():
            for pc in pal:
                if abs(c[0]-pc[0]) + abs(c[1]-pc[1]) + abs(c[2]-pc[2]) < 70: break
            else:
                pal.append(c)
        pal = pal[:10]
        json.dump({'palette': ['#%02x%02x%02x' % c for c in pal]}, open(palette_json[4:], 'w'))
    else:
        d0 = json.load(open(palette_json))
        pal = [tuple(int(v[j:j + 2], 16) for j in (1, 3, 5)) for v in d0['palette']]

    def nearest(c):
        if is_bg(c): return '.'
        bd, bi = 10 ** 9, 0
        for i, pc in enumerate(pal):
            dd = abs(c[0] - pc[0]) + abs(c[1] - pc[1]) + abs(c[2] - pc[2])
            if dd < bd: bd, bi = dd, i
        return LEGS[bi]

    amap = [''.join(nearest(cell(x, y)) for x in range(cols)) for y in range(rows)]
    while amap and set(amap[0]) == {'.'}: amap.pop(0)
    while amap and set(amap[-1]) == {'.'}: amap.pop()
    while amap and all(r[0] == '.' for r in amap): amap = [r[1:] for r in amap]
    while amap and all(r[-1] == '.' for r in amap): amap = [r[:-1] for r in amap]

    g = [list(r) for r in amap]
    R, C = len(g), len(g[0])
    def at(x, y): return g[y][x] if 0 <= y < R and 0 <= x < C else '.'
    def nb(x, y):
        return [at(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx, dy) != (0, 0)]
    for y in range(R):
        for x in range(C):
            if g[y][x] in 'wfg':
                ns = nb(x, y)
                g[y][x] = '.' if ns.count('.') >= 3 else ('m' if ns.count('m') >= 2 else 'o')
    for y in range(R):
        for x in range(C):
            if g[y][x] == 'h':
                g[y][x] = 's' if '.' in nb(x, y) else 'a'
    for y in range(1, R - 1):
        for x in range(1, C - 1):
            if g[y][x] == '.' and nb(x, y).count('.') <= 2:
                fur = [c for c in nb(x, y) if c in 'oba']
                g[y][x] = max(set(fur), key=fur.count) if fur else 's'
    return [''.join(r) for r in g]

if __name__ == '__main__':
    amap = quantize(sys.argv[1], sys.argv[3] if len(sys.argv) > 3 else '/tmp/capy_clean.json')
    json.dump({'map': amap}, open(sys.argv[2], 'w'))
    print(len(amap[0]), 'x', len(amap))
    for r in amap: print(r)
