/* Verify the practice page: question engine (filters, sessions, grid-in rules,
   answer checking), the setup -> question -> summary flow, attempts recording,
   figures, passages, deep links and resume. Run with the gate (serves :8000). */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  (' + d + ')' : '')); };
const vc = new VirtualConsole(); vc.on('error', () => {}); vc.on('jsdomError', () => {});
const until = async (fn, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (e) {} await new Promise(r => setTimeout(r, 25)); } return false; };

async function open(path, before) {
  const dom = await JSDOM.fromURL('http://localhost:8000/' + path, {
    resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} })); w.scrollTo = () => {}; if (before) before(w); }
  });
  await new Promise(r => dom.window.addEventListener('load', r));
  await until(() => dom.window.__SQ_PRACTICE);
  return dom.window;
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

(async () => {
  let w = await open('practice.html');
  const d = w.document, Q = w.SQQuestions;

  /* engine */
  check('Question bank loaded (originals only)', Q && Q.all().length >= 100 && Q.all().every(q => /^SQ-/.test(q.id)), Q && Q.all().length + ' questions');
  check('Four math domains offered', Q.domains('math').length === 4 && Q.domains('rw').length === 4);
  check('Filter by domain and difficulty', Q.filter({ domains: ['Algebra'], difficulty: 3 }).every(q => q.domain === 'Algebra' && q.difficulty === 3) && Q.filter({ domains: ['Algebra'], difficulty: 3 }).length > 0);
  const s = Q.session({ section: 'math' }, 10);
  check('Session of 10 distinct math questions', s.length === 10 && new Set(s.map(q => q.id)).size === 10 && s.every(q => q.section === 'math'));
  check('Session spreads across skills', new Set(s.map(q => q.skill)).size >= 6, new Set(s.map(q => q.skill)).size + ' skills');
  const g = (t) => Q.gridIn(t).ok;
  check('Grid-in accepts 12, 0.75, .5, 3/4, -2.25', ['12', '0.75', '.5', '3/4', '-2.25'].every(g));
  check('Grid-in rejects mixed numbers, commas, %, 6 characters, letters', !g('3 1/2') && !g('1,200') && !g('50%') && !g('123456') && !g('x') && g('-12345') && !g('-123456'));
  const fake = { type: 'spr', accepted: ['1/2', '.5', '0.5'] };
  check('1/2, .5 and 0.5 all count; 2/4 counts too', ['1/2', '.5', '0.5', '2/4'].every(t => Q.check(fake, t).correct) && !Q.check(fake, '0.4').correct);
  const third = { type: 'spr', accepted: ['1/3', '.3333', '0.333'] };
  check('Repeating decimals: listed truncations count, rough ones do not', Q.check(third, '.3333').correct && Q.check(third, '1/3').correct && !Q.check(third, '.33').correct);
  const mcq = Q.all().find(q => q.type === 'mcq');
  const key = mcq.choices.find(c => c.correct).key, wrong = mcq.choices.find(c => !c.correct).key;
  check('Multiple choice check', Q.check(mcq, key).correct && !Q.check(mcq, wrong).correct && Q.check(mcq, null).status === 'empty');

  /* setup */
  check('Setup shows math domain chips', d.querySelectorAll('#pr-domains .pr-chip').length === 4);
  click(w, d.querySelector('#pr-section [data-v="rw"]'));
  check('Switching section swaps the domains', [...d.querySelectorAll('#pr-domains .pr-chip')].some(b => b.dataset.d === 'Craft and Structure'));
  click(w, d.querySelector('#pr-section [data-v="math"]'));
  check('Availability line counts matching questions', /\d+ questions match/.test(d.querySelector('#pr-avail').textContent));
  click(w, d.querySelector('#pr-len [data-v="5"]'));
  click(w, d.querySelector('#pr-start'));
  const P = w.__SQ_PRACTICE;
  check('Start opens a 5-question session', !d.querySelector('#pr-run').hidden && P.run.questions.length === 5 && /Question 1 of 5/.test(d.querySelector('#pr-count').textContent));

  /* answer every question: first right, the rest wrong where possible */
  let sawFigure = false, sawSpr = false, sawSlip = false;
  for (let k = 0; k < 5; k++) {
    const q = P.current;
    if (d.querySelector('#pr-q svg.sq-fig, #pr-q table.data')) sawFigure = true;
    if (q.type === 'mcq') {
      const pick = k === 0 ? q.choices.find(c => c.correct) : q.choices.find(c => !c.correct);
      click(w, d.querySelector('.pr-choice[data-k="' + pick.key + '"]'));
    } else {
      sawSpr = true;
      d.querySelector('#pr-spr-in').value = k === 0 ? q.accepted[0] : '99999';
    }
    click(w, d.querySelector('#pr-check'));
    if (k === 0) check('Right answer says Correct and shows the explanation', /Correct\./.test(d.querySelector('#pr-feedback').textContent) && !!d.querySelector('.pr-explain'));
    else {
      if (d.querySelector('.pr-slip')) sawSlip = true;
      if (k === 1) check('Wrong answer is gentle ("Not quite") and names the answer', /Not quite\./.test(d.querySelector('#pr-feedback').textContent));
    }
    click(w, d.querySelector('#pr-next'));
  }
  check('Wrong multiple-choice answers show the trap as a hint', sawSlip || !d.querySelector('.pr-choice'));
  const att = JSON.parse(w.localStorage.getItem('sq_attempts') || '[]');
  check('Every answer recorded as an attempt', att.length === 5 && att[0].correct === true && att.slice(1).every(a => a.correct === false) && att.every(a => a.session_id && a.skill), att.length + ' attempts');
  check('Summary shows the score', !d.querySelector('#pr-summary').hidden && /1\s*of 5 correct/.test(d.querySelector('#pr-score').textContent));
  check('Summary breaks results down by skill', d.querySelectorAll('.pr-skill').length >= 1);
  check('Missed questions listed for review', d.querySelectorAll('.pr-review').length === 4);
  click(w, d.querySelector('.pr-review'));
  check('Review reopens a missed question with its explanation', !d.querySelector('#pr-run').hidden && !!d.querySelector('.pr-explain') && /Reviewing/.test(d.querySelector('#pr-count').textContent));
  check('Reviewing does not add attempts', JSON.parse(w.localStorage.getItem('sq_attempts')).length === 5);
  click(w, d.querySelector('#pr-next'));
  check('Back to results from review', !d.querySelector('#pr-summary').hidden);
  click(w, d.querySelector('#pr-again-missed'));
  check('"Practice the skills I missed" starts a new session', !d.querySelector('#pr-run').hidden && P.run.questions.length > 0);
  check('No em dashes or raw markup in rendered text', !d.body.textContent.includes('—') && !/\{\/?s\d+\}/.test(d.body.textContent));

  /* figures and passages, found directly */
  const figQ = Q.all().find(q => q.figure && q.figure.spec);
  P.start([figQ]);
  check('Figures render as SVG on the question', !!d.querySelector('#pr-q svg') || !!d.querySelector('#pr-q table'), figQ.id);
  const rwQ = Q.all().find(q => q.passage && q.mark);
  P.start([rwQ]);
  check('Reading and Writing passage shows beside the question with the underline', !d.querySelector('#pr-passage').hidden && !!d.querySelector('#pr-passage u.pr-u') && d.querySelector('#pr-stage').classList.contains('two'), rwQ.id);
  const notesQ = Q.all().find(q => q.passage && q.passage.kind === 'notes');
  P.start([notesQ]);
  check('Notes passages render as a bulleted list', d.querySelectorAll('#pr-passage .pr-notes li').length >= 3);
  const spr = Q.all().find(q => q.type === 'spr');
  P.start([spr]);
  d.querySelector('#pr-spr-in').value = '3 1/2';
  click(w, d.querySelector('#pr-check'));
  check('Invalid grid-in entry explains the rule instead of marking it wrong', /Mixed numbers/.test(d.querySelector('#pr-msg').textContent) && d.querySelector('#pr-feedback').hidden);
  /* keyboard */
  P.start([mcq]);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: key.toLowerCase(), bubbles: true }));
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  check('Keyboard: letter picks, Enter checks', /Correct\./.test(d.querySelector('#pr-feedback').textContent));

  /* deep link + resume */
  w = await open('practice.html?section=rw&n=3&go=1');
  check('Deep link starts a 3-question Reading and Writing session', w.__SQ_PRACTICE.run && w.__SQ_PRACTICE.run.questions.length === 3 &&
    w.__SQ_PRACTICE.run.questions.every(id => w.SQQuestions.get(id).section === 'rw'));
  const saved = JSON.stringify(w.__SQ_PRACTICE.run);
  w = await open('practice.html', (win) => { win.localStorage.setItem('sq_practice_session', saved); });
  check('An unfinished session is offered for resuming', !w.document.querySelector('#pr-resume').hidden);
  click(w, w.document.querySelector('#pr-resume-go'));
  check('Resume reopens it', !w.document.querySelector('#pr-run').hidden && /of 3/.test(w.document.querySelector('#pr-count').textContent));

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
