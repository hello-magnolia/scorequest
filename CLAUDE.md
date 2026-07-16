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
- js/realm.js: eight realm manifests. realm.path is a WALK GRAPH
  {nodes, edges, stairs:[edgeIdx]} (normalized); legacy point-chain
  paths auto-migrate at load (repeat coords merge into junctions,
  stair PAIRS become edge flags) so committed data needs no rewrite.
  Pomelo's position is {edge, t}. Movement: arrows/WASD steer; at a
  junction the 8 key directions claim branches one-to-one (greedy,
  best match first) so EVERY branch answers to some key — no dead
  paths. SPACE dijkstra-routes to the nearest open trial marker.
  Trial markers are order-free: any locked marker blocks passage and
  opens its quiz on arrival; progress is a passed-set (JSON array in
  sq_realm_prog_<id>; legacy integers migrate). Realm manifests may
  set ui: '<skin>' -> body.rw-ui-<skin> scopes popup styling;
  lorewood wears 'shrinewood' (pixel rings, palette
  #4b1e09/#a0531d/#b76925/#dd8830/#f8c566; detailed source art parked
  at assets/ui/frame-shrinewood.png).
  EDITOR (&edit=1), select-first, no modes: tools 1 walk graph ·
  2 trial markers · 3 start · 4 boss. Click selects (RED) a node or
  path; selected node + click node = connect; selected node + click
  empty = new connected node (tracing chains; Escape breaks the
  chain); empty click with no selection = island node. Drag moves
  nodes only (4px jitter threshold; markers/start re-snap to the
  graph). Del: node deletes WITH its paths, path deletes alone. S
  toggles stairs on a selected path. Z = one undo stack across all
  layers. Copy JSON exports the graph shape.
- js/boss.js: per-boss manifests (base, idleSeq breathing, attack/hurt/
  faint seqs, optional tails, projectile config, bgFx, flip, questions).
  Bosses: lorewood Nine-Tailed Archivist (9hp, tails, fireball),
  storyforge Boilerback Weaver (7hp, web), inkreef Grotto Sophist (8hp,
  scroll). New boss = sprites + manifest entry ONLY.
  Attacks: a manifest defines projectile (form/fly/hit sprites, thrown
  from ox/oy), beam (a light beam from ox/oy: delay, chargeMs, fireMs,
  holdMs, fadeMs), or strike (melee, no art: {delay}; the side lunges
  via CSS and damage lands at delay). All report through state.fireball
  (strike sets 'hit' only). A yell block (frame, ox, oy, phrases)
  shouts a random word from the mouth on that attackSeq frame index.
  TWIN bosses: twin {left, right, leftFlip, rightFlip} renders two rigs
  flanking Pomelo (sprites prefixed left_/right_ names per side, e.g.
  minus_idle1); attacks and hurts alternate sides, idles sync. With no
  faintSeq, victory retreats both sides offscreen (.is-retreating).
  Mirror Mines' Twin Signs use twin + strike; its arena bg is the realm
  art as a stand-in until a chamber backdrop is uploaded.
- Suites live at repo root, verify_*.js.

## Current backlog
Bosses for syntaxcitadel, mirrormines, infinityisles, datadocks,
prismpeaks (finale: Mango's nest; js/mango.js kept unloaded for it).
Real question banks (all current items are placeholders). XP integration
for waypoint passes. Stair-walk animation (stair markers committed).
Weaver arena dressing (embers/steam). Parent dashboard (non-pixel,
bilingual EN/zh-CN, behind auth). Landing/onboarding. Supabase + Stripe
keys are on Magnolia's side.
