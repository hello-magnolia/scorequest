# CLAUDE.md: session bootstrap for ScoreQuest

Read this first in every fresh session. It is the working contract.

## What this is
Gamified SAT/ACT prep for teens (cozy pixel RPG, Codedex-inspired), parents
are the buyers. Static GitHub Pages site, repo `hello-magnolia/scorequest`,
NO build step. Pomelo the capybara is the player companion.

## Session setup ritual
1. Magnolia pastes a fine-grained GitHub PAT in her first message.
   Immediately: `printf '%s' '<token>' > /home/claude/.gh_token && chmod 600` it.
   ALWAYS read it via `GH_TOKEN=$(cat /home/claude/.gh_token)`. Never retype
   a token by hand (a transcription typo once masqueraded as revocation;
   test auth with `git ls-remote` before diagnosing).
2. Clone with `https://x-access-token:${GH_TOKEN}@github.com/hello-magnolia/scorequest.git`
   into `/home/claude/repo`.
3. A parallel Claude session may push concurrently: fetch + rebase before
   EVERY push. Conflict rule: take Magnolia's side on HTML files, re-add
   Claude's script tags. Never commit `assets/companion/` (other session's).

## The gate (non-negotiable)
Serve with `(setsid python3 -m http.server 8000 >/dev/null 2>&1 < /dev/null &)`
(server dies between tool calls; restart per call). Run ALL suites before any
push; push only on all-green:
verify_realm, verify_boss, verify_hub, verify_map, verify, verify_auth,
verify_payment, verify_parents (jsdom + @napi-rs/canvas; ~204 checks).
Deps: `npm i --legacy-peer-deps jsdom canvas@npm:@napi-rs/canvas` — the
ALIAS is load-bearing. jsdom require()s a package literally named
`canvas`; installing plain @napi-rs/canvas leaves getContext() null and
half the suites fail on timing/animation checks while static checks
pass (misleads toward flakiness; it's a missing canvas backend).
Timing checks POLL (loop + until), never fixed sleeps. `window.__SQ_TICKS`
must advance (tripwire against silent per-frame throws; jsdom swallows them).

## Version discipline
Every deploy bumps the `?v=` stamp IN ALL SEVEN html files (index, map,
checkout, success, parents, realm, boss) via one sed. Lineage is
`b<YYYYMMDD><letter>`; check current stamp in index.html before bumping.

## Bulk-edit discipline (hard-won)
- Python .replace() edits: assert every anchor; write files only after ALL
  asserts for that file pass (atomic).
- Substring collisions: an early anchor contained in a later one destroys it.
  Order sensitive replaces first; make anchors unique with context.
- Short anchors appearing twice are as bad (requestAnimationFrame(tick)
  exists twice: self-reschedule inside tick + kickoff after).
- Stage long text blocks in temp files; no heredoc-in-heredoc.
- Prefer verified str_replace for single edits.

## Sprite and image pipelines
- Uploads arrive with a baked checkerboard: flood-fill de-checker from edges
  (corner colors, tolerance 14).
- ANIMATION FRAMES SHARE ONE UNION CROP BOX + SCALE or swaps jump.
  Bosses export at 448h; Pomelo throw frames at 320h.
- Backdrops/realm art: LANCZOS to 1080p, PNG8 MEDIANCUT + FLOYDSTEINBERG.
- True-grid quantize only for simple blobs (fireball/orange); detailed
  sprites get de-checker -> crop -> LANCZOS.
- Committed assets are pixel-identical to uploads: NEVER ask Magnolia to
  re-upload art. Read pixels with PIL and view committed images with the
  view tool directly.
- Sprite batches should arrive as .zip (files, not inline images).

## Copy rules
No em dashes anywhere in rendered copy (verify.js enforces on index).
Realm names follow plain-content-word + plain-place-word. Low-anxiety
design: losing is retreat, damage frames are "dispelling", no player HP
drain in boss fights, no performance pressure on teen surfaces.

## Architecture map
- Pages: index (hub head, intro), map.html (realm hub cards), realm.html
  (walkabout + path editor at ?edit=1), boss.html, checkout, success,
  parents.
- js/realm.js: eight hand-traced realm manifests (path, nodes, start,
  stairs, bossArea polygons; ids key saved progress, never change them),
  forward-only SPACE progression with waypoint quizzes
  (sq_realm_prog_<id>), boss-zone proximity glow + five-body-probe entry
  trigger, lorewood biome fx, editor (tools 1-5, pan, seeded layers).
- js/boss.js: per-boss manifests (base, idleSeq breathing, attack/hurt/
  faint seqs, optional tails, projectile config, bgFx, flip, questions).
  Bosses: lorewood Nine-Tailed Archivist (9hp, tails, fireball),
  storyforge Boilerback Weaver (7hp, web), inkreef Grotto Sophist (8hp,
  scroll). New boss = sprites + manifest entry ONLY.
- Suites live at repo root, verify_*.js.

## Current backlog
Bosses for syntaxcitadel, mirrormines, infinityisles, datadocks,
prismpeaks (finale: Mango's nest; js/mango.js kept unloaded for it).
Real question banks (all current items are placeholders). XP integration
for waypoint passes. Stair-walk animation (stair markers committed).
Weaver arena dressing (embers/steam). Parent dashboard (non-pixel,
bilingual EN/zh-CN, behind auth). Landing/onboarding. Supabase + Stripe
keys are on Magnolia's side.
