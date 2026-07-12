/* Verify the boss fight: the guardian loads with hearts on both sides,
   right answers strike the boss, wrong answers strike Pomelo (with the
   correct answer revealed), victory opens the way and persists, defeat
   offers a gentle retry, and Lorewood's sealed door leads here. */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); };
const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise(r => setTimeout(r, 40)); } return fn(); };
const vc = new VirtualConsole(); vc.on('error', () => {}); vc.on('jsdomError', () => {});
const OPTS = {
  resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = w.matchMedia || (q => ({ matches: false, addListener() {}, removeListener() {} })); }
};
const load = async (path) => {
  const dom = await JSDOM.fromURL('http://localhost:8000/' + path, OPTS);
  await new Promise(r => dom.window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 350));
  return dom.window;
};
const clickChoice = (w, i) => w.document.querySelectorAll('.bf-choice')[i]
  .dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

(async () => {
  let w = await load('boss.html?realm=lorewood');
  let d = w.document;
  const S = w.__SQ_BOSS;
  check('The Archivist’s bar runs twice Pomelo’s length, both brimming, no cell lines',
    /Nine-Tailed Archivist/.test(d.getElementById('bf-boss-name').textContent) &&
    d.querySelector('#bf-boss-hp .bf-hp-track').style.width === '276px' &&
    d.querySelector('#bf-pomelo-hp .bf-hp-track').style.width === '138px' &&
    d.querySelector('#bf-boss-hp .bf-hp-fill').style.width === '100%' &&
    d.querySelectorAll('.bf-cell').length === 0 &&
    /assets\/boss\/lorewood/.test(d.getElementById('bf-boss-img').src));
  check('A question is on the table with four choices',
    d.getElementById('bf-question').textContent.length > 20 &&
    d.querySelectorAll('.bf-choice').length === 4);

  /* right answer: Pomelo strikes */
  clickChoice(w, S.correctIndex);
  check('Right answer: the boss loses a heart and the fill drains smoothly',
    await until(() => S.bossHp === 5, 800) &&
    Math.abs(parseFloat(d.querySelector('#bf-boss-hp .bf-hp-fill').style.width) - 83.33) < 0.5 &&
    /Pomelo strikes/.test(d.getElementById('bf-feedback').textContent));
  check('Choices lock after answering', d.querySelector('.bf-choice').disabled === true);

  /* wrong answer: the guardian strikes, and teaches */
  await until(() => !d.querySelector('.bf-choice').disabled, 2000);
  clickChoice(w, (S.correctIndex + 1) % 4);
  check('Wrong answer: Pomelo loses a heart and the correct answer is shown',
    await until(() => S.pomeloHp === 2, 800) &&
    /The answer was [A-D]:/.test(d.getElementById('bf-feedback').textContent));

  /* the win path */
  let hops = 0;
  while (S.bossHp > 0 && hops < 12) {
    await until(() => !d.querySelector('.bf-choice').disabled || S.over, 3000);
    if (S.over) break;
    clickChoice(w, S.correctIndex);
    await until(() => d.querySelector('.bf-choice').disabled, 500);
    hops++;
  }
  check('Boss at zero: the shrine opens and the clear persists',
    await until(() => d.getElementById('bf-victory').hidden === false, 2000) &&
    w.localStorage.getItem('sq_boss_lorewood') === 'cleared' &&
    /Onward to Story Forge/.test(d.getElementById('bf-onward').textContent));

  /* the lose path + gentle retry */
  w = await load('boss.html?realm=lorewood');
  d = w.document;
  const S2 = w.__SQ_BOSS;
  for (let k = 0; k < 3; k++) {
    await until(() => !d.querySelector('.bf-choice').disabled && !S2.over, 3500);
    clickChoice(w, (S2.correctIndex + 1) % 4);
    await until(() => d.querySelector('.bf-choice').disabled || S2.over, 500);
  }
  check('Pomelo at zero: a snack break, not a punishment',
    await until(() => d.getElementById('bf-defeat').hidden === false, 3000) &&
    /snack break/.test(d.getElementById('bf-defeat').textContent));
  d.getElementById('bf-retry').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  check('Retry resets both sides and asks again',
    S2.bossHp === 6 && S2.pomeloHp === 3 && !S2.over &&
    d.querySelectorAll('.bf-choice').length === 4);

  /* the realm's sealed door leads here */
  w = await load('realm.html?realm=lorewood');
  d = w.document;
  check('Lorewood\u2019s sealed-door popup offers the fight',
    !!d.querySelector('#rw-fight[href="boss.html?realm=lorewood"]') &&
    /Face the guardian/.test(d.getElementById('rw-fight').textContent));

  const passed = results.filter(Boolean).length;
  console.log('\n' + passed + '/' + results.length + ' checks passed');
  process.exit(passed === results.length ? 0 : 1);
})();
