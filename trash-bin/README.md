# Trash bin

Retired files parked here instead of deleted, so anything moved by mistake
can be put straight back. Restore with:

    git mv trash-bin/<file> <original path>

Nothing in this folder is loaded by any page. If something breaks after a
cleanup, look here first.

## Contents

| File | Original path | What it was | Why retired | Parked |
| --- | --- | --- | --- | --- |
| companion_sketch.js | /companion_sketch.js | Node canvas sketch that drew an early hand-coded capybara on a 24x16 grid | Superseded by Magnolia's real sprite art and the quantize pipeline | 2026-07-30 |
| quantize_pose.py | /quantize_pose.py | Sprite quantizer, an earlier generation | Superseded by quantize_v4.py ("the good one", per its own header); mango.js documents regeneration through v4 only | 2026-07-30 |

## Deliberately kept (audited, not cruft)

- quantize_v4.py: the live sprite pipeline.
- render_preview.js: working dev tool that renders pixelworld scenes to preview PNGs; pixelworld.js is live on index and map.
- js/mango.js + sprites/: Mango, the capybara snatched in the intro, awaiting the Prism Peaks rescue. Listed in the CLAUDE.md backlog as planned content.
- All of assets/: every file, including the datadocks and prismpeaks boss art, is wired into running code.
- CREDITS.md: licensing attribution (Freesound audio), legally load-bearing.
