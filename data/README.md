# Question bank

`questions.js` is the one question bank every page reads: the practice room
(`practice.html`), Critter Clash (`clash.html`), the realm waypoints (`realm.html`,
through `js/clash-overlay.js`) and the map drawer (`js/map.js`). It defines
`window.SQ_QUESTION_BANK = { meta, questions }`.

`waypoints.js` is the map as data: one row per marker on each realm's path
(`window.SQ_WAYPOINTS`, modes clash / lesson / rapid / reading / empty, rounds 1..3,
`also` skills folded into a marker). `lessons.js` holds one scroll per lesson skill
(`window.SQ_LESSONS[skill]`). Both are hand-written; the gate (`verify_realm`) checks
every lesson waypoint has a scroll and every mode is known.

## Rules

- **Generated, never hand-edited.** The Scorequest Research pipeline writes it:
  fix a question in `originals/<domain>.json` there, rebuild, then export with
  `python3 pipeline/export_app_bank.py --out <repo>/data/questions.js`.
- **ScoreQuest Originals only.** Official College Board items live in the research
  bank for calibration and never ship. `verify_bank.js` fails if an id is not
  `SQ-XXX-NNN` or if source, scan or review fields leak through.
- **Every change runs the gate.** `node verify_bank.js` audits the data alone (no
  browser); `bash gate.sh verify_bank verify_practice verify_clash` checks the data
  and both pages that render it.

## Shape

```
meta:      { exported, count, source, approved_only }
question:  { id, section: "math"|"rw", domain, skill, difficulty: 1|2|3, type: "mcq"|"spr", status,
             stem, explanation,
             choices: [{ key: "A".."D", text | figure, correct, trap }]     (mcq)
             accepted: ["5/4", "1.25", ...]                                 (spr, Digital SAT entry rules)
             passage?: { kind: prose|poem|paired|notes, intro?, parts: [{ label?, paragraphs[] }], figures? }
             table?:   { caption?, columns[], rows[][] }
             figure?:  { kind, spec, alt }      rendered by js/figures.js (SQFigures.render)
```

Markup inside text: math in `\( \)` or `\[ \]` (KaTeX, self-hosted in `assets/katex/`),
`\$` for a literal dollar sign, `{s1}...{/s1}` for an underlined span, `*italic*` in
passages. No em dashes anywhere in shipped copy.

## Domains and the eight biomes

| Section | Domain | Biome (Critter Clash) |
|---|---|---|
| rw | Information and Ideas | Lorewood |
| rw | Craft and Structure | Story Forge |
| rw | Expression of Ideas | Ink Reef |
| rw | Standard English Conventions | Syntax Citadel |
| math | Algebra | Mirror Mines |
| math | Advanced Math | Infinity Isles |
| math | Problem-Solving and Data Analysis | Data Docks |
| math | Geometry and Trigonometry | Prism Peaks |

## Supabase (signed-in players)

`supabase_setup.sql` section 8 adds four tables: `questions` (what students may read,
no answers in it), `question_keys` (correct key, accepted forms, traps, explanation;
no client role can read it), `question_reports` and `waypoints`. Grading goes through
the `check_answer(question_id, response, ms, session_id)` RPC, which compares on the
server, records the attempt and returns `{ correct, key, trap, explanation }`.
`SQQuestions.grade()` in `js/questions.js` calls it when signed in and falls back to
the static bank otherwise, so every page grades the same way. Publish with:

```
# from the research folder, service role key in the environment only
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 pipeline/export_app_bank.py --supabase
# from this folder, after editing data/waypoints.js or data/lessons.js
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 tools/seed_waypoints.py
```

`tools/export_app_bank.py` is the copy of the exporter that lives in the research
pipeline; keep them identical.

## Where answers go

`js/questions.js` (`SQAttempts.record`) keeps every answer in `localStorage`
`sq_attempts` and, for signed-in players, in the Supabase `attempts` table
(`supabase_setup.sql`, section 7; re-run the file on an existing project). Practice
sessions use `session_id` `p<timestamp>`, Critter Clash uses `clash:<biome>`, realm
waypoints use `realm:<realm>:<waypoint id>:r<round>`. Signed in, the attempt row is
written by `check_answer` and mirrored locally.
