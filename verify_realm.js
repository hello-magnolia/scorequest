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

  /* forward-only progression: space walks him to waypoint one, where a
     quiz gates the way; passed nodes reopen as practice; no walking back */
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  check('Space walks Pomelo to the first waypoint, where the quiz opens',
    await until(() => w.__SQ_QUIZ && w.__SQ_QUIZ.practice === false, 9000) &&
    d.getElementById('rw-quiz').hidden === false &&
    d.querySelectorAll('#rw-quiz-choices button').length === 4);
  const wrongIdx = (w.__SQ_QUIZ.correctIndex + 1) % 4;
  d.querySelectorAll('#rw-quiz-choices button')[wrongIdx].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  check('A miss teaches and re-asks; progress holds at zero',
    /The answer was [A-D]:/.test(d.getElementById('rw-quiz-feedback').textContent) &&
    (w.__SQ_REALM_PROG || 0) === 0 &&
    await until(() => !d.querySelector('#rw-quiz-choices button').disabled, 3000));
  d.querySelectorAll('#rw-quiz-choices button')[w.__SQ_QUIZ.correctIndex].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  check('A pass unlocks the leg: progress one, node marked, continue offered',
    await until(() => w.__SQ_REALM_PROG === 1, 1500) &&
    d.getElementById('rw-quiz-continue').hidden === false &&
    d.querySelectorAll('.rw-node.is-passed').length === 1);
  d.getElementById('rw-quiz-continue').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await until(() => d.getElementById('rw-quiz').hidden === true, 1500);
  const leftBefore = d.getElementById('rw-capy').style.left;
  d.querySelector('.rw-node.is-passed').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 700));
  const ticksAt = w.__SQ_TICKS || 0;
  await new Promise(r => setTimeout(r, 350));
  check('The tick loop runs to completion every frame (no silent mid-tick throws)',
    (w.__SQ_TICKS || 0) > ticksAt + 3, (w.__SQ_TICKS || 0) + ' vs ' + ticksAt);
  check('A passed node reopens as extra practice, and Pomelo stays put',
    w.__SQ_QUIZ && w.__SQ_QUIZ.practice === true &&
    /EXTRA PRACTICE/.test(d.getElementById('rw-quiz-kicker').textContent) &&
    d.getElementById('rw-capy').style.left === leftBefore);

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
  // N switches to the marker layer; markers snap onto the traced path
  const markersBefore = parseInt((d.getElementById('rw-ed-count').textContent.match(/(\d+) markers/) || [0, 0])[1]);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'n', bubbles: true }));
  d.getElementById('rw-stage').dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: 300, clientY: 320 }));
  await new Promise(r => setTimeout(r, 60));
  check('N switches to marker placing, snapped onto the traced path',
    /Placing: markers/.test(d.getElementById('rw-ed-mode').textContent) &&
    parseInt((d.getElementById('rw-ed-count').textContent.match(/(\d+) markers/) || [0, 0])[1]) === markersBefore + 1,
    d.getElementById('rw-ed-count').textContent);
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
    d.querySelectorAll('.hub-realm[href^="realm.html?realm="]').length === 8 &&
    /The Realms/.test(d.querySelector('.mappage-title').textContent));

  /* free walking: an injected preview trace gives a short deterministic
     rail — a flat stretch, one stair flight, a nearby waypoint */
  const TRACE = JSON.stringify({
    realm: 'lorewood',
    path: [[0.05, 0.6], [0.30, 0.6], [0.40, 0.45], [0.55, 0.45], [0.95, 0.45]],
    nodes: [[0.55, 0.45]],
    start: [0.35, 0.525],
    stairs: [[0.30, 0.6], [0.40, 0.45]],
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
  await until(() => typeof w.__SQ_REALM_S === 'number', 3500);
  const key = (type, k) => d.dispatchEvent(new w.KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }));
  const s0 = w.__SQ_REALM_S;
  key('keydown', 'ArrowUp');   // he starts mid-flight: up should climb
  check('On a stair pair, the up key climbs the flight',
    await until(() => w.__SQ_REALM_S > s0 + 25, 2500), s0 + ' -> ' + w.__SQ_REALM_S);
  key('keyup', 'ArrowUp');
  await new Promise(r => setTimeout(r, 200));
  const s1 = w.__SQ_REALM_S;
  key('keydown', 'ArrowLeft'); // free roaming backward over open ground
  check('Held left walks him back down the rails',
    await until(() => w.__SQ_REALM_S < s1 - 25, 2500), s1 + ' -> ' + w.__SQ_REALM_S);
  key('keyup', 'ArrowLeft');
  key('keydown', 'ArrowRight');
  check('Held forward clamps at the next waypoint, whose trial opens itself',
    await until(() => !d.getElementById('rw-quiz').hidden, 7000));
  key('keyup', 'ArrowRight');
  const sQuiz = w.__SQ_REALM_S;
  key('keydown', 'ArrowLeft');
  await new Promise(r => setTimeout(r, 500));
  key('keyup', 'ArrowLeft');
  check('Keys go quiet while the quiz is up', w.__SQ_REALM_S === sQuiz);

  /* the editor: loop snapping and stair pairs */
  w = await load('realm.html?realm=lorewood&edit=1');
  d = w.document;
  await new Promise(r => setTimeout(r, 700));
  const stg = d.getElementById('rw-stage');
  const click = (x, y) => stg.dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  const key2 = (k) => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  key2('1');                       // path tool
  click(200, 300); click(420, 340);
  click(206, 305);                 // within snap range of the first click
  await new Promise(r => setTimeout(r, 60));
  const pj = JSON.parse(d.getElementById('rw-ed-json').value);
  const lastP = pj.path[pj.path.length - 1];
  check('Editor: a path click near an earlier vertex snaps to it exactly (loops close)',
    pj.path.slice(0, -1).some(p => p[0] === lastP[0] && p[1] === lastP[1]));
  const stairsBefore = pj.stairs.length;
  key2('4');                       // stair pairs tool
  click(260, 310); click(390, 335);
  await new Promise(r => setTimeout(r, 60));
  const pj2 = JSON.parse(d.getElementById('rw-ed-json').value);
  check('Editor: stair markers land in pairs and the bar counts flights',
    pj2.stairs.length === stairsBefore + 2 &&
    /\d+ flights/.test(d.getElementById('rw-ed-count').textContent) &&
    /stair/i.test(d.querySelector('.rw-ed-legend').textContent));

  /* point editing: insert on the line, delete the hovered point, undo, drag */
  check('Editor: the legend is compact rows, not a paragraph',
    d.querySelectorAll('.rw-ed-legend span').length >= 8 &&
    !d.querySelector('.rw-ed-help') &&
    d.querySelector('.rw-ed-legend').textContent.length < 220);
  key2('1');
  const insBefore = JSON.parse(d.getElementById('rw-ed-json').value).path;
  click(310, 320);                 // exactly on the line between the two test points
  await new Promise(r => setTimeout(r, 40));
  const afterIns = JSON.parse(d.getElementById('rw-ed-json').value).path;
  check('Editor: a click on the path line inserts a vertex there, not at the end',
    afterIns.length === insBefore.length + 1 &&
    JSON.stringify(afterIns[afterIns.length - 1]) === JSON.stringify(insBefore[insBefore.length - 1]));
  const move = (x, y) => stg.dispatchEvent(new w.MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
  move(420, 340);                  // hover the second test point...
  await new Promise(r => setTimeout(r, 120));
  key2('Delete');                  // ...and remove it
  await new Promise(r => setTimeout(r, 40));
  const afterDel = JSON.parse(d.getElementById('rw-ed-json').value).path;
  check('Editor: Delete removes the hovered point',
    afterDel.length === afterIns.length - 1);
  key2('z');
  await new Promise(r => setTimeout(r, 40));
  const afterUndo = JSON.parse(d.getElementById('rw-ed-json').value).path;
  check('Editor: Z undoes the delete', afterUndo.length === afterIns.length);
  stg.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, clientX: 200, clientY: 300 }));
  move(238, 328); move(240, 330);
  d.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  await new Promise(r => setTimeout(r, 40));
  const afterDrag = JSON.parse(d.getElementById('rw-ed-json').value).path;
  check('Editor: dragging moves a point without changing the count',
    afterDrag.length === afterUndo.length &&
    JSON.stringify(afterDrag) !== JSON.stringify(afterUndo));

  const passed = results.filter(Boolean).length;
  console.log('\n' + passed + '/' + results.length + ' checks passed');
  process.exit(passed === results.length ? 0 : 1);
})();
