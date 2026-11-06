#!/usr/bin/env python3
"""
Cut a painted bubble stream out of a realm painting as a 'bubbles' prop:
  <name>-sprite.png  the bubbles alone (alpha), tiled vertically by the CSS so
                     they rise forever
  <name>-patch.png   the same box with the bubbles inpainted away (water only)
and print the manifest row. The pale rings and cream highlights are found by
color, dilated to take their teal outlines along, and the hole is filled from
the surrounding water pixel by pixel so the patch reads as plain sea.

    python3 tools/make_bubbles.py assets/realms/inkreef.png inkreef a 300 150 95 160

Args: painting, realm, name, x y w h in art pixels. Standard library + Pillow + numpy.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent


def main():
    art, realm, name = sys.argv[1], sys.argv[2], sys.argv[3]
    x, y, w, h = map(int, sys.argv[4:8])
    im = Image.open(art).convert('RGB')
    W, H = im.size
    box = np.array(im.crop((x, y, x + w, y + h))).astype(int)
    r, g, b = box[..., 0], box[..., 1], box[..., 2]
    ring = (r > 165) & (g > 230) & (b > 215) & (r < 235)
    gleam = (r > 240) & (g > 240) & (b > 205) & (b < 235)
    core = ring | gleam
    # take the dark outline along: anything within 2px of a bubble pixel that
    # differs clearly from the water around the box
    water = np.median(box[~core], axis=0)
    # dim bubbles in dark water miss the color test but still sit well above the sea's brightness
    lum = box.mean(axis=2)
    core = core | ((lum > water.mean() + 70) & (r < g + 30))
    diff = np.abs(box - water).max(axis=2)
    near = core.copy()
    for _ in range(3):
        d = near.copy()
        d[1:] |= near[:-1]; d[:-1] |= near[1:]; d[:, 1:] |= near[:, :-1]; d[:, :-1] |= near[:, 1:]
        near = d
    # the halo around a bubble is water-ish (outline, soft shading): take all of
    # it; anything far from water color in that halo is coral or shell, leave it
    mask = core | (near & (r < g + 30))   # the halo is outline and shading in water hues; pink or orange there is coral, leave it
    # sprite: bubbles only
    sprite = np.dstack([box, np.where(mask, 255, 0)]).astype(np.uint8)
    # patch: fill the hole from its neighbours until nothing is left to fill
    patch = box.astype(float)
    hole = mask.copy()
    while hole.any():
        filled = np.zeros_like(patch); cnt = np.zeros(hole.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            src = np.roll(patch, (dy, dx), axis=(0, 1)); ok = np.roll(~hole, (dy, dx), axis=(0, 1))
            filled += np.where(ok[..., None], src, 0); cnt += ok
        edge = hole & (cnt > 0)
        patch[edge] = filled[edge] / cnt[edge][:, None]
        hole &= ~edge
    out = ROOT / 'assets' / 'fx' / 'props' / realm
    out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(sprite, 'RGBA').save(out / f'{name}-sprite.png')
    Image.fromarray(patch.round().clip(0, 255).astype(np.uint8), 'RGB').save(out / f'{name}-patch.png')
    print(f"{name}: {int(mask.sum())} bubble px, water {water.astype(int).tolist()}")
    print(f"        {{ kind: 'bubbles', sprite: 'assets/fx/props/{realm}/{name}-sprite.png', patch: 'assets/fx/props/{realm}/{name}-patch.png', "
          f"x: {x / W:.5f}, y: {y / H:.5f}, w: {w / W:.5f}, h: {h / H:.5f}, base: 0 }},")


if __name__ == '__main__':
    main()
