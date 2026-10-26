/* Verify the realm walkabout architecture: one template driven by ?realm=,
   manifest-selected art with local-first chains, HUD ordinals, prev/next
   preview navigation, boss popup wiring, and the map hub's preview strip. */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); };
const vc = new VirtualConsole(); vc.on('error', () => {}); vc.on('jsdomError', () => {});
const OPTS = {
  resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(w) {
    w.matchMedia = w.matchMedia || (q => ({ matches: false, addListener() {}, removeListener() {} }));
  }
};
const load = async (path) => {
  const dom = await JSDOM.fromURL('http://localhost:8000/' + path, OPTS);
  await new Promise(r => dom.window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 400));
  return dom.window;
};

(async () => {
  /* default realm */
  let w = await load('realm.html');
  let d = w.document;
  check('Realm template loads and defaults to Lorewood (realm 1 of 8)',
    d.getElementById('rw-title').textContent === 'Lorewood' &&
    /Realm 1 of 8/.test(d.getElementById('rw-meta').textContent) &&
    /Information & Ideas/.test(d.getElementById('rw-meta').textContent));
  check('Lorewood carries the hand-traced path with four node markers on it',
    d.querySelectorAll('.rw-node').length === 4 &&
    !!d.getElementById('rw-trace'));
  check('The entering-veil walks in on capybara paw prints (reusable loader)',
    d.querySelectorAll('#rw-veil .paw-loader .paw').length === 6 &&
    d.querySelectorAll('#rw-veil .paw-loader .paw-hind').length === 0);
  // click-to-flop: tap him and he settles flat; tap again and he rises
  const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise(r => setTimeout(r, 40)); } return fn(); };
  await until(() => w.document.getElementById('rw-veil').classList.contains('is-gone'), 3000);
  const capyEl = d.getElementById('rw-capy');
  const cx = parseInt(capyEl.style.left || '0') + 60;
  const cy = parseInt(capyEl.style.top || '0') + 45;
  d.getElementById('rw-stage').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy }));
  check('Tapping Pomelo starts the flop',
    await until(() => ['down', 'flat'].includes(w.__SQ_REALM_FLOP), 1500), String(w.__SQ_REALM_FLOP));
  check('He settles fully flat for a nap',
    await until(() => w.__SQ_REALM_FLOP === 'flat', 2500));
  d.getElementById('rw-stage').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy }));
  check('A second tap brings him back up',
    await until(() => w.__SQ_REALM_FLOP === null, 2500), String(w.__SQ_REALM_FLOP));

  /* progression: space walks him to waypoint one (a lesson), which hails him on
     the approach rather than gating the path; Start opens the Critter Clash
     overlay; cleared nodes reopen as sparring */
  const clickEl = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  check('Space walks Pomelo toward the first waypoint: a clash (never a lesson), offering Start',
    await until(() => d.getElementById('rw-prompt').hidden === false, 9000) &&
    /Waypoint 1 of 4 · Central Ideas and Details I · Easy/.test(d.getElementById('rw-prompt-title').textContent) &&
    d.getElementById('rw-prompt-go').textContent === 'Start');
  check('It hailed him from a distance, not from on top of the marker',
    (w.__SQ_PROMPT_D || 0) > 60, 'opened at ' + w.__SQ_PROMPT_D + 'px');

  /* a clash round: ten bank questions on the waypoint's skill at its tier, Pomelo
     versus the biome boss; a miss drains HP, never progress; 8 of 10 clears it */
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  check('Space fires Start: a clash round opens on the skill (topped up from the realm domain when the skill is thin), fresh, boss on screen',
    await until(() => w.__SQ_QUIZ && w.__SQ_QUIZ.practice === false && w.__SQ_OVERLAY && w.__SQ_OVERLAY.mode === 'clash' && d.querySelectorAll('#sq-overlay .choices button').length >= 3, 6000) &&
    /Central Ideas and Details I/.test(d.getElementById('ov-title').textContent) &&
    /^Easy · 10 questions, clear 8/.test(d.getElementById('ov-sub').textContent) &&
    w.SQClashOverlay.state.qs.length === 10 &&
    w.SQClashOverlay.state.qs.slice(0, 5).every(q => q.skill === 'Central Ideas and Details') &&
    w.SQClashOverlay.state.qs.every(q => q.domain === 'Information and Ideas') &&
    /ScoreQuest original/.test(d.querySelector('#sq-overlay .qmeta .qsrc').textContent) &&
    !!d.getElementById('cx-cv') && !!d.getElementById('me-hp'));
  const answer = async (right) => {
    const st = w.SQClashOverlay.state, q = st.qs[st.i], i = st.i;
    const pick = q.choices.find(c => right ? c.correct : !c.correct).key;
    clickEl(d.querySelector('#sq-overlay .choices button[data-k="' + pick + '"]'));
    clickEl(d.getElementById('bCheck'));
    await until(() => st.results[i] != null && !d.getElementById('whybox').hidden, 4000);
    return st.results[i];
  };
  const miss = await answer(false);
  check('A miss teaches: explanation shows, the key is lit, progress holds at zero',
    miss === false && !!d.querySelector('#sq-overlay .choices button.correct') &&
    /Not this time/.test(d.getElementById('why').textContent) &&
    (w.__SQ_REALM_PROG || 0) === 0);
  check('The miss dispels one of Pomelo\'s HP pips (never below empty, never a loss)',
    await until(() => w.SQClashOverlay.state.hp === 4, 6000), 'hp ' + w.SQClashOverlay.state.hp);
  clickEl(d.getElementById('bNext'));
  let hits = 0;
  for (let k = 0; k < 9; k++) { if (await answer(true)) hits++; clickEl(d.getElementById('bNext')); }
  check('Nine hits after the miss clear the round (8 of 10 needed)',
    hits === 9 && await until(() => w.__SQ_OVERLAY && w.__SQ_OVERLAY.done && w.__SQ_OVERLAY.cleared, 3000) &&
    /Round cleared/.test(d.getElementById('ov-body').textContent));
  check('Every clash answer is recorded as an attempt against the realm session',
    JSON.parse(w.localStorage.getItem('sq_attempts') || '[]').filter(a => /^realm:lorewood:lorewood-1:r1$/.test(a.session_id)).length === 10);
  clickEl(d.getElementById('ov-done'));
  check('Clearing the round clears the leg: progress one, node marked, overlay gone',
    await until(() => w.__SQ_REALM_PROG === 1, 1500) &&
    d.querySelectorAll('.rw-node.is-passed').length === 1 &&
    !d.querySelector('#sq-overlay').classList.contains('is-open') &&
    !d.body.classList.contains('sq-overlay-open'));
  // he finishes his walk to the marker on his own time; wait for him to settle
  const settled = async () => { let last = null, still = 0; await until(() => { const xy = String(w.__SQ_REALM_XY); still = xy === last ? still + 1 : 0; last = xy; return still >= 6; }, 9000); };
  await settled();
  const leftBefore = d.getElementById('rw-capy').style.left;
  clickEl(d.querySelector('.rw-node.is-passed'));
  await new Promise(r => setTimeout(r, 700));
  const ticksAt = w.__SQ_TICKS || 0;
  await new Promise(r => setTimeout(r, 350));
  check('The tick loop runs to completion every frame (no silent mid-tick throws)',
    (w.__SQ_TICKS || 0) > ticksAt + 3, (w.__SQ_TICKS || 0) + ' vs ' + ticksAt);
  check('A cleared node reopens through the prompt as Spar again, and Pomelo stays put',
    await until(() => d.getElementById('rw-prompt').hidden === false, 2500) &&
    /cleared/.test(d.getElementById('rw-prompt-title').textContent) &&
    d.getElementById('rw-prompt-go').textContent === 'Spar again' &&
    d.getElementById('rw-capy').style.left === leftBefore,
    d.getElementById('rw-prompt-title').textContent + ' / ' + d.getElementById('rw-prompt-go').textContent);
  clickEl(d.getElementById('rw-prompt-go'));
  check('Spar again reopens the round as sparring',
    await until(() => w.__SQ_QUIZ && w.__SQ_QUIZ.practice === true && w.__SQ_OVERLAY && w.__SQ_OVERLAY.open, 2500));
  clickEl(d.getElementById('ov-close'));
  check('Leave closes the overlay without touching progress',
    await until(() => !w.__SQ_OVERLAY, 1000) && w.__SQ_REALM_PROG === 1);
  // the handoff: with the cleared trial's banner up, walking toward trial 2
  // must hand the hail over mid-stride
  clickEl(d.querySelector('.rw-node.is-passed'));
  await until(() => d.getElementById('rw-prompt').hidden === false &&
    /cleared/.test(d.getElementById('rw-prompt-title').textContent), 2500);
  clickEl(d.querySelectorAll('.rw-node:not(.is-passed)')[0]);
  check('The hail hands over: the next marker (the lesson) takes the banner from the cleared one, from a distance',
    await until(() => d.getElementById('rw-prompt').hidden === false &&
      /Lesson 2 of 4/.test(d.getElementById('rw-prompt-title').textContent), 9000) &&
    /Reading the room/.test(d.getElementById('rw-prompt-title').textContent) &&
    d.getElementById('rw-prompt-go').textContent === 'Start' &&
    (w.__SQ_PROMPT_D || 0) > 60,
    d.getElementById('rw-prompt-title').textContent + ' at ' + (w.__SQ_PROMPT_D || 0) + 'px');

  /* the lesson: a scroll with two quick checks, never recorded, never gating */
  clickEl(d.getElementById('rw-prompt-go'));
  check('Start opens the lesson scroll in the overlay',
    await until(() => w.__SQ_OVERLAY && w.__SQ_OVERLAY.mode === 'lesson', 2500) &&
    d.querySelectorAll('#sq-overlay .check').length === 2 &&
    d.getElementById('ov-done').disabled === true);
  check('The scroll reads the skill, the moves and a worked example (no em dashes)',
    /Central Ideas/.test(d.getElementById('ov-sub').textContent) &&
    d.querySelectorAll('#sq-overlay .scroll ol li').length >= 2 &&
    !!d.querySelector('#sq-overlay .ex .ans') &&
    !d.getElementById('sq-overlay').textContent.includes('—'));
  const attemptsBefore = JSON.parse(w.localStorage.getItem('sq_attempts') || '[]').length;
  clickEl(d.querySelectorAll('#sq-overlay .check')[0].querySelectorAll('button')[0]);
  check('A quick check teaches: the right answer lights up, the miss is marked, nothing is recorded',
    d.querySelectorAll('#sq-overlay .check')[0].querySelectorAll('button.correct').length === 1 &&
    JSON.parse(w.localStorage.getItem('sq_attempts') || '[]').length === attemptsBefore);
  clickEl(d.querySelectorAll('#sq-overlay .check')[1].querySelectorAll('button')[1]);
  check('Both checks answered: Back to the path unlocks',
    await until(() => d.getElementById('ov-done').disabled === false, 1000));
  clickEl(d.getElementById('ov-done'));
  check('Leaving the scroll marks the lesson leg: progress two',
    await until(() => w.__SQ_REALM_PROG === 2, 1500) && d.querySelectorAll('.rw-node.is-passed').length === 2);

  /* waypoints as data: every realm's markers map to a row; empties hide in play */
  check('Every realm marker has a waypoint row (data/waypoints.js), and modes are known',
    Array.isArray(w.SQ_WAYPOINTS) && w.SQ_WAYPOINTS.length >= 40 &&
    w.SQ_WAYPOINTS.every(r => /^(clash|lesson|rapid|reading|empty)$/.test(r.mode)) &&
    w.SQ_WAYPOINTS.filter(r => r.mode === 'clash').every(r => r.skill && (r.rounds == null || (r.rounds >= 1 && r.rounds <= 3))));
  check('Every lesson waypoint has a written scroll',
    w.SQ_WAYPOINTS.filter(r => r.mode === 'lesson').every(r => w.SQ_LESSONS && w.SQ_LESSONS[r.skill] && w.SQ_LESSONS[r.skill].checks.length === 2));
  const realms = [...new Set(w.SQ_WAYPOINTS.map(r => r.realm))];
  check('Every clash round is its own marker with a tier, positions run 1..n with no gaps',
    realms.length === 8 && realms.every(id => {
      const rows = w.SQ_WAYPOINTS.filter(r => r.realm === id);
      return rows.every((r, i) => r.position === i + 1 && r.id === id + '-' + (i + 1)) &&
        rows.filter(r => r.mode === 'clash').every(r => [1, 2, 3].includes(r.tier) && /\s(I|II|III)$/.test(r.title));
    }));
  check('The first marker of every realm is a clash, never a lesson',
    realms.every(id => w.SQ_WAYPOINTS.find(r => r.realm === id && r.position === 1).mode === 'clash'));
  w = await load('realm.html?realm=storyforge');
  d = w.document;
  check('Story Forge: all 7 placed markers show (9 rows, the editor says how many to add), lessons at 2 and 6',
    d.querySelectorAll('.rw-node').length === 7 &&
    [...d.querySelectorAll('.rw-node')].filter(n => !n.hidden).length === 7 &&
    [...d.querySelectorAll('.rw-node')].map((n, i) => n.classList.contains('is-lesson') ? i + 1 : 0).filter(Boolean).join(',') === '2,6');
  w = await load('realm.html?realm=storyforge&edit=1');
  d = w.document;
  await new Promise(r => setTimeout(r, 700));
  check('The editor counts the markers still to place against the waypoint rows',
    /7 trials \(ADD 2 for 9 waypoints\)/.test(d.getElementById('rw-ed-count').textContent), d.getElementById('rw-ed-count').textContent);

  /* the editor */
  w = await load('realm.html?realm=lorewood&edit=1');
  d = w.document;
  await new Promise(r => setTimeout(r, 700)); // let the art chain exhaust to the dark fallback
  check('Path editor mode opens with a key legend and a JSON export',
    !!d.querySelector('.rw-editor') &&
    /undo/i.test(d.querySelector('.rw-ed-legend').textContent) &&
    !!d.getElementById('rw-ed-json'));
  const before = d.getElementById('rw-ed-count').textContent;
  const pathBefore = parseInt(before) || 0;
  d.getElementById('rw-stage').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: 200, clientY: 300 }));
  d.getElementById('rw-stage').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: 420, clientY: 340 }));
  await new Promise(r => setTimeout(r, 60));
  check('Clicking the stage drops waypoints and updates the export (layers seed from committed data)',
    parseInt(d.getElementById('rw-ed-count').textContent) === pathBefore + 2 &&
    /"realm":"lorewood"/.test(d.getElementById('rw-ed-json').value),
    before + ' -> ' + d.getElementById('rw-ed-count').textContent);
  // N switches to the trial-marker tool; markers snap onto the walk graph
  const markersBefore = parseInt((d.getElementById('rw-ed-count').textContent.match(/(\d+) trials/) || [0, 0])[1]);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'n', bubbles: true }));
  d.getElementById('rw-stage').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: 300, clientY: 320 }));
  await new Promise(r => setTimeout(r, 60));
  check('N switches to trial markers, snapped onto the walk graph',
    /Trial markers/.test(d.getElementById('rw-ed-mode').textContent) &&
    parseInt((d.getElementById('rw-ed-count').textContent.match(/(\d+) trials/) || [0, 0])[1]) === markersBefore + 1,
    d.getElementById('rw-ed-count').textContent);
  // the effects tool, on Story Forge: opens blank, side panel, registry
  // types, live preview of the real animated elements
  w = await load('realm.html?realm=storyforge&edit=1');
  d = w.document;
  await until(() => !!d.querySelector('.rw-editor'), 4000);
  check('The effects editor opens on a blank canvas with all five tools and the effects section tucked away',
    d.querySelectorAll('.rw-editor .rw-ed-tool').length === 5 &&
    d.querySelectorAll('.rw-editor .rw-ed-type').length >= 3 &&
    !d.querySelector('.rw-editor').classList.contains('is-fx') &&
    d.querySelectorAll('#rw-fx .rw-flame, #rw-fx .rw-smoke, #rw-fx .rw-glow').length === 0 &&
    !/"fx"/.test(d.getElementById('rw-ed-json').value));
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: '5', bubbles: true }));
  d.getElementById('rw-stage').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: 260, clientY: 280 }));
  await new Promise(r => setTimeout(r, 60));
  check('Tool 5 opens the effects section and drops a live animated flame under the click',
    /Effects/.test(d.getElementById('rw-ed-mode').textContent) &&
    d.querySelector('.rw-editor').classList.contains('is-fx') &&
    d.querySelectorAll('#rw-fx .rw-flame').length === 1 &&
    d.querySelectorAll('#rw-fx .rw-glow-fire').length === 1 &&
    /"flames":\[\[/.test(d.getElementById('rw-ed-json').value),
    d.getElementById('rw-ed-mode').textContent);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ']', bubbles: true }));
  await new Promise(r => setTimeout(r, 40));
  check('] grows the selected flame by a quarter step and the size rides in the export',
    /\u00D72/.test(d.getElementById('rw-ed-mode').textContent) &&
    /"flames":\[\[[\d.]+,[\d.]+,2\]\]/.test(d.getElementById('rw-ed-json').value),
    d.getElementById('rw-ed-mode').textContent);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: '5', bubbles: true }));
  d.getElementById('rw-stage').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: 500, clientY: 250 }));
  await new Promise(r => setTimeout(r, 60));
  check('5 again cycles to smoke: three staggered live puffs, exported with their size',
    /smoke/.test(d.getElementById('rw-ed-mode').textContent) &&
    d.querySelectorAll('#rw-fx .rw-smoke').length === 3 &&
    /"smoke":\[\[[\d.]+,[\d.]+,1\.25\]\]/.test(d.getElementById('rw-ed-json').value),
    d.getElementById('rw-ed-json').value.slice(-140));
  d.querySelector('.rw-ed-type[data-type="lamp"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  d.getElementById('rw-stage').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: 640, clientY: 300 }));
  await new Promise(r => setTimeout(r, 60));
  check('The panel chip switches to lamps: a live glow lands and joins the export',
    /lamp/.test(d.getElementById('rw-ed-mode').textContent) &&
    d.querySelectorAll('#rw-fx .rw-glow:not(.rw-glow-fire)').length === 1 &&
    /"lamps":\[\[/.test(d.getElementById('rw-ed-json').value),
    d.getElementById('rw-ed-json').value.slice(-140));
  /* back to the walkabout for the remaining checks */
  w = await load('realm.html');
  d = w.document;
  const bgEl = d.getElementById('rw-bg');
  check('Art chain is local-first with CDN fallback (or dark-stage fallback engaged)',
    (bgEl && /assets\/realms\/lorewood|cloudfront/.test(bgEl.src)) ||
    (!bgEl && !!d.getElementById('rw-capy')));
  check('Pomelo rides the padded companion canvas (sized for the tween frames)',
    d.getElementById('rw-capy').width === 57 && d.getElementById('rw-capy').height === 45);
  check('Lorewood is dressed: eight lantern glows on the world, ten drifting leaves',
    d.querySelectorAll('#rw-fx .rw-glow').length === 8 &&
    d.querySelectorAll('#rw-weather .bf-leaf').length === 10);
  check('The boss room wears Magnolia\u2019s outline (zone canvas + sealed-door text ready)',
    !!d.getElementById('rw-bosszone') &&
    /sealed/.test(d.getElementById('rw-popup-text').textContent) &&
    d.getElementById('rw-popup').hidden === true);
  check('First realm: back-arrow off, next leads to Story Forge',
    d.getElementById('rw-prev').classList.contains('is-off') &&
    /realm=storyforge/.test(d.getElementById('rw-next').href) &&
    /Onward to Story Forge/.test(d.getElementById('rw-popup-next').textContent));

  /* the dressed realms: Story Forge ships blank (Magnolia places its
     effects in the editor), Ink Reef keeps its configured bubbles */
  w = await load('realm.html?realm=storyforge');
  d = w.document;
  await until(() => d.getElementById('rw-veil').classList.contains('is-gone'), 3000);
  check('Story Forge starts undressed: the effects canvas belongs to Magnolia',
    d.querySelectorAll('#rw-fx .rw-flame').length === 0 &&
    d.querySelectorAll('#rw-fx .rw-smoke').length === 0 &&
    d.querySelectorAll('#rw-fx .rw-glow').length === 0);
  w = await load('realm.html?realm=inkreef');
  d = w.document;
  await until(() => d.querySelectorAll('#rw-fx .rw-bubble').length > 0, 3000);
  check('Ink Reef is dressed: pixel-ring bubbles in three sizes rising behind the path and Pomelo',
    d.querySelectorAll('#rw-fx .rw-bubble').length === 22 &&
    d.querySelectorAll('#rw-fx .rw-bubble-s').length > 0 &&
    d.querySelectorAll('#rw-fx .rw-bubble-m').length > 0 &&
    d.querySelectorAll('#rw-fx .rw-bubble-l').length > 0 &&
    d.querySelectorAll('#rw-weather .rw-bubble').length === 0);

  /* deep link mid-chain */
  w = await load('realm.html?realm=datadocks');
  d = w.document;
  check('?realm=datadocks selects Data Docks (realm 7 of 8) with both arrows live',
    d.getElementById('rw-title').textContent === 'Data Docks' &&
    /Realm 7 of 8/.test(d.getElementById('rw-meta').textContent) &&
    /realm=infinityisles/.test(d.getElementById('rw-prev').href) &&
    /realm=prismpeaks/.test(d.getElementById('rw-next').href));

  /* the finale */
  w = await load('realm.html?realm=prismpeaks');
  d = w.document;
  check('Prism Peaks is the last realm: no onward, the nest is named',
    /Realm 8 of 8/.test(d.getElementById('rw-meta').textContent) &&
    d.getElementById('rw-next').classList.contains('is-off') &&
    d.getElementById('rw-popup-next').hidden === true &&
    /nest/.test(d.getElementById('rw-popup-text').textContent));

  /* junk param */
  w = await load('realm.html?realm=zzz');
  d = w.document;
  check('Unknown realm ids fall back to Lorewood',
    d.getElementById('rw-title').textContent === 'Lorewood');
  check('Lorewood wears the shrinewood ui skin; other realms do not',
    d.body.classList.contains('rw-ui-shrinewood') &&
    await (async () => {
      const w2 = await load('realm.html?realm=storyforge');
      return !w2.document.body.classList.contains('rw-ui-shrinewood');
    })());

  /* hub strip */
  w = await load('map.html');
  d = w.document;
  check('The hub links all eight realms',
    d.querySelectorAll('.worldmap-svg a[href^="realm.html?realm="]').length === 8 &&
    /The Realms/.test(d.querySelector('.mappage-title').textContent));

  /* free walking on the graph: an injected preview trace gives a
     deterministic T-fork — A—B—C along the ground, D up from B */
  const TRACE = JSON.stringify({
    realm: 'lorewood',
    path: { nodes: [[0.1, 0.6], [0.4, 0.6], [0.7, 0.6], [0.4, 0.3]],
      edges: [[0, 1], [1, 2], [1, 3]], stairs: [2] },
    nodes: [[0.55, 0.6]],
    start: [0.4, 0.6],
    bossArea: []
  });
  const domF = await JSDOM.fromURL('http://localhost:8000/realm.html?realm=lorewood', {
    ...OPTS,
    beforeParse(win) {
      OPTS.beforeParse(win);
      win.localStorage.setItem('sq_realm_trace_lorewood', TRACE);
      win.localStorage.removeItem('sq_realm_prog_lorewood');
    }
  });
  w = domF.window;
  await new Promise(r => w.addEventListener('load', r));
  d = w.document;
  await until(() => Array.isArray(w.__SQ_REALM_XY), 3500);
  const key = (type, k) => d.dispatchEvent(new w.KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }));
  const xy = () => w.__SQ_REALM_XY.slice();
  const p0 = xy();                 // he starts at the fork node B
  key('keydown', 'ArrowUp');       // up must take the upward branch to D
  check('At a fork, the up key takes the branch that climbs',
    await until(() => xy()[1] < p0[1] - 20, 2500), p0[1] + ' -> ' + xy()[1]);
  key('keyup', 'ArrowUp');
  key('keydown', 'ArrowDown');     // and down walks back toward the fork
  await until(() => Math.abs(xy()[1] - p0[1]) < 8, 2500);
  key('keyup', 'ArrowDown');
  key('keydown', 'ArrowLeft');     // left roams the open ground freely
  check('Held left walks him down the left branch',
    await until(() => xy()[0] < p0[0] - 20, 2500), p0[0] + ' -> ' + xy()[0]);
  key('keyup', 'ArrowLeft');
  key('keydown', 'ArrowRight');    // right walks him up on a trial marker
  check('A trial hails him on the approach, before he stands on it',
    await until(() => !d.getElementById('rw-prompt').hidden, 7000) &&
    (w.__SQ_PROMPT_D || 0) > 60, 'opened at ' + w.__SQ_PROMPT_D + 'px');
  const hailed = w.__SQ_PROMPT;
  const pQuiz = xy();
  await new Promise(r => setTimeout(r, 900));   // right is still held down
  check('The prompt never takes the reins: he keeps walking with it up',
    Math.abs(xy()[0] - pQuiz[0]) > 15 || Math.abs(xy()[1] - pQuiz[1]) > 15,
    pQuiz.join(',') + ' -> ' + xy().join(','));
  key('keyup', 'ArrowRight');       // the right branch runs out; retreat instead
  key('keydown', 'ArrowLeft');
  check('And that waypoint lets go of him once he is properly clear',
    await until(() => w.__SQ_PROMPT !== hailed, 8000),
    'still holding ' + w.__SQ_PROMPT + ' at ' + xy().join(','));
  key('keyup', 'ArrowLeft');
  const cov = w.__SQ_JUNCTION(1);  // the fork node: every branch has a key
  check('No dead paths: every branch at the fork answers to some key',
    cov.branches.length === 3 &&
    cov.branches.every(b => cov.reachable.indexOf(b) > -1),
    JSON.stringify(cov));

  /* the editor: select-first graph editing */
  w = await load('realm.html?realm=lorewood&edit=1');
  d = w.document;
  await new Promise(r => setTimeout(r, 700));
  const stg = d.getElementById('rw-stage');
  const click = (x, y) => stg.dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  const key2 = (k) => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  const gj = () => JSON.parse(d.getElementById('rw-ed-json').value);
  check('Editor: the legend is compact rows, not a paragraph',
    d.querySelectorAll('.rw-ed-legend span').length >= 8 &&
    !d.querySelector('.rw-ed-help') &&
    d.querySelector('.rw-ed-legend').textContent.length < 240);
  key2('1');
  const g0 = gj().path;
  click(200, 200); click(340, 200); click(480, 260);   // tracing: each click chains
  await new Promise(r => setTimeout(r, 60));
  const g1 = gj().path;
  check('Editor: tracing chains — three empty clicks give three connected nodes',
    g1.nodes.length === g0.nodes.length + 3 &&
    g1.edges.length === g0.edges.length + 2);
  key2('Escape');
  click(200, 320);                                     // a fresh disconnected node
  await new Promise(r => setTimeout(r, 40));
  const g2 = gj().path;
  check('Editor: Escape breaks the chain — the next click starts an island',
    g2.nodes.length === g1.nodes.length + 1 && g2.edges.length === g1.edges.length);
  const realClick = (x, y) => {     // what hardware actually sends
    stg.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
    d.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }));
    click(x, y);
  };
  key2('Escape');                    // drop the auto-selection first
  realClick(200, 320);               // real-sequence select...
  realClick(200, 200);               // ...then node -> node connects
  await new Promise(r => setTimeout(r, 40));
  const g3 = gj().path;
  check('Editor: node then node connects them with a path (real click sequences)',
    g3.edges.length === g2.edges.length + 1);
  key2('Escape');
  click(200, 260);                                     // the new path's midpoint: selects it
  await new Promise(r => setTimeout(r, 40));
  key2('s');                                           // stairs toggle on the selected path
  await new Promise(r => setTimeout(r, 40));
  const g4 = gj().path;
  check('Editor: S marks the selected path as stairs',
    g4.stairs.length === g3.stairs.length + 1);
  key2('Delete');                                      // path-delete keeps the nodes
  await new Promise(r => setTimeout(r, 40));
  const g5 = gj().path;
  check('Editor: deleting a selected path removes only the path',
    g5.edges.length === g4.edges.length - 1 &&
    g5.nodes.length === g4.nodes.length &&
    g5.stairs.length === g4.stairs.length - 1);
  key2('Escape');
  click(340, 200);                                     // select the mid trace node
  await new Promise(r => setTimeout(r, 40));
  key2('Delete');                                      // node-delete takes its paths too
  await new Promise(r => setTimeout(r, 40));
  const g6 = gj().path;
  check('Editor: deleting a selected node removes it and its attached paths',
    g6.nodes.length === g5.nodes.length - 1 &&
    g6.edges.length === g5.edges.length - 2);
  key2('z');
  await new Promise(r => setTimeout(r, 40));
  const g7 = gj().path;
  check('Editor: Z undoes the node delete in one step',
    g7.nodes.length === g5.nodes.length && g7.edges.length === g5.edges.length);
  const move = (x, y) => stg.dispatchEvent(new w.MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
  stg.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, clientX: 480, clientY: 260 }));
  move(481, 261);                                      // jitter must not steal the click
  d.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  await new Promise(r => setTimeout(r, 40));
  const g8 = gj().path;
  check('Editor: a jittery click still selects, moving nothing',
    JSON.stringify(g8) === JSON.stringify(g7));
  stg.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, clientX: 480, clientY: 260 }));
  move(520, 300); move(524, 304);
  d.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  await new Promise(r => setTimeout(r, 40));
  const g9 = gj().path;
  check('Editor: dragging moves a node without changing counts',
    g9.nodes.length === g7.nodes.length &&
    JSON.stringify(g9.nodes) !== JSON.stringify(g7.nodes));

  const passed = results.filter(Boolean).length;
  console.log('\n' + passed + '/' + results.length + ' checks passed');
  process.exit(passed === results.length ? 0 : 1);
})();
