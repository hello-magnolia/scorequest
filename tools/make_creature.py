#!/usr/bin/env python3
"""
Build a battle creature for the Creature Lab (lab.html, Engine 2) from one uploaded drawing.

    python3 tools/make_creature.py pomelo
    python3 tools/make_creature.py lantern-rabbit
    python3 tools/make_creature.py all

What it does, in order:
  1. CLEAN   the upload (usually AI pixel art on a soft, uneven grid) to true native pixels:
             one colour per grid cell (most frequent wins, never an average), hard alpha,
             a merged palette that keeps rare vivid colours (eyes, leaf).
  2. POSES   the creature's own recipe bends that one drawing into pose frames
             (ears back, hurt, cheer...). This part is hand work per creature: see RECIPES.
  3. BREATH  four idle frames (rest, sink, out-breath, rise) with a part that follows a beat late.
  4. FAR     for a creature that stands NEAR, a true small sprite for the far end of the field
             (area-averaged, snapped to its own palette, outline redrawn), so it stays crisp.
  5. WRITE   assets/creatures/<id>/<pose>.png and print the numbers for data/creatures.js.

Sources live in sprites/creatures/. Committed frames stay faithful to the upload: nothing here
invents colours. Standard library + Pillow + numpy + scipy.

Adding a creature: put the upload in sprites/creatures/, add a RECIPES entry (grid from the
printed fit, then a poses() function), run this, paste the printed block into data/creatures.js.
With no poses() the creature still gets idle + breathing (+ far), and the engine falls back to
idle for any pose it lacks.
"""
import sys
from collections import Counter
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'sprites' / 'creatures'
OUT = ROOT / 'assets' / 'creatures'
FIELD = {'near': 1.25, 'far': 1.0}      # screen pixels per world unit at each end (keep in step with js/battle2.js)


# ---------------------------------------------------------------- 1. clean
def fit_grid(a, lo=14, hi=30):
    """Best pixel-grid period and offset per axis, from where the colour edges fall."""
    al = a[..., 3].astype(float); pre = a[..., :3] * (al[..., None] / 255)
    out = []
    for ax in (1, 0):
        d = np.abs(np.diff(pre, axis=ax)).sum(axis=2) + np.abs(np.diff(al, axis=ax))
        e = (d > 60).sum(axis=0 if ax == 1 else 1).astype(float)
        best = (-1, 0, 0)
        for S in np.arange(lo, hi, 0.01):
            for o in np.arange(0, S, 0.25):
                idx = np.round(np.arange(o, len(e), S)).astype(int); idx = idx[idx < len(e)]
                sc = e[idx].sum() / e.sum() * S
                if sc > best[0]: best = (sc, S, o)
        out.append(best)
    return out


