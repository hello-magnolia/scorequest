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

  /* forward-only progression: space walks him to waypoint one, where the
     waypoint prompt gates the way; Start opens the quiz; passed nodes
     reopen as practice; no walking back */
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  check('Space walks Pomelo to the first waypoint, where the prompt offers Start',
    await until(() => d.getElementById('rw-prompt').hidden === false, 9000) &&
    /Waypoint 1 of/.test(d.getElementById('rw-prompt-title').textContent) &&
    d.getElementById('rw-prompt-go').textContent === 'Start');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  check('Space fires Start: the quiz opens fresh, not as practice',
    await until(() => w.__SQ_QUIZ && w.__SQ_QUIZ.practice === false, 2500) &&
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
  check('A passed node reopens through the prompt as Retry, and Pomelo stays put',
    await until(() => d.getElementById('rw-prompt').hidden === false, 2500) &&
    /cleared/.test(d.getElementById('rw-prompt-title').textContent) &&
    d.getElementById('rw-prompt-go').textContent === 'Retry' &&
    d.getElementById('rw-capy').style.left === leftBefore);
  d.getElementById('rw-prompt-go').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  check('Retry reopens the quiz as extra practice',
    await until(() => w.__SQ_QUIZ && w.__SQ_QUIZ.practice === true, 2500) &&
    /EXTRA PRACTICE/.test(d.getElementById('rw-quiz-kicker').textContent));

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
  key('keydown', 'ArrowRight');    // right runs into the locked trial marker
  check('A locked trial blocks the way and prompts on arrival',
    await until(() => !d.getElementById('rw-prompt').hidden, 7000));
  key('keyup', 'ArrowRight');
  const pQuiz = xy();
  key('keydown', 'ArrowLeft');
  await new Promise(r => setTimeout(r, 500));
  key('keyup', 'ArrowLeft');
  check('Keys go quiet while the prompt is up', xy()[0] === pQuiz[0] && xy()[1] === pQuiz[1]);
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
