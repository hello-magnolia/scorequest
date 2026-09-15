/* Verify plan gating and the kid-facing wall: what each plan opens, how
   Basic's two-at-a-time window advances, the world map drawn shut, the wall
   on realm entry / extra practice / boss rematch, and the trial that starts
   on the success page. Seeds localStorage before scripts run, the same way a
   returning player's browser would already carry it. */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); };
const vc = new VirtualConsole(); vc.on('error', () => {}); vc.on('jsdomError', () => {});

const load = async (path, seed) => {
  const dom = await JSDOM.fromURL('http://localhost:8000/' + path, {
    resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = w.matchMedia || (q => ({ matches: false, addListener() {}, removeListener() {} }));
      w.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(t) { this.cb([{ target: t, isIntersecting: true }], this); } unobserve() {} disconnect() {} };
      w.__SQ_NO_REDIRECT = true;                              // no navigating away mid-check
      try {
        w.localStorage.clear();
        w.localStorage.setItem('sq_intro_seen', 'v2');          // the cinematic is not the subject here
        w.localStorage.setItem('sq_character', JSON.stringify({ name: 'Tester' }));
        Object.keys(seed || {}).forEach(k => w.localStorage.setItem(k, seed[k]));
      } catch (e) {}
    }
  });
  await new Promise(r => dom.window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 450));
  return dom.window;
};
const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise(r => setTimeout(r, 40)); } return fn(); };
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const names = (P, ids) => ids.map(id => P.byId(id).name).join(', ');

