# ScoreQuest — gamified SAT/ACT prep (concept prototype)

A premium SAT/ACT prep landing page set in a cozy pixel-RPG world. Desktop-first,
fully responsive, no build step, no dependencies at runtime.

## Run it

```bash
cd scorequest
python3 -m http.server 8000
# open http://localhost:8000
```

(Any static server works. Opening index.html directly also works, except the
hero-video auto-detection, which needs http.)

## What's inside

| Path | What it is |
|---|---|
| `index.html` | The whole page |
| `css/style.css` | Pixel-frame design system, reveals, responsive, reduced-motion |
| `js/pixelworld.js` | Procedural pixel-art engine: hero valley + 6 biome scenes |
| `js/main.js` | Hero animation loop, typewriter, scroll reveals, quest trail, count-ups, filters |
| `assets/` | Drop-in slot for generated media (see below) |

## Higgsfield-generated art (already wired in)

All nine hero/realm assets were generated with Higgsfield and are referenced
directly in `index.html`:

- **Hero**: Seedance 2.0 video — std mode, 1080p, 16:9, no audio, 10s
- **8 realm banners**: Nano Banana 2 images, 21:9, one per Digital SAT content
  domain (Information & Ideas, Craft & Structure, Expression of Ideas,
  Standard English Conventions, Algebra, Advanced Math, Problem-Solving &
  Data Analysis, Geometry & Trigonometry)

Every art slot uses a three-tier source chain: **local file → Higgsfield CDN →
live procedural canvas**. Run `bash download_assets.sh` once to localize all
assets (recommended — CDN links can expire); the page then prefers the local
copies automatically. If everything fails, the canvas world takes over, so the
site never shows a broken image.

The hero prompt, for regeneration reference:

> Cozy retro pixel-art landscape, classic 16-bit RPG overworld style. A calm
> green valley at golden-hour dusk: banded gradient sky from deep indigo to
> warm peach, a few twinkling pixel stars, two layers of purple mountain
> silhouettes, pine trees, wildflower meadow. A winding sand path leads uphill
> to a small stone academy tower with warm lit windows and a tiny gold beacon.
> Soft, calm ambient animation only: clouds drifting very slowly, stars
> twinkling, grass and flowers swaying gently, a few fireflies. No characters,
> no camera movement, seamless loop feel. Crisp pixels, limited palette
> (indigo #241B4D, dusk purple #6E4680, peach #EFA96E, meadow green #4C8A5B,
> lantern gold #F2B63C).

Each realm image used the same style anchor ("cozy retro pixel-art game
biome banner, classic 16-bit RPG overworld style…") with a per-biome scene and
a four-hex palette, which keeps the set visually consistent.

## Notes

- Respects `prefers-reduced-motion`: static frame, no typewriter loop, instant reveals.
- All art is procedurally generated in `pixelworld.js` — original, no external assets.
- "Not affiliated with the College Board or ACT, Inc." is in the footer on purpose; keep it.