def native(path, Sx, ox, Sy, oy, tol):
    """One sample per grid cell: the most frequent palette colour in the cell's core."""
    a = np.array(Image.open(path).convert('RGBA')); H, W = a.shape[:2]
    op = a[a[..., 3] > 200][:, :3]
    cnt = Counter(map(tuple, (op // 8 * 8 + 4).tolist()))
    pal = []
    for c, n in cnt.most_common():          # greedy merge: a colour joins the palette if nothing near it is there yet
        if n >= 120 and all(sum((x - y) ** 2 for x, y in zip(c, p)) ** .5 > tol for p in pal): pal.append(c)
    P = np.array(pal)
    flat = a[..., :3].reshape(-1, 1, 3).astype(int)
    idx = np.concatenate([((flat[i:i + 200000] - P[None]) ** 2).sum(2).argmin(1) for i in range(0, len(flat), 200000)]).reshape(H, W)
    xs = np.arange(ox, W, Sx); ys = np.arange(oy, H, Sy)
    out = np.zeros((len(ys) - 1, len(xs) - 1, 4), np.uint8)
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            y0, y1 = int(round(ys[j])) + 2, int(round(ys[j + 1])) - 2
            x0, x1 = int(round(xs[i])) + 2, int(round(xs[i + 1])) - 2
            al = a[y0:y1, x0:x1, 3]
            if (al > 128).mean() < 0.5: continue
            c = Counter(idx[y0:y1, x0:x1][al > 128].ravel().tolist()).most_common(1)[0][0]
            out[j, i, :3] = P[c]; out[j, i, 3] = 255
    m = out[..., 3] > 0
    nb = ndimage.convolve(m.astype(int), np.ones((3, 3)), mode='constant') - m
    out[m & (nb == 0)] = 0                   # orphans
    m = out[..., 3] > 0; ys_, xs_ = np.where(m)
    return out[ys_.min():ys_.max() + 1, xs_.min():xs_.max() + 1]


# ---------------------------------------------------------------- 2. pose helpers
def pad(a, l, r, t, b):
    H, W = a.shape[:2]; o = np.zeros((H + t + b, W + l + r, 4), np.uint8); o[t:t + H, l:l + W] = a; return o


def shear_rows(a, rows, x0, x1, fn):
    """Shift the pixels of those rows inside [x0, x1) sideways by fn(y)."""
    o = a.copy()
    for y in rows: o[y, x0:x1] = 0
    for y in rows:
        dx = fn(y)
        for i, p in enumerate(a[y, x0:x1]):
            if p[3]: o[y, x0 + i + dx] = p
    return o


def shear_cols(a, fn):
    """Shift each column up or down by fn(x): the front end sinks or the head lifts."""
    o = np.zeros_like(a); H, W = a.shape[:2]
    for x in range(W):
        dy = fn(x)
        for y in range(H):
            if a[y, x, 3] and 0 <= y + dy < H: o[y + dy, x] = a[y, x]
    return o


def put(a, x, y, c): a[y, x] = (*c, 255)


# ---------------------------------------------------------------- 3. breathing
def sink(a, seam_max, lag=None, mode='all'):
    """Everything above the belly sinks one pixel, column by column, keeping each column's bottom outline.
    lag=(x0, x1, k): the part above row k in those columns (ears, carrot) follows a beat late.
    'all' = body and lagging part down; 'body' = body down, lagging part still up; 'lag' = body up, lagging part still down."""
    H, W = a.shape[:2]; o = a.copy()
    for x in range(W):
        col = a[:, x]; op = col[:, 3] > 0
        if not op.any(): continue
        seam = None
        for y in range(min(seam_max, H - 2), 0, -1):
            if op[y] and op[y + 1]: seam = y; break
        if seam is None: continue
        lagging = lag is not None and lag[0] <= x < lag[1]
        k = lag[2] if lagging else -1
        if mode == 'lag':
            if lagging: o[1:k + 1, x] = col[0:k]; o[0, x] = 0
            continue
        top = k + 1 if (mode == 'body' and lagging) else 1
        o[top:seam + 1, x] = col[top - 1:seam]
        if top == 1: o[0, x] = 0
    return o


def bulge(a, rows, xc):
    """The rump eases back one pixel on the out-breath."""
    o = a.copy()
    for y in rows: o[y, 0:xc] = a[y, 1:xc + 1]
    return o


def breath(base, seam, lag, rump_rows, rump_x):
    return [base, sink(base, seam, lag, 'body'), bulge(sink(base, seam, lag, 'all'), rump_rows, rump_x), sink(base, seam, lag, 'lag')]


# ---------------------------------------------------------------- 4. far sprite
def far(a, scale):
    H, W = a.shape[:2]; w, h = round(W * scale), round(H * scale)
    al = np.array(Image.fromarray(a, 'RGBA').getchannel('A').resize((w, h), Image.BOX)) >= 128
    arr = a.astype(float); dark = (arr[..., :3].sum(axis=2) < 150) & (a[..., 3] > 0); fur = (a[..., 3] > 0) & ~dark
    num = np.array(Image.fromarray((arr[..., :3] * fur[..., None]).astype(np.uint8), 'RGB').resize((w, h), Image.BOX)).astype(float)
    den = np.array(Image.fromarray((fur * 255).astype(np.uint8), 'L').resize((w, h), Image.BOX)).astype(float) / 255
    col = num / np.maximum(den, 1e-3)[..., None]
    pal = np.unique(a[fur][:, :3], axis=0).astype(float)
    line = np.array(sorted(map(tuple, a[dark][:, :3]), key=lambda c: sum(c))[len(a[dark]) // 2])
    o = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        for x in range(w):
            if not al[y, x]: continue
            edge = y == 0 or x == 0 or y == h - 1 or x == w - 1 or not (al[y - 1, x] and al[y + 1, x] and al[y, x - 1] and al[y, x + 1])
            o[y, x, :3] = line if (edge or den[y, x] < .2) else pal[((pal - col[y, x]) ** 2).sum(1).argmin()]
            o[y, x, 3] = 255
    return o


# ---------------------------------------------------------------- recipes (the hand work, one per creature)
DARK = (42, 42, 42); WHITE = (253, 253, 253)


def rabbit_poses(src):
    """Lantern Rabbit: side view, source faces right (the engine flips it). 28x28 native."""
    L, T = 6, 2
    b0 = pad(src, L, 6, T, 0); X = lambda x: x + L; Y = lambda y: y + T
    EARS = range(Y(0), Y(10))

    def ears(a, kb, kf):   # back ear (x <= 18) and front ear lean by kb / kf px per row above the head
        a = shear_rows(a, EARS, X(10), X(19), lambda y: int(round((Y(10) - y) * kb)))
        return shear_rows(a, EARS, X(19), X(28), lambda y: int(round((Y(10) - y) * kf)))

    def eyes(a, mode):
        for ex in (20, 25):
            if mode == 'shut': put(a, X(ex), Y(16), WHITE); put(a, X(ex), Y(17), DARK); put(a, X(ex - 1), Y(17), DARK)
            elif mode == 'happy': put(a, X(ex), Y(16), DARK); put(a, X(ex), Y(17), WHITE); put(a, X(ex - 1), Y(17), DARK); put(a, X(ex + 1), Y(17), DARK)
            elif mode == 'set': put(a, X(ex), Y(16), DARK)
            elif mode == 'blink': put(a, X(ex), Y(16), WHITE); put(a, X(ex), Y(17), DARK)
        return a

    R = {'idle': b0}
    blink = eyes(b0.copy(), 'blink')
    R['windup'] = eyes(ears(b0, -.45, -.45), 'set')
    lp = ears(b0, -.8, -.7)
    lp = shear_rows(lp, range(Y(23), Y(28)), X(16), X(24), lambda y: 1)     # front legs reach forward
    lp = shear_rows(lp, range(Y(23), Y(27)), X(3), X(9), lambda y: -1)      # hind legs kick back
    R['leap'] = eyes(lp, 'set')
    h = eyes(ears(b0, -.6, .35), 'shut'); put(h, X(24), Y(20), (120, 30, 30))   # open mouth
    R['hurt'] = h
    R['bow'] = eyes(ears(b0, .25, .25), 'happy')
    R['happy'] = eyes(b0.copy(), 'happy')
    args = (Y(21), (X(10), X(28), Y(7)), range(Y(13), Y(20)), X(6))
    for i, f in enumerate(breath(b0, *args)): R['idle%d' % i] = f
    for i, f in enumerate(breath(blink, *args)): R['blink%d' % i] = f
    return R, {'feet': 0}


def pomelo_poses(src):
    """Pomelo: three-quarter back view, faces up and right. 41x45 native."""
    L, T = 2, 3
    c0 = pad(src, L, 2, T, 5); X = lambda x: x + L; Y = lambda y: y + T
    FUR = tuple(int(v) for v in c0[Y(15), X(34), :3]); EYE = tuple(int(v) for v in c0[Y(15), X(35), :3])
    LEAF = range(Y(0), Y(4))

    def leaf_back(a): return shear_rows(a, LEAF, X(31), X(38), lambda y: -((Y(4) - y + 1) // 2))

    def leaf_droop(a):
        o = a.copy(); px = []
        for y in range(Y(0), Y(4)):
            for x in range(X(32), X(37)):
                if a[y, x, 3]: px.append((x - X(33), y - Y(4), a[y, x].copy())); o[y, x] = 0
        for dx, dy, p in px:                 # a quarter turn clockwise about the stem
            nx, ny = X(34) - dy, Y(4) + dx + 1
            if 0 <= ny < o.shape[0] and 0 <= nx < o.shape[1] and not o[ny, nx, 3]: o[ny, nx] = p
        return o

    P = {'idle': c0}
    P['crouch'] = shear_cols(leaf_back(c0), lambda x: int(np.clip(round((x - X(15)) / 9), 0, 2)))     # front end sinks, leaf flicks back
    P['rear'] = shear_cols(leaf_back(c0), lambda x: -int(np.clip(round((x - X(12)) / 8), 0, 3)))      # head thrown up
    hu = leaf_droop(c0); put(hu, X(35), Y(15), FUR)
    for ex in (34, 35, 36): put(hu, X(ex), Y(16), EYE)                                                   # eye shut
    P['hurt'] = shear_cols(hu, lambda x: int(np.clip(round((x - X(20)) / 10), 0, 2)))
    ch = leaf_back(c0).copy(); put(ch, X(35), Y(16), FUR); put(ch, X(34), Y(16), EYE); put(ch, X(36), Y(16), EYE)   # eye curved up
    P['cheer'] = shear_cols(ch, lambda x: -int(np.clip(round((x - X(12)) / 8), 0, 3)))
    P['sleep'] = shear_cols(hu, lambda x: int(np.clip(round((x - X(13)) / 7), 0, 4)))                 # slumped, eye shut, leaf drooped
    for i, f in enumerate(breath(c0, Y(33), (X(28), X(38), Y(8)), range(Y(18), Y(31)), X(8))): P['idle%d' % i] = f
    return P, {'feet': 5, 'far': ('idle', 'crouch', 'rear')}


RECIPES = {
    #                source upload                         grid: Sx, ox, Sy, oy   palette merge   stands   world size   poses
    'lantern-rabbit': dict(src='lantern-rabbit.png', grid=(22.28, 13.25, 22.39, 2.75), tol=26, spot='far', size=28, poses=rabbit_poses),
    'pomelo':         dict(src='pomelo-back.png',    grid=(19.61, 1.5, 19.93, 13.5),   tol=22, spot='near', size=36, poses=pomelo_poses),
}


def build(cid):
    r = RECIPES[cid]; path = SRC / r['src']
    if not r.get('grid'):
        print(cid, 'grid fit (score, period, offset) for x then y:', [(round(s, 2), round(S, 2), o) for s, S, o in fit_grid(np.array(Image.open(path).convert('RGBA')).astype(float))])
        return
    src = native(path, *r['grid'], r['tol'])
    if r.get('poses'): frames, info = r['poses'](src)
    else: frames, info = {'idle': src}, {'feet': 0}
    h_art = src.shape[0]
    far_scale = FIELD['far'] / FIELD[r['spot']]
    if r['spot'] == 'near':
        for k in info.get('far', ('idle',)): frames['far_' + k] = far(frames[k], far_scale)
    out = OUT / cid; out.mkdir(parents=True, exist_ok=True)
    for k, v in frames.items():
        assert set(np.unique(v[..., 3])) <= {0, 255}
        Image.fromarray(v, 'RGBA').save(out / (k + '.png'), optimize=True)
    w, h = frames['idle'].shape[1], frames['idle'].shape[0]
    cols = len(np.unique(src[src[..., 3] > 0][:, :3], axis=0))
    print(f"{cid}: native {src.shape[1]}x{src.shape[0]}, {cols} colours, {len(frames)} frames -> assets/creatures/{cid}/")
    print(f"  for data/creatures.js:  w: {w}, h: {h}, art: {h_art}, feet: {info['feet']}, size: {r['size']}, spot: '{r['spot']}'" +
          (f", farArt: {far_scale:g}" if r['spot'] == 'near' else ''))
    print('  poses:', sorted(frames))


if __name__ == '__main__':
    ids = sys.argv[1:] or ['all']
    for cid in (RECIPES if ids == ['all'] else ids): build(cid)
