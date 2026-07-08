/* Verify the map progression: world map renders 8 nodes, quest loop awards XP,
   levels advance, unlocks gate correctly, progress persists via SQAuth. */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok?'PASS':'FAIL')+'  '+n+(d?'  — '+d:'')); };
const vc = new VirtualConsole(); vc.on('error',()=>{}); vc.on('jsdomError',()=>{});

(async () => {
  const dom = await JSDOM.fromURL('http://localhost:8000/', {
    resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w){
      w.matchMedia = w.matchMedia || (q=>({matches:false,addListener(){},removeListener(){}}));
      w.IntersectionObserver = class { constructor(cb){ this.cb=cb; } observe(t){ this.cb([{target:t,isIntersecting:true}], this); } unobserve(){} disconnect(){} };
    }
  });
  const { window } = dom, { document } = window;
  await new Promise(r => window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 700));

  const G = window.SQGame;
  check('SQGame present with 8 realms', !!G && G.REALMS.length === 8, G ? G.REALMS.map(r=>r.id).join(',') : 'none');

  // world map rendered
  const nodes = [...document.querySelectorAll('.map-node')];
  check('World map renders 8 realm nodes', nodes.length === 8, nodes.length + ' nodes');

  // node canvases painted
  const painted = nodes.filter(n => {
    const cv = n.querySelector('canvas');
    try { return [...cv.getContext('2d').getImageData(0,0,8,8).data].some(v=>v>0); } catch(e){ return false; }
  });
  check('All node biome canvases painted', painted.length === 8, painted.length + '/8');

  // initial unlock gating: first realm of each section open, others locked
  const s0 = G.getState();
  check('Fresh state: info + algebra unlocked, others locked',
    s0.realms.info.unlocked && s0.realms.algebra.unlocked &&
    !s0.realms.craft.unlocked && !s0.realms.advmath.unlocked,
    'craft.unlocked=' + s0.realms.craft.unlocked);
  check('Fresh world rank is Lv 8 (all realms Lv 1)', s0.totalLevel === 8, 'Lv ' + s0.totalLevel);

  // locked node is disabled + dimmed
  const craftNode = nodes.find(n => n.getAttribute('data-realm') === 'craft');
  check('Locked node is disabled with lock class', craftNode.disabled && craftNode.classList.contains('is-locked'));

  // XP mechanics: a perfect quest awards base+accuracy+bonus
  const r1 = G.completeQuest('info', 5, 5);
  check('Perfect quest awards XP (40) ', r1.earned === 40, r1.earned + ' xp');
  check('completeQuest returns state', r1.state && r1.state.xp === 40, 'xp=' + (r1.state && r1.state.xp));

  // drive info to Lv 2 to unlock craft
  G.completeQuest('info', 5, 5); G.completeQuest('info', 5, 5); // +80 => 120 total => Lv2
  const sInfo = G.realmState('info');
  check('info reaches Lv 2 at 120 XP', sInfo.level === 2, 'Lv ' + sInfo.level + ' @ ' + sInfo.xp + 'xp');
  const sCraft = G.realmState('craft');
  check('Reaching Lv 2 unlocks the next R&W realm (craft)', sCraft.unlocked === true);

  // unlock reflected in DOM after refresh
  await new Promise(r => setTimeout(r, 50));
  check('Unlocked node no longer disabled in map', !craftNode.disabled && !craftNode.classList.contains('is-locked'));

  // card overlays present + reflect progress
  const infoCard = document.querySelector('.card[data-realm="info"]');
  check('Card progress overlay injected', !!infoCard && !!infoCard.querySelector('.card-bar-fill') && !!infoCard.querySelector('.btn-quest'));
  const chip = infoCard.querySelector('.chip-lvl');
  check('Card level pip shows Lv 2', /Level 2/.test(chip.textContent), chip.textContent.trim());

  // clear info fully -> cleared state
  for (let i=0;i<20;i++) G.completeQuest('info', 5, 5); // pile on XP past 900
  const cleared = G.realmState('info');
  check('info clears at max level (Lv 5)', cleared.cleared && cleared.level === 5, 'Lv ' + cleared.level + ' cleared=' + cleared.cleared);
  await new Promise(r => setTimeout(r, 50));
  const infoNode = nodes.find(n => n.getAttribute('data-realm') === 'info');
  check('Cleared node shows banner flag class', infoNode.classList.contains('is-cleared'));

  // persistence: progress went through SQAuth (demo localStorage)
  const prog = window.SQAuth.getProgress();
  check('Progress persisted via SQAuth', prog.realms.info && prog.realms.info.xp >= 900 && prog.xp > 0,
    'info.xp=' + (prog.realms.info && prog.realms.info.xp) + ' totalXp=' + prog.xp);

  // quest drawer opens and renders a question
  const startBtn = infoCard.querySelector('.btn-quest');
  startBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  const drawer = document.querySelector('.quest-overlay');
  check('Quest drawer opens with a question + answers', drawer && !drawer.hidden &&
    !!drawer.querySelector('.quest-q') && drawer.querySelectorAll('.quest-answer').length >= 2);

  // answering a full quest reaches the result screen with XP
  function answerAll() {
    return new Promise(resolve => {
      (function step(){
        const ans = drawer.querySelectorAll('.quest-answer');
        if (ans.length) { ans[0].dispatchEvent(new window.MouseEvent('click',{bubbles:true})); setTimeout(step, 40); }
        else if (drawer.querySelector('.quest-xp')) resolve(true);
        else setTimeout(step, 40);
      })();
    });
  }
  const reached = await Promise.race([answerAll(), new Promise(r=>setTimeout(()=>r(false), 4000))]);
  check('Playing a quest reaches XP result screen', reached === true && !!drawer.querySelector('.quest-xp'),
    drawer.querySelector('.quest-xp') ? drawer.querySelector('.quest-xp').textContent : 'no xp');

  /* rendering guarantee: [hidden] must beat class display rules (the bug where
     overlays rendered on load despite hidden=true). The !important rule wins by
     CSS spec over any non-important display rule; assert it's in the stylesheet
     and the overlay starts with the hidden attribute set. */
  const cssText = await new Promise((res, rej) => {
    require('http').get('http://localhost:8000/css/style.css', r => {
      let b = ''; r.on('data', c => b += c); r.on('end', () => res(b));
    }).on('error', rej);
  });
  check('[hidden]{display:none !important} rule present in stylesheet',
    /\[hidden\]\s*\{\s*display:\s*none\s*!important/.test(cssText));
  // the drawer is open from the quest we just played — close it, then assert
  const closeBtn = document.querySelector('.quest-overlay .quest-close');
  if (closeBtn) closeBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  check('Overlay hides again after close (hidden attribute set)', document.querySelector('.quest-overlay').hasAttribute('hidden'));

  const fails = results.filter(x=>!x).length;
  console.log('\n' + (results.length-fails) + '/' + results.length + ' checks passed');
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
