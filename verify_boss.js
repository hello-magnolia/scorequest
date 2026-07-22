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
  check('Nine tails, nine hit points: the fan is full and the bars scale to max HP',
    /Nine-Tailed Archivist/.test(d.getElementById('bf-boss-name').textContent) &&
    d.querySelectorAll('.bf-tail').length === 9 &&
    d.querySelector('#bf-boss-hp .bf-hp-track').style.width === '342px' &&
    d.querySelector('#bf-pomelo-hp .bf-hp-track').style.width === '114px' &&
    d.querySelector('#bf-boss-hp .bf-hp-fill').style.width === '100%' &&
    /boss\/lorewood\/neutral/.test(d.getElementById('bf-boss-img').src));
  check('The arena is dressed: eight lantern glows flicker, twelve leaves drift',
    d.querySelectorAll('#bf-fx .bf-glow').length === 8 &&
    d.querySelectorAll('#bf-fx .bf-leaf').length === 12);
  check('A question is on the table with four choices',
    d.getElementById('bf-question').textContent.length > 20 &&
    d.querySelectorAll('.bf-choice').length === 4);

  /* right answer: Pomelo strikes */
  clickChoice(w, S.correctIndex);
  check('Right answer: the orange flies and a tail vanishes on contact',
    await until(() => S.bossHp === 8, 2000) &&
    Math.abs(parseFloat(d.querySelector('#bf-boss-hp .bf-hp-fill').style.width) - 88.89) < 0.5 &&
    await until(() => d.querySelectorAll('.bf-tail:not(.is-gone)').length === 8, 2200) &&
    /loses a tail/.test(d.getElementById('bf-feedback').textContent));
  check('Choices lock after answering', d.querySelector('.bf-choice').disabled === true);

  /* wrong answer: the guardian strikes, and teaches */
  await until(() => !d.querySelector('.bf-choice').disabled, 2000);
  clickChoice(w, (S.correctIndex + 1) % 4);
  check('Wrong answer: the fireball flies before any damage lands',
    await until(() => ['form', 'fly', 'hit'].includes(S.fireball), 800) &&
    d.getElementById('bf-fireball').hidden === false &&
    /The answer was [A-D]:/.test(d.getElementById('bf-feedback').textContent));
  check('Damage lands only on contact',
    await until(() => S.pomeloHp === 2, 2500) &&
    await until(() => S.fireball === null, 1500) &&
    d.getElementById('bf-yell').hidden === true);  /* no yell config: silence */

  /* the win path */
  let hops = 0;
  while (S.bossHp > 0 && hops < 15) {
    await until(() => !d.querySelector('.bf-choice').disabled || S.over, 3000);
    if (S.over) break;
    clickChoice(w, S.correctIndex);
    await until(() => d.querySelector('.bf-choice').disabled, 500);
    hops++;
  }
  check('Boss at zero: nine tails down, the Archivist faints, the clear persists',
    await until(() => d.getElementById('bf-victory').hidden === false, 3500) &&
    /boss\/lorewood\/faint/.test(d.getElementById('bf-boss-img').src) &&
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
    S2.bossHp === 9 && S2.pomeloHp === 3 && !S2.over &&
    d.querySelectorAll('.bf-choice').length === 4);

  /* the realm's sealed door leads here */
  w = await load('realm.html?realm=lorewood');
  d = w.document;
  check('Lorewood\u2019s sealed-door popup offers the fight',
    !!d.querySelector('#rw-fight[href="boss.html?realm=lorewood"]') &&
    /Face the guardian/.test(d.getElementById('rw-fight').textContent));

  /* the second guardian: the Boilerback Weaver of Story Forge */
  w = await load('boss.html?realm=storyforge');
  d = w.document;
  check('Story Forge: the Boilerback Weaver waits, breathing, no tails, seven HP',
    /Boilerback Weaver/.test(d.getElementById('bf-boss-name').textContent) &&
    /boss\/storyforge\/idle/.test(d.getElementById('bf-boss-img').src) &&
    d.querySelectorAll('.bf-tail').length === 0 &&
    d.querySelector('#bf-boss-hp .bf-hp-track').style.width === '266px' &&
    d.querySelectorAll('.bf-choice').length === 4);
  const S3 = w.__SQ_BOSS;
  d.querySelectorAll('.bf-choice')[(S3.correctIndex + 1) % 4].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  check('The Weaver\u2019s web flies before Pomelo\u2019s damage lands',
    await until(() => ['form', 'fly', 'hit'].includes(S3.fireball), 1800) &&
    await until(() => S3.pomeloHp === 2, 3200));

  /* the third guardian: Aristotle the Axolotl of Ink Reef */
  w = await load('boss.html?realm=inkreef');
  d = w.document;
  check('Ink Reef: Aristotle the Axolotl breathes over his scroll, eight HP, no tails',
    /Aristotle the Axolotl/.test(d.getElementById('bf-boss-name').textContent) &&
    /boss\/inkreef\/idle/.test(d.getElementById('bf-boss-img').src) &&
    d.querySelectorAll('.bf-tail').length === 0 &&
    d.querySelector('#bf-boss-hp .bf-hp-track').style.width === '304px' &&
    d.querySelectorAll('.bf-choice').length === 4);
  const S4 = w.__SQ_BOSS;
  d.querySelectorAll('.bf-choice')[(S4.correctIndex + 1) % 4].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  /* the yelled verdict: it must burst from the mouth ON the third attack
     frame, wearing one of the fifteen phrases, then fade away */
  const yellEl = d.getElementById('bf-yell');
  const VERDICTS = /^(Illogical|Fallacious|Unsound|Contradiction|Absurd|Erroneous|Unproven|Invalid|Misreasoned|Impossible|Incoherent|Falsehood|Sophistry|Nonsense|Unwise)!$/;
  let srcAtYell = '';
  await until(() => {
    if (!yellEl.hidden && !srcAtYell) srcAtYell = d.getElementById('bf-boss-img').src;
    return !!srcAtYell;
  }, 1600);
  check('A verdict bursts from the Sophist\u2019s open mouth on attack frame three',
    /inkreef\/attack3/.test(srcAtYell) &&
    VERDICTS.test(yellEl.textContent) &&
    yellEl.classList.contains('is-yelling') &&
    yellEl.style.right !== '' && yellEl.style.top !== '');
  check('The verdict fades once the frame has passed',
    await until(() => yellEl.hidden, 1400));
  check('The Sophist reads aloud, then the scroll flies and lands',
    await until(() => ['form', 'fly', 'hit'].includes(S4.fireball), 2700) &&
    await until(() => S4.pomeloHp === 2, 4400));

  /* the fourth guardian: the Parapet Pedant of Syntax Citadel */
  w = await load('boss.html?realm=syntaxcitadel');
  d = w.document;
  check('Syntax Citadel: the Parapet Pedant stands in stone, nine HP, no tails',
    /Parapet Pedant/.test(d.getElementById('bf-boss-name').textContent) &&
    /boss\/syntaxcitadel\/idle/.test(d.getElementById('bf-boss-img').src) &&
    d.querySelectorAll('.bf-tail').length === 0 &&
    d.querySelector('#bf-boss-hp .bf-hp-track').style.width === '342px' &&
    d.querySelectorAll('.bf-choice').length === 4);
  const S5 = w.__SQ_BOSS;
  d.querySelectorAll('.bf-choice')[(S5.correctIndex + 1) % 4].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const beam = d.getElementById('bf-beam');
  check('The maw gathers light and the beam crosses before any damage lands',
    await until(() => !beam.hidden && ['form', 'fly', 'hit'].includes(S5.fireball), 1800) &&
    S5.pomeloHp === 3 &&
    await until(() => S5.pomeloHp === 2, 3000) &&
    await until(() => S5.fireball === null && beam.hidden, 2200));

  /* the fifth fight: the Twin Signs flank Pomelo from both tunnels */
  w = await load('boss.html?realm=mirrormines');
  d = w.document;
  const S6 = w.__SQ_BOSS;
  check('Mirror Mines: the Twin Signs stand on BOTH sides, ten HP',
    /Twin Signs/.test(d.getElementById('bf-boss-name').textContent) &&
    d.querySelector('.bf-arena').classList.contains('is-twin') &&
    /minus_idle/.test(d.getElementById('bf-boss-img-left').src) &&
    /plus_idle/.test(d.getElementById('bf-boss-img').src) &&
    d.querySelector('#bf-boss-hp .bf-hp-track').style.width === '380px');
  d.querySelectorAll('.bf-choice')[(S6.correctIndex + 1) % 4].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const lungedFirst = await (async () => {
    await until(() => d.getElementById('bf-boss-side').classList.contains('is-lunging') ||
      d.getElementById('bf-boss-side-left').classList.contains('is-lunging'), 1500);
    return d.getElementById('bf-boss-side-left').classList.contains('is-lunging') ? 'left' : 'right';
  })();
  check('A wrong answer brings a lunge, and the fangs land with no projectile',
    d.getElementById('bf-fireball').hidden && d.getElementById('bf-beam').hidden &&
    await until(() => S6.pomeloHp === 2, 2500));
  await until(() => !d.querySelector('.bf-choice').disabled, 4000);
  d.querySelectorAll('.bf-choice')[(w.__SQ_BOSS.correctIndex + 1) % 4].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  check('The next strike comes from the other tunnel',
    await until(() => {
      const other = lungedFirst === 'left' ? 'bf-boss-side' : 'bf-boss-side-left';
      return d.getElementById(other).classList.contains('is-lunging');
    }, 2200));
  await until(() => !d.querySelector('.bf-choice').disabled, 4000);
  let drain = 0;
  while (!S6.over && drain++ < 12) {
    const sk = d.querySelector('.sq-skip-test');
    if (sk && !sk.disabled) sk.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 620));
  }
  check('Victory drops both serpents on their faint frames, plus and minus alike',
    S6.over &&
    await until(() => /plus_faint/.test(d.getElementById('bf-boss-img').src) &&
                      /minus_faint/.test(d.getElementById('bf-boss-img-left').src), 3000) &&
    await until(() => d.getElementById('bf-victory').hidden === false, 3500));

  /* the sixth guardian: the Doubling Hare of Infinity Isles */
  w = await load('boss.html?realm=infinityisles');
  d = w.document;
  const S7 = w.__SQ_BOSS;
  check('Infinity Isles: the Doubling Hare waits alone, twelve HP, already facing him',
    /Doubling Hare/.test(d.getElementById('bf-boss-name').textContent) &&
    /boss\/infinityisles\/idle/.test(d.getElementById('bf-boss-img').src) &&
    d.getElementById('bf-boss-rig').classList.contains('bf-no-flip') &&
    !d.querySelector('.bf-arena').classList.contains('is-twin') &&
    d.querySelector('#bf-boss-hp .bf-hp-track').style.width === '456px');
  d.querySelectorAll('.bf-choice')[(S7.correctIndex + 1) % 4].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const beam7 = d.getElementById('bf-beam');
  check('A wrong answer gathers the floodlight: the beam erupts with no projectile',
    d.getElementById('bf-fireball').hidden &&
    await until(() => !beam7.hidden && ['form', 'fly', 'hit'].includes(S7.fireball), 2500) &&
    await until(() => S7.pomeloHp === 2, 3500) &&
    await until(() => S7.fireball === null && beam7.hidden, 2500));
  await until(() => !d.querySelector('.bf-choice').disabled, 4000);
  let drain6 = 0;
  while (!S7.over && drain6++ < 20) {
    const sk6 = d.querySelector('.sq-skip-test');
    if (sk6 && !sk6.disabled) sk6.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 620));
  }
  check('The Hare goes down on its faint frames and the way opens to Data Docks',
    S7.over &&
    await until(() => /faint3/.test(d.getElementById('bf-boss-img').src), 2500) &&
    /datadocks/.test(d.getElementById('bf-onward').href) &&
    await until(() => d.getElementById('bf-victory').hidden === false, 3500));

  /* the eighth guardian: the Tangent Talon itself, the bird at the nest */
  w = await load('boss.html?realm=prismpeaks');
  d = w.document;
  const S8 = w.__SQ_BOSS;
  const bossImg8 = () => d.getElementById('bf-boss-img').src;
  check('Prism Peaks: the Tangent Talon guards the summit, fifteen HP, real art at last',
    /Tangent Talon/.test(d.getElementById('bf-boss-name').textContent) &&
    /boss\/prismpeaks\/idle/.test(bossImg8()) &&
    d.getElementById('bf-boss-rig').classList.contains('bf-no-flip') &&
    d.querySelector('#bf-boss-hp .bf-hp-track').style.width === '570px');
  const rig8 = d.getElementById('bf-boss-rig');
  d.querySelectorAll('.bf-choice')[(S8.correctIndex + 1) % 4].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  check('A wrong answer opens the flight: takeoff frames and a rising rig, no projectile art',
    d.getElementById('bf-fireball').hidden && d.getElementById('bf-beam').hidden &&
    await until(() => /takeoff/.test(bossImg8()), 1200) &&
    await until(() => /translateY\(-110px\)/.test(rig8.style.transform), 1200));
  check('At altitude the wings beat on the flap frames while the rig holds its height',
    await until(() => /flap/.test(bossImg8()), 1600) &&
    /translateY\(-110px\)/.test(rig8.style.transform));
  check('The gust lands mid-beat and Pomelo pays one heart',
    await until(() => S8.fireball === 'hit', 2200) &&
    await until(() => S8.pomeloHp === 2, 1500));
  check('The landing reverses the takeoff and sets the rig back down onto idle',
    await until(() => /takeoff/.test(bossImg8()), 3200) &&
    await until(() => /translateY\(0px\)/.test(rig8.style.transform), 2600) &&
    await until(() => /idle/.test(bossImg8()), 2200));
  /* the fall: fifteen skips drain the summit guardian, and the fall must
     open on the hurt recoil and fold straight to the last star, never idling */
  let drain8 = 0, firstFall8 = null, brokeFall8 = false;
  const fallWatch8 = setInterval(() => {
    if (!S8.over) return;
    const s8 = bossImg8();
    if (!firstFall8 && /hurt|faint/.test(s8)) firstFall8 = s8;   // the fall's opening frame
    if (firstFall8 && /idle|takeoff|flap/.test(s8)) brokeFall8 = true;  // any return to life mid-fall
  }, 60);
  while (!S8.over && drain8++ < 70) {
    const sk8 = d.querySelector('.sq-skip-test');
    if (sk8 && !sk8.disabled) sk8.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
  }
  const star8 = await until(() => /faint5/.test(bossImg8()), 4500);
  clearInterval(fallWatch8);
  check('The fall opens on the hurt recoil and folds straight to the last star',
    S8.over && /hurt/.test(firstFall8 || '') && star8 && !brokeFall8,
    'first=' + (firstFall8 || 'none').split('/').pop() + ' star=' + star8 + ' broke=' + brokeFall8);
  check('The summit is the last stand: victory names no next realm',
    await until(() => d.getElementById('bf-victory').hidden === false, 3500) &&
    d.getElementById('bf-onward').hidden === true);

  const passed = results.filter(Boolean).length;
  console.log('\n' + passed + '/' + results.length + ' checks passed');
  process.exit(passed === results.length ? 0 : 1);
})();
