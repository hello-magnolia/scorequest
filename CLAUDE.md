# CLAUDE.md: session bootstrap for ScoreQuest (keep this file terse)

Gamified SAT/ACT prep for teens: cozy pixel RPG, parents are the buyers.
Static GitHub Pages site, repo `hello-magnolia/scorequest`, NO build step.
Pomelo the capybara is the companion. Live at hello-magnolia.github.io/scorequest.

## Setup
1. Magnolia pastes a GitHub PAT first message. Save: `printf '%s' '<token>' > /home/claude/.gh_token && chmod 600`.
   CLOUD SESSIONS: a credential proxy strips all supplied GitHub auth and injects
   its own; the PAT is inert but the clone (public) and pushes work anyway. Do not
   debug "auth failures" against the PAT; test with `git ls-remote` / `git push --dry-run`.
2. Clone to `/home/claude/repo`. Deps: `npm i --legacy-peer-deps jsdom canvas@npm:@napi-rs/canvas`
   (the ALIAS is load-bearing: jsdom require()s literal `canvas`; without it getContext()
   is null and timing checks fail while static ones pass, misreading as flakiness).
3. Parallel Claude session may push: fetch + rebase before EVERY push. Conflicts:
   take Magnolia's side on HTML, re-add Claude's script tags. Never commit `assets/companion/`.

## The gate (scoped: run what you touched, green before push)
Runner: `bash gate.sh [suite ...]` (no args = all eight; serves + one line per suite).
Scope by changed surface:
  realm.* -> verify_realm · boss.* -> verify_boss · map.* -> verify_hub verify_map ·
  index hero/copy -> verify · auth/usernav -> verify_auth · checkout/pricing ->
  verify_payment verify · parents/i18n -> verify_parents.
Shared surfaces (css/style.css, auth.js, game.js, main.js, sfx.js) or multi-page edits,
or a rebase that pulled someone else's changes -> full `bash gate.sh`. Stamp-only bumps
need no suites. Run the FULL gate once before the session's final push.
Timing checks POLL (until-loops), never fixed sleeps. `__SQ_TICKS` (realm) and
`__SQ_BOSS` state are the tripwires. Pages deploys lag pushes ~10 min (CDN caches HTML).

## Version discipline
Every deploy: one sed bumps `?v=` in ALL TEN html files (index, map, checkout, success,
parents, realm, boss, bookmarks, profile, settings). Lineage `b<YYYYMMDD><letter>`; check
index.html for current. Boss ART changes also bump ASSET_V in js/boss.js.

## Edits and sprites
- Prefer verified single str_replace edits; for bulk Python .replace() assert every anchor
  before writing (atomic), order overlapping anchors, beware short anchors appearing twice.
- Sprite uploads (zip, not inline) arrive on a baked ground: checkerboard OR flat color.
  Pipeline: flood-fill from edges (corner colors, tol 14) + global purge of bg-colored px
  (catches enclosed pockets, e.g. between legs) + de-fringe pass for edge bleed
  (pure-red r>150,g<40,b<40 is bleed; crimson-with-blue is art) -> ONE UNION CROP BOX +
  scale across all frames of a set -> LANCZOS -> bosses 448h, Pomelo throws 320h.
  Committed assets stay faithful; NEVER ask Magnolia to re-upload art.

## Copy rules
No em dashes in rendered copy (verify.js enforces). Realm names: plain-content-word +
plain-place-word. Low-anxiety: losing is retreat, damage is "dispelling", no player HP
drain visuals, no performance pressure on teen surfaces. Parent surfaces use SAT-domain
language, never game words (verify_parents enforces).

## Architecture
- Pages: index (hero, parents demo w/ 4-lang i18n, pricing), map.html (world map + labels,
  caption below, gray fog until visited), realm.html (walkabout; editor at &edit=1),
  boss.html, checkout, success, parents, profile, settings, bookmarks.
- realm.js: 8 manifests; path is a walk graph {nodes, edges, stairs}; Pomelo at {edge, t};
  arrows/WASD steer, SPACE routes to nearest open trial. ARRIVAL OPENS A PROMPT
  (Start/Retry/Skip; Space fires armed) then the quiz. Progress = passed-set in
  sq_realm_prog_<id>; sq_last_realm records where he wandered. Editor: select-first,
  tools 1 graph / 2 markers / 3 start / 4 boss, S stairs, Z undo, Copy JSON exports.
- boss.js: per-boss manifests. Attack mechanics: projectile | beam | strike {delay} |
  flight (composes attackSeq from takeoffSeq + flapSeq fwd/rev x loops + reversed takeoff;
  rig rises flight.rise px, damage at flight.delay; retry resets rig transform).
  frameScale {frame: n} renders chosen frames larger (origin bottom-center).
  Killing blow skips hurtSeq -> faintSeq (so a hurt-opening fall lists hurt frames first).
  No B.next -> victory hides Onward. Victory panel copy is hardcoded Lorewood text (backlog).
  Roster: lorewood Archivist 9hp fireball+tails · storyforge Weaver 7hp web · inkreef
  Sophist 8hp scroll · syntaxcitadel Parapet Pedant 9hp beam · mirrormines Twin Signs
  10hp twin+strike, faint art · infinityisles Doubling Hare 12hp beam · datadocks Mean
  Kraken 13hp PLACEHOLDER art · prismpeaks Tangent Talon 15hp flight+frameScale, finale.
- Pricing ladder (decoy pattern): Basic $99 / All Access $129 (featured, center, default,
  "Most families choose this") / Complete $249. Anchor line prices tutoring at $400+.
  Comparison ledger table on index; parent-rail "plans, plainly" strip i18n EN/zh/ES/FR
  (zh sells 定制 vs 统一标准路径; ES/FR await native review). checkout.js PLANS +
  config.js STRIPE_LINKS keys: basic_/allaccess_/complete_ x monthly/annual.

## Backlog
Datadocks boss art + prismpeaks nest backdrop/intro (mango.js still unloaded). Real
question banks. XP for waypoint passes. Stair-walk animation. Weaver arena dressing.
Parent dashboard (non-pixel, EN/zh, behind auth). Landing/onboarding. PLAN GATING +
kid-facing upsell wall ("This realm is locked on Basic...", needs plan state first).
Per-boss victory copy. Stripe + Supabase keys on Magnolia's side.
