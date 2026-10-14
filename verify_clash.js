/* Verify the Critter Clash page: shared bank and engine wired in, one boss per biome
   with a ward that only correct answers crack, Pomelo's HP that never ends in a loss,
   the trail, saved progress, attempts recording, focus and motion modes, the biome
   switch and the ambient layer. Run with the gate (serves :8000). */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  (' + d + ')' : '')); };
const vc = new VirtualConsole(); vc.on('error', () => {}); vc.on('jsdomError', () => {});
const until = async (fn, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (e) {} await new Promise(r => setTimeout(r, 25)); } return false; };

async function open(path, before) {
  const dom = await JSDOM.fromURL('http://localhost:8000/' + path, {
    resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {}; w.ResizeObserver = w.ResizeObserver || class { observe() {} disconnect() {} };
      w.HTMLElement.prototype.scrollIntoView = function () {};
      if (before) before(w);
    }
  });
  await new Promise(r => dom.window.addEventListener('load', r));
  await until(() => dom.window.__SQ_CLASH && dom.window.document.querySelector('.choices, .spr'));
  return dom.window;
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const sorted = (w, domain) => w.SQ_QUESTION_BANK.questions.filter(q => q.domain === domain).sort((a, b) => (a.difficulty - b.difficulty) || (a.id < b.id ? -1 : 1));
async function answer(w, good) {
  const d = w.document, S = w.__SQ_CLASH.state, q = sorted(w, DOMAIN[S.biome])[S.cur];
  if (q.type === 'mcq') { const c = q.choices.find(c => !!c.correct === good); click(w, d.querySelector('.choices button[data-k="' + c.key + '"]')); }
  else { const inp = d.querySelector('#spr-in'); inp.value = good ? q.accepted[0] : '9999'; inp.dispatchEvent(new w.Event('input', { bubbles: true })); }
  click(w, d.querySelector('#bCheck'));
  await w.SQArena.idle();
  await new Promise(r => setTimeout(r, 30));
}
const DOMAIN = { lorewood: 'Information and Ideas', storyforge: 'Craft and Structure', inkreef: 'Expression of Ideas', syntaxcitadel: 'Standard English Conventions',
  mirrormines: 'Algebra', infinityisles: 'Advanced Math', datadocks: 'Problem-Solving and Data Analysis', prismpeaks: 'Geometry and Trigonometry' };