(async () => {
  /* ============================================================
     1 — the model: what each plan opens
     ============================================================ */
  let w = await load('map.html');
  let P = w.SQPlan;
  check('SQPlan ships the eight realms in map order, split rw / math',
    !!P && P.REALMS.length === 8 &&
    P.REALMS.filter(r => r.section === 'rw').length === 4 &&
    P.REALMS.filter(r => r.section === 'math').length === 4);
  check('No plan on file previews the whole world (demo and marketing stay walkable)',
    P.current() === 'allaccess' && P.allRealmsOpen() &&
    P.openSet().length === 8 && P.canPractice(),
    P.current());
  check('The long-standing test-user flag still means full capabilities',
    (await load('map.html', { sq_all_access: '1' })).SQPlan.current() === 'complete');

  w = await load('map.html', { sq_plan: 'basic' });
  P = w.SQPlan;
  check('Basic opens exactly two realms, one in Reading and Writing and one in Math',
    P.current() === 'basic' && !P.allRealmsOpen() &&
    P.openSet().join(',') === 'lorewood,mirrormines',
    names(P, P.openSet()));
  check('Basic closes the other six outright',
    !P.canEnter('inkreef') && !P.canEnter('prismpeaks') &&
    P.canEnter('lorewood') && P.canEnter('mirrormines'));
  check('Basic buys no extra practice; All Access and Complete both do',
    !P.canPractice() &&
    P.PLANS.allaccess.extraPractice && P.PLANS.complete.extraPractice);
  check('The landing-page card ids reach the same realms as the map slugs',
    !P.canEnter('expression') && P.canEnter('info') && P.canEnter('algebra'));

  /* the window advances when a guardian steps aside, and cleared ground stays open */
  w = await load('map.html', { sq_plan: 'basic', sq_boss_lorewood: 'cleared' });
  P = w.SQPlan;
  check('Clearing a guardian advances the window to the next realm in that section',
    P.canEnter('storyforge') && !P.canEnter('inkreef'),
    names(P, P.openSet()));
  check('Ground already cleared stays walkable rather than closing behind the player',
    P.canEnter('lorewood') && P.isFinished('lorewood'));
  check('The other section is untouched by Reading and Writing progress',
    P.canEnter('mirrormines') && !P.canEnter('infinityisles'));

  /* ============================================================
     2 — the world map drawn shut
     ============================================================ */
  let d = w.document;
  const lockedAnchors = d.querySelectorAll('.worldmap-svg a.wm-locked');
  check('The world map draws every closed realm shut and leaves the open ones alone',
    lockedAnchors.length === 5 && d.querySelectorAll('.worldmap-svg a').length === 8,
    lockedAnchors.length + ' locked');
  check('Closed realms carry a plain lock line on their label',
    d.querySelectorAll('.worldmap-label.is-locked').length === 5 &&
    /closed for now/.test(d.querySelector('.worldmap-label-lock').textContent));
  check('A closed region announces itself to screen readers',
    /closed on Basic/.test(lockedAnchors[0].getAttribute('aria-label')));

  click(w, lockedAnchors[0]);
  check('Clicking a closed realm opens the wall instead of walking in',
    d.getElementById('sq-wall') && d.getElementById('sq-wall').hidden === false &&
    w.__SQ_WALL && w.__SQ_WALL.kind === 'realm');
  const wallText = d.querySelector('.sq-wall-body').textContent;
  check('The wall explains the rule, names what IS open, and names All Access',
    /two realms open at a time/.test(wallText) &&
    /All Access opens all eight at once/.test(wallText) &&
    /Story Forge|Mirror Mines/.test(wallText), wallText.slice(0, 60));
  check('The wall keeps the low-anxiety register: no prices, no em dashes, nothing lost',
    !/—/.test(wallText) && !/\$/.test(wallText) &&
    !/(fail|lose|lost|behind schedule)/i.test(wallText));
  check('The wall offers the open realm and a grown-up, and closes on the map',
    /Head to /.test(d.querySelector('.sq-wall-go').textContent) &&
    d.querySelector('.sq-wall-grown').getAttribute('href') === 'index.html#pricing' &&
    d.querySelector('.sq-wall-close').hidden === false);
  click(w, d.querySelector('.sq-wall-close'));
  check('Dismissing the wall on the map leaves the player where they were',
    d.getElementById('sq-wall').hidden === true && !w.__SQ_WALL);

  w = await load('map.html', { sq_plan: 'allaccess' });
  check('All Access leaves the whole map open, with no locks drawn',
    w.document.querySelectorAll('.worldmap-svg a.wm-locked').length === 0 &&
    w.document.querySelectorAll('.worldmap-label.is-locked').length === 0);

  /* ============================================================
     3 — realm.html: the gate at the door
     ============================================================ */
  w = await load('realm.html?realm=inkreef', { sq_plan: 'basic' });
  d = w.document;
  check('Walking straight into a closed realm meets the wall',
    w.__SQ_WALL && w.__SQ_WALL.kind === 'realm' &&
    d.getElementById('sq-wall').hidden === false &&
    /Ink Reef is closed for now/.test(d.querySelector('.sq-wall-title').textContent));
  check('That wall is firm: no close button, and the way out is the map',
    d.querySelector('.sq-wall-close').hidden === true &&
    d.querySelector('.sq-wall-go').getAttribute('href') === 'map.html');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  await new Promise(r => setTimeout(r, 250));
  check('Nothing steers behind a firm wall, and the realm stays unvisited on the map',
    d.getElementById('rw-prompt').hidden === true &&
    w.localStorage.getItem('sq_visited_inkreef') === null);

  w = await load('realm.html?realm=lorewood', { sq_plan: 'basic' });
  d = w.document;
  check('An open realm on Basic is an ordinary walkabout, wall and all out of the way',
    !w.__SQ_WALL && d.getElementById('sq-wall') === null &&
    w.localStorage.getItem('sq_visited_lorewood') === '1');

  /* extra practice: a cleared trial reopens as the wall, not as a quiz */
  w = await load('realm.html?realm=lorewood', { sq_plan: 'basic', sq_realm_prog_lorewood: '[0]' });
  d = w.document;
  await until(() => d.getElementById('rw-veil').classList.contains('is-gone'), 4000);
  check('A trial already passed shows as passed',
    await until(() => d.querySelectorAll('.rw-node.is-passed').length === 1, 3000));
  click(w, d.querySelector('.rw-node.is-passed'));
  check('Walking back to it still offers Retry',
    await until(() => d.getElementById('rw-prompt').hidden === false, 6000) &&
    d.getElementById('rw-prompt-go').textContent === 'Retry');
  click(w, d.getElementById('rw-prompt-go'));
  check('Retry on Basic meets the extra-practice wall instead of the quiz',
    await until(() => !!w.__SQ_WALL, 1500) && w.__SQ_WALL.kind === 'practice' &&
    d.getElementById('rw-quiz').hidden === true &&
    /extra practice/.test(d.querySelector('.sq-wall-body').textContent));
  check('The practice wall is dismissible: the walk goes on',
    d.querySelector('.sq-wall-close').hidden === false &&
    d.querySelector('.sq-wall-go').hidden === true);

  w = await load('realm.html?realm=lorewood', { sq_plan: 'allaccess', sq_realm_prog_lorewood: '[0]' });
  d = w.document;
  await until(() => d.getElementById('rw-veil').classList.contains('is-gone'), 4000);
  await until(() => d.querySelectorAll('.rw-node.is-passed').length === 1, 3000);
  click(w, d.querySelector('.rw-node.is-passed'));
  await until(() => d.getElementById('rw-prompt').hidden === false, 6000);
  click(w, d.getElementById('rw-prompt-go'));
  check('All Access replays the same trial as extra practice, no wall',
    await until(() => !!w.__SQ_QUIZ && w.__SQ_QUIZ.practice === true, 2500) &&
    /EXTRA PRACTICE/.test(d.getElementById('rw-quiz-kicker').textContent) && !w.__SQ_WALL);

  /* ============================================================
     4 — boss.html: closed realms and rematches
     ============================================================ */
  w = await load('boss.html?realm=inkreef', { sq_plan: 'basic' });
  d = w.document;
  check('A guardian in a closed realm is behind the same firm wall',
    w.__SQ_WALL && w.__SQ_WALL.kind === 'realm' &&
    d.querySelector('.sq-wall-close').hidden === true);
  check('The fight is sealed while the wall is up',
    w.__SQ_BOSS.over === true && w.__SQ_BOSS.bossHp === w.__SQ_BOSS.bossMax);

  w = await load('boss.html?realm=lorewood', { sq_plan: 'basic', sq_boss_lorewood: 'cleared' });
  d = w.document;
  check('A rematch on Basic meets the extra-practice wall, not the arena',
    w.__SQ_WALL && w.__SQ_WALL.kind === 'rematch' &&
    w.__SQ_BOSS.over === true &&
    /stepped aside/.test(d.querySelector('.sq-wall-title').textContent));
  check('The rematch wall points back into the realm and can be dismissed',
    d.querySelector('.sq-wall-go').getAttribute('href') === 'realm.html?realm=lorewood' &&
    d.querySelector('.sq-wall-close').hidden === false);

  w = await load('boss.html?realm=lorewood', { sq_plan: 'allaccess', sq_boss_lorewood: 'cleared' });
  check('All Access rematches freely: the guardian stands back up',
    !w.__SQ_WALL && w.__SQ_BOSS.over === false);

  w = await load('boss.html?realm=lorewood', { sq_plan: 'basic' });
  check('A first fight in an open realm is never walled',
    !w.__SQ_WALL && w.__SQ_BOSS.over === false);

  /* ============================================================
     5 — where a trial becomes real
     ============================================================ */
  w = await load('success.html?plan=basic');
  d = w.document;
  check('The success page records the plan the trial started on',
    w.SQPlan.current() === 'basic' && w.localStorage.getItem('sq_plan') === 'basic');
  check('And says out loud what that plan opens',
    d.getElementById('suc-plan').hidden === false &&
    /Your plan: Basic/.test(d.getElementById('suc-plan').textContent) &&
    /Two realms stay open at a time/.test(d.getElementById('suc-plan').textContent));
  w = await load('success.html?plan=allaccess');
  check('All Access says the other thing, and the line stays quiet with no plan in the URL',
    /All eight realms are open/.test(w.document.getElementById('suc-plan').textContent) &&
    (await load('success.html')).document.getElementById('suc-plan').hidden === true);

  /* ============================================================
     6 — the plan, stated plainly, in settings
     ============================================================ */
  /* the account pages render only for a signed-in player; the demo login and a
     stand-in session token stand in for one, as the hub suite does */
  const settings = async (plan) => {
    const sw = await load('settings.html', {
      sq_plan: plan, 'sb-moasnmwcikwybriwaoip-auth-token': '{"harness":true}'
    });
    sw.SQAuth.signInWithEmail('rowan@demo.test', 'pw');
    await until(() => !!sw.document.getElementById('st-plan').textContent, 2500);
    return sw;
  };
  w = await settings('basic');
  d = w.document;
  check('Settings names the plan and the two realms open right now',
    d.getElementById('st-plan').textContent === 'Basic' &&
    /Two realms stay open at a time/.test(d.getElementById('st-plan-note').textContent) &&
    /Lorewood and Mirror Mines/.test(d.getElementById('st-plan-note').textContent),
    d.getElementById('st-plan-note').textContent);
  w = await settings('complete');
  check('Complete reads as everything open, with a route to the plans',
    w.document.getElementById('st-plan').textContent === 'Complete' &&
    /All eight realms are open/.test(w.document.getElementById('st-plan-note').textContent) &&
    !!w.document.querySelector('a[href="index.html#pricing"]'));

  const passed = results.filter(Boolean).length;
  console.log('\n' + passed + '/' + results.length + ' checks passed');
  process.exit(passed === results.length ? 0 : 1);
})();
