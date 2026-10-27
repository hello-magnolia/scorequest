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
   Oct 2026: @napi-rs/canvas 1.x breaks jsdom's getContext (read-only ctx.canvas); install
   `canvas@npm:@napi-rs/canvas@0.1.73` and every suite goes green.
3. Parallel Claude session may push: fetch + rebase before EVERY push. Conflicts:
   take Magnolia's side on HTML, re-add Claude's script tags. Never commit `assets/companion/`.

## The gate (scoped: run what you touched, green before push)
Runner: `bash gate.sh [suite ...]` (no args = all eleven; serves + one line per suite).
Scope by changed surface:
  realm.* -> verify_realm · boss.* -> verify_boss · map.*/profile.* -> verify_hub verify_map ·
  index hero/copy -> verify · practice.*/questions.js -> verify_practice · data/questions.js -> verify_bank
  verify_practice verify_clash · clash.* -> verify_clash · auth/usernav -> verify_auth · checkout/pricing ->
  verify_payment verify · parents/i18n -> verify_parents.
Shared surfaces (css/style.css, auth.js, game.js, main.js, sfx.js) or multi-page edits,
or a rebase that pulled someone else's changes -> full `bash gate.sh`. Stamp-only bumps
need no suites. Run the FULL gate once before the session's final push.
Timing checks POLL (until-loops), never fixed sleeps. `__SQ_TICKS` (realm) and
`__SQ_BOSS` state are the tripwires. Pages deploys lag pushes ~10 min (CDN caches HTML).

## Version discipline
Every deploy: one sed bumps `?v=` in ALL TWELVE html files (index, map, checkout, success,
parents, realm, boss, bookmarks, profile, settings, clash, practice). Lineage `b<YYYYMMDD><letter>`; check
index.html for current. Boss ART changes also bump ASSET_V in js/boss.js.

## Edits and sprites
- Realm waypoint markers (.rw-node): a parchment speech bubble (tail down) bobbing over a warm
  light pool + ground shadow, holding one 48px pixel icon (px() in realm.js, 3px per art px).
  Clash = THREE STARS (starRow: filled left to right by wp.tier, filled color STAR[realm],
  muted per biome; bubble .is-wide); lesson = open book; is-locked = gray + dim bubble;
  is-passed = moss bubble + check badge; empties dashed, editor only. paintNode(i) swaps icons.
  Arrival prompt (.rw-prompt) = icon + topic + Start/Skip, parchment, and it GROWS OUT OF THE
  MARKER'S BUBBLE (growPrompt FLIP via --grow, .is-open; marker .is-speaking hides its bubble;
  closePrompt shrinks back, 320ms fallback). The card is moved INTO #rw-world on open
  (anchorPrompt, world px, --ax/--ay) so it pans with its marker instead of floating fixed.
  Compact: 32px icon, 0.95rem title, small buttons. Cleared adds .is-cleared (suites check that, not
  title text). Magnolia hovers markers over scenery herself in the editor. Locked is a look only.