(async () => {
  let w = await open('clash.html?realm=lorewood', (win) => { win.localStorage.clear(); });
  let d = w.document;
  w.SQArena.setMotion('off');   /* keep the suite fast; motion itself is checked below */

  /* wiring: the shared bank, engine and renderer, nothing duplicated */
  check('Shared bank loaded (data/questions.js, originals only)', w.SQ_QUESTION_BANK && w.SQ_QUESTION_BANK.questions.length >= 150 && w.SQ_QUESTION_BANK.questions.every(q => /^SQ-/.test(q.id)));
  check('The question card names its source (ScoreQuest original on the static bank)', /ScoreQuest original/.test(d.querySelector('.qmeta .qsrc').textContent) && !d.querySelector('.qsrc.official'));
  check('Shared engine and figure renderer present', !!(w.SQQuestions && w.SQAttempts && w.SQFigures));
  check('Lorewood opens on Information and Ideas', w.__SQ_CLASH.state.biome === 'lorewood' && /Information and Ideas/.test(d.querySelector('.qmeta').textContent) === false && d.querySelector('.passage'), 'passage shown');
  const n = sorted(w, 'Information and Ideas').length;
  check('Trail has one node per question plus the lair', d.querySelectorAll('#trail .node').length === n && !!d.querySelector('#trail .lair'));
  check('Current node carries the lantern, no numbers on nodes', !!d.querySelector('#trail .node.cur .here') && [...d.querySelectorAll('#trail .node')].every(b => !/\d/.test(b.textContent)));
  const wardMax = w.__SQ_CLASH.state.ward;
  check('Boss ward sized from the biome (3..10)', wardMax >= 3 && wardMax <= 10 && d.querySelectorAll('#cx-ward i').length === wardMax, wardMax + ' pips');
  check('Pomelo starts with full HP', w.__SQ_CLASH.state.pomHp === 5 && d.querySelectorAll('#me-hp i.on').length === 5);
  check('Explanation panel hidden before Check', d.querySelector('#whybox').hidden === true);
  check('Check disabled until an answer is picked', d.querySelector('#bCheck').disabled === true);

  /* a correct answer cracks one pip and records an attempt */
  await answer(w, true);
  let S = w.__SQ_CLASH.state;
  check('Correct answer cracks one ward pip', S.ward === wardMax - 1 && d.querySelectorAll('#cx-ward i.on').length === wardMax - 1);
  check('Explanation shown after Check', d.querySelector('#whybox').hidden === false && /Correct/.test(d.querySelector('#why .verdict').textContent) && d.querySelector('#why .body').textContent.length > 40);
  check('Trail marks the question correct', d.querySelector('#trail .node.won') !== null);
  check('Completion bar advances', /[1-9]\d*%/.test(d.querySelector('#donePct').textContent), d.querySelector('#donePct').textContent);
  const att = w.SQAttempts.list();
  check('Attempt recorded with clash session id', att.length === 1 && att[0].correct === true && att[0].session_id === 'clash:lorewood' && att[0].domain === 'Information and Ideas');
  check('Pomelo HP untouched by a correct answer', S.pomHp === 5);

  /* a miss drains Pomelo, never the ward; retry offered */
  click(w, d.querySelector('#bNext'));
  await answer(w, false);
  S = w.__SQ_CLASH.state;
  check('Miss leaves the ward alone', S.ward === wardMax - 1);
  check('Miss drains one Pomelo HP segment', S.pomHp === 4 && d.querySelectorAll('#me-hp i.on').length === 4);
  check('Miss shows the answer, a slip hint and a retry', /answer is [A-D]/.test(d.querySelector('#why .verdict').textContent) && !d.querySelector('#bRetry').hidden);
  check('Trail flags the miss', d.querySelector('#trail .node.missed') !== null);
  check('Retry clears the answer', (click(w, d.querySelector('#bRetry')), !d.querySelector('#trail .node.missed') && d.querySelector('#whybox').hidden));

  /* five misses: Pomelo rests and refills, no loss, ward keeps its cracks */
  for (let i = 0; i < 3; i++) { await answer(w, false); click(w, d.querySelector('#bNext')); }
  check('Three more misses leave Pomelo at 1 HP (the retried miss already cost one)', w.__SQ_CLASH.state.pomHp === 1);
  await answer(w, false);
  check('Fifth miss empties the bar and Pomelo rests', w.__SQ_CLASH.state.pomHp === 0 && /rest/.test(d.querySelector('#cx-log').textContent));
  check('Pomelo bounces back to full HP', await until(() => w.__SQ_CLASH.state.pomHp === 5, 3000));
  check('Ward still has its cracks after the rest', w.__SQ_CLASH.state.ward === wardMax - 1);

  /* progress persists across a reload; dispel the boss */
  const saved = JSON.parse(w.localStorage.getItem('sq_clash_lorewood'));
  check('Progress saved per biome', saved && Object.keys(saved).length >= 5);
  const keep = {}; ['sq_clash_lorewood', 'sq_attempts', 'sq_clash_last'].forEach(k => { keep[k] = w.localStorage.getItem(k); });
  w = await open('clash.html?realm=lorewood', (win) => { win.localStorage.clear(); Object.keys(keep).forEach(k => keep[k] && win.localStorage.setItem(k, keep[k])); win.localStorage.setItem('sq_motion', 'off'); });
  d = w.document;
  check('Reload restores ward and trail', w.__SQ_CLASH.state.ward === wardMax - 1 && d.querySelectorAll('#trail .node.won').length === 1 && d.querySelectorAll('#trail .node.missed').length === 4);
  check('Motion setting read from localStorage', w.__SQ_CLASH.state.motion === 'off' && /off/.test(d.querySelector('#bMotion').textContent));
  let guard = 0;
  while (w.__SQ_CLASH.state.ward > 0 && guard++ < 40) {
    const S2 = w.__SQ_CLASH.state, q = sorted(w, 'Information and Ideas')[S2.cur];
    if (S2.progress[q.id]) { click(w, d.querySelector('#bNext')); continue; }
    await answer(w, true); click(w, d.querySelector('#bNext'));
  }
  check('Enough correct answers dispel the boss', w.__SQ_CLASH.state.ward === 0 && /dispelled/i.test(d.querySelector('#cx-log').textContent));
  check('Dispelled boss stays dispelled on reload', await (async () => { const keep2 = w.localStorage.getItem('sq_clash_lorewood'); const w2 = await open('clash.html?realm=lorewood', (win) => { win.localStorage.clear(); win.localStorage.setItem('sq_clash_lorewood', keep2); win.localStorage.setItem('sq_motion', 'off'); }); return w2.__SQ_CLASH.state.ward === 0 && /dispelled/i.test(w2.document.querySelector('#cx-log').textContent); })());

  /* focus and motion controls */
  click(w, d.querySelector('#bFocus'));
  check('Focus hides the screen and shows the two quiet bars', d.body.classList.contains('focus') && w.getComputedStyle(d.querySelector('#screen')).display === 'none' && w.getComputedStyle(d.querySelector('#mini')).display !== 'none' && w.localStorage.getItem('sq_clash_focus') === 'true');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'f', bubbles: true }));
  check('F toggles focus off again', !d.body.classList.contains('focus'));
  click(w, d.querySelector('#bMotion'));
  check('Motion button cycles and saves', w.__SQ_CLASH.state.motion === 'full' && w.localStorage.getItem('sq_motion') === 'full');
  check('Ambient layer present and biome-aware', !!w.SQAmbient && !!d.querySelector('#ambient'));

  /* keyboard: A-D picks, Enter checks, arrows move */
  w = await open('clash.html?realm=mirrormines', (win) => { win.localStorage.clear(); win.localStorage.setItem('sq_motion', 'off'); });
  d = w.document;
  check('Biome switch via ?realm= loads Algebra with the Crystal Bear', w.__SQ_CLASH.state.biome === 'mirrormines' && /Crystal Bear/.test(d.querySelector('#cx-boss').textContent));
  check('Figures and tables render in the card for math questions', (() => { const qs = sorted(w, 'Algebra'); const i = qs.findIndex(q => q.figure || q.table); if (i < 0) return true; w.__SQ_CLASH.open(i); return !!d.querySelector('#read svg, #read table.data'); })());
  w.__SQ_CLASH.open(0);
  const q0 = sorted(w, 'Algebra')[0];
  if (q0.type === 'mcq') {
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', bubbles: true }));
    check('Letter key picks a choice', d.querySelector('.choices button[data-k="B"]').classList.contains('picked') && !d.querySelector('#bCheck').disabled);
  } else {
    check('Grid-in question offers an input', !!d.querySelector('#spr-in'));
  }
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  check('Arrow key moves along the trail', w.__SQ_CLASH.state.cur === 1 && d.querySelectorAll('#trail .node')[1].classList.contains('cur'));
  const sel = d.querySelector('#biome'); sel.value = 'prismpeaks'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  await until(() => w.__SQ_CLASH.state.biome === 'prismpeaks');
  check('Biome dropdown switches biome and boss', w.__SQ_CLASH.state.biome === 'prismpeaks' && /Summit Bear/.test(d.querySelector('#cx-boss').textContent) && /realm=prismpeaks/.test(w.location.search));
  check('No em dashes in rendered page text', !d.body.textContent.includes('—'));

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