- PROPS (pieces of the painting that react to Pomelo): realm manifest fx.props rows, x/y/w/h as
  fractions of the art, laid exactly over the spot they were cut from (so at rest nothing shows).
  RULE (Magnolia): EVERY reaction HANGS after he leaves, never stops dead: 3 to 4.5s of afterglow
  or after-swing (.is-leaving / .is-gusting, cleared by a 4.5s timeout in tickProps).
  kind 'frames' = a strip repainted by hand (lantern: dark / kindling / full / full-minus;
  .is-near kindles over 1.2s then flickers slowly (1.5s uneven beats) between the last two;
  leaving = two more flicker cycles then a 1.4s dim; tools/make_lantern.py). kind 'sway' =
  sprite (object, alpha) over patch (painting with the object inpainted away): swings 11deg
  while .is-near, leaving = one 3.2s dying gust (tools/make_prop.py, paper-colored objects;
  tune its color test for others). Any new prop kind gets a hang of its own.
  buildProps puts them in #rw-world; tickProps toggles near within max(70px, 16% stage) and
  Y-SORTS by `base` (foot line): .is-behind z1 / front z3, Pomelo z2, markers z4. Assets in
  assets/fx/props/<realm>/. Lorewood: all 4 stone lanterns on his path (a, b, c, d) + 17 paper
  tags (branch, rope by the first torii, rope past the first stairs, the big torii's shide).
  Rule from Magnolia: only lanterns and torii ON HIS PATH react; off-path ones stay still.
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
plain-place-word. Low-anxiety: losing is retreat, damage is "dispelling", no performance pressure on
teen surfaces. Player HP may drain ONLY if empty is never a loss (clash: Pomelo rests,
refills, boss keeps its cracks); never a game over, never lost progress. Parent surfaces use SAT-domain
language, never game words (verify_parents enforces).

## Identity (two names, never merge them)
profiles.hero_name = player-chosen, NULL until the intro asks. profiles.full_name =
the provider's real name, PARENT SURFACES ONLY. Never fall hero_name back to full_name
or to the email handle (both are usually the legal name); nameless players read
"Adventurer", with SQCharacter as the local stopgap while the write is in flight.
hero_name_set flips server-side (profiles_hero_named trigger). SQAuth.needsHeroName()
is the cue intro.js uses to open scene 6 alone (startPage=2) on a device that already
watched the cinematic. supabase_setup.sql is idempotent and backfills old Google rows;
re-run it on any existing project. verify_auth guards all of this.

## Architecture
- practice.html + js/practice.js: setup (section, domains, difficulty, length) -> one question at a time
  (check, explanation, trap hint) -> summary by skill + review. Engine js/questions.js (SQQuestions: filter,
  session, grid-in rules, check; SQAttempts: local + SQAuth.recordAttempt -> Supabase `attempts`, SQL section 7).
  Bank data/questions.js is GENERATED by the Scorequest Research pipeline (pipeline/export_app_bank.py):
  ScoreQuest Originals only, never official College Board items; never hand-edit it. js/figures.js is a copy
  of the research lib/figures.js (figure specs -> SVG). KaTeX self-hosted in assets/katex/.
  Deep link: practice.html?section=math&domain=Algebra&difficulty=2&n=5&go=1. data/README.md documents
  the bank shape and rules; verify_bank.js audits every shipped question (pure Node).
- Pages: index (hero, parents demo w/ 4-lang i18n, pricing), map.html (world map + labels,
  caption below, gray fog until visited), realm.html (walkabout; editor at &edit=1),
  boss.html, checkout, success, parents, profile, settings, bookmarks.
- clash.html (Critter Clash practice, linked under index #world), per biome (?realm=).
  Layout: trail across the top (position only: number / check / flag, lantern marks current,
  lair icon at the end, NO health on it); left = 4:3 battle screen with Pokemon-style plates
  (Pomelo HP 5, boss WARD) + explanation panel; right = passage, stem, answers, Check.
  ONE boss per biome (BIOMES in clash.js), ward = ceil(60% of biome qs) clamped 3..10, one pip
  per correct answer, misses never heal it. Focus (F, sq_clash_focus) swaps the screen for two
  quiet bars. Motion full/calm/off = localStorage sq_motion, also on settings.html (#st-motion),
  defaults to calm under prefers-reduced-motion. Progress sq_clash_<biome>.
  js/clash-ambient.js: fixed canvas behind the page, MOODS per biome (leaves, embers, bubbles,
  punctuation, sparkles, infinity loops, gulls, snow), obeys sq_motion. Top bar is sticky. Soft look: --edge/--shadow tokens, no hard offsets.
  js/clash.js page, js/clash-arena.js (critter sprites+moves from Magnolia's Critter Clash
  artifact; no damage numbers). Reads the SHARED bank data/questions.js, js/figures.js,
  js/questions.js (SQQuestions.check, SQAttempts.record session_id clash:<biome>), self-hosted KaTeX.
- realm.js: 8 manifests; path is a walk graph {nodes, edges, stairs}; Pomelo at {edge, t};
  arrows/WASD steer, SPACE routes to nearest open trial. ARRIVAL OPENS A PROMPT
  (Start/Continue/Spar again/Read again/Skip; Space fires armed) then the WAYPOINT in the
  Critter Clash overlay (js/clash-overlay.js: SQClashOverlay.open({realm, waypoint, round,
  questions, onDone, onLeave, onRetry}); reuses SQArena.bind(root), SQCard (js/qcard.js),
  css/clash.css .sq-clash tokens). Waypoints = data/waypoints.js rows (mode clash|lesson|
  rapid|reading|empty, tier 1..3 = one round per marker "Skill I/II/III", also[]); lessons =
  data/lessons.js[skill]. RULES: first marker of every realm is a clash; a lesson follows the
  first clash on its skill. 71 rows vs 45 placed markers: the editor count line says
  "ADD n" / "REMOVE n" per realm; rows past the markers are unreachable until placed. Clash
  round = 10 qs from pickRound (wp.tier, neighbour fallback, domain top-up, prefers unseen),
  clears at 8 (ROUND/PASS on SQClashOverlay);
  roundsDone in sq_realm_rounds_<id>, passed-set in sq_realm_prog_<id>; empties hidden in
  play (el.hidden), shown in the editor. Tripwires __SQ_OVERLAY, __SQ_QUIZ {rank, practice,
  mode, round}. sq_last_realm records where he wandered. Editor: select-first,
  tools 1 graph / 2 markers / 3 start / 4 boss, S stairs, Z undo, Copy JSON exports.
- Grading: SQQuestions.grade(q, resp, {ms, session_id, record}) everywhere (practice, clash,
  overlay). Signed in -> SQAuth.checkAnswer -> Supabase RPC check_answer (keys never reach the
  browser; it writes attempts); else local check + SQAttempts.record. SQQuestions.ready
  resolves after fetchBank (4s cap). Supabase section 8: questions / question_keys (locked) /
  question_reports / waypoints; publish with research pipeline/export_app_bank.py --supabase
  (copy kept at tools/export_app_bank.py) and tools/seed_waypoints.py; service role key ENV
  ONLY, never in chat or the repo. map.js drawer draws 3 easy mcq via questsFor(realmId).
  Official College Board items live in calibration_questions (locked, loaded by research
  pipeline/export_calibration.py). Signed-in players read the bank_live VIEW (section 10):
  originals + official items with a skill tag (QB_MATH/QB_RW; DSAT tests have no skills so
  stay out) while bank_settings.official_in_waypoints is true. Rows carry source/source_label;
  SQCard.sourceChip / .pr-src label every card ("ScoreQuest original" or "College Board
  Question Bank"). Official rows have no key in the browser: grade() returns status 'error'
  if the server is unreachable and the card re-enables Check. Static file stays originals only.
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
Datadocks boss art + prismpeaks nest backdrop/intro (mango.js still unloaded). Fold boss.html into
the realm lair (big sprites, retire its 64 inline questions); decide practice.html's fate; strip
answer keys from data/questions.js once reads come from Supabase. Rapid fire + reading room waypoint
modes (Notion, Later). XP for waypoint passes. Stair-walk animation. Weaver arena dressing.
Parent dashboard (non-pixel, EN/zh, behind auth). Landing/onboarding. PLAN GATING +
kid-facing upsell wall ("This realm is locked on Basic...", needs plan state first).
Per-boss victory copy. Stripe + Supabase keys on Magnolia's side.
