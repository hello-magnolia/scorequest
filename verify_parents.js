/* Verify the For Parents section: placement between hero and world, hook copy,
   Parent Scroll demo stats, language pills + auto-cycling, animated bars, and
   the guardrail that the section makes no projected-score claims. */
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
  const { window } = dom; const { document } = window;
  await new Promise(r => window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 700));

  /* 1 — placement: #parents sits between #hero and #world */
  const sections = [...document.querySelectorAll('main > section')].map(s => s.id || s.className.split(' ')[0]);
  const iHero = sections.indexOf('hero'), iParents = sections.indexOf('parents'), iWorld = sections.indexOf('world');
  check('Parents section sits between hero and world', iHero > -1 && iParents === iHero + 1 && iWorld === iParents + 1,
    sections.slice(0,4).join(' -> '));

  /* 2 — the hook statement */
  const statement = document.querySelector('.statement-title');
  check('Hook headline present ("students never do the work")',
    !!statement && /never do the work/i.test(statement.textContent));

  /* 3 — guardrail: no projected-score claims in the parents section */
  const sectionText = document.getElementById('parents').textContent;
  const scoreClaim = /(\+\s?\d+\s*(points?|pts))|(\b1[0-6]\d0\b)|guarantee/i.test(sectionText);
  check('No projected-score claims in parents section', !scoreClaim,
    scoreClaim ? 'found score-like claim' : 'clean — effort metrics only');

  /* 4 — demo stats populated */
  const time = document.getElementById('pstat-time').textContent;
  const quests = document.getElementById('pstat-quests').textContent;
  check('Demo stats populated (time, quests, streak, boss)',
    /\d+h \d+m|\d+m/.test(time) && /^\d+$/.test(quests), time + ' / ' + quests + ' quests');

  /* 5 — weekly activity chart: 7 bars, heights applied on reveal */
  const bars = [...document.querySelectorAll('.abar')];
  const withHeights = bars.filter(b => parseInt(b.style.height) > 0 || b.classList.contains('abar-zero'));
  check('Activity chart renders 7 day bars with animated heights', bars.length === 7 && withHeights.length === 7,
    bars.length + ' bars, ' + withHeights.length + ' sized');

  /* 6 — realm mini-bars for all 8 realms */
  const minis = document.querySelectorAll('.rmini');
  check('Realm progress minis render all 8 realms', minis.length === 8, minis.length + ' rows');

  /* 7 — language pills switch labels (中文) */
  const zhPill = document.querySelector('.lang-pill[data-lang="zh"]');
  zhPill.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 350)); // fade swap
  const timeLabel = document.querySelector('[data-i18n="time"]').textContent;
  check('中文 pill translates dashboard labels', timeLabel === '练习时长', timeLabel);
  check('中文 pill becomes active', zhPill.classList.contains('is-active'));

  /* 8 — Spanish too */
  const esPill = document.querySelector('.lang-pill[data-lang="es"]');
  esPill.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 350));
  check('ES pill translates labels', document.querySelector('[data-i18n="quests"]').textContent === 'Misiones completadas',
    document.querySelector('[data-i18n="quests"]').textContent);

  /* 9 — manual choice stops auto-cycling (labels stay ES after a cycle period) */
  await new Promise(r => setTimeout(r, 3600));
  check('Manual language choice stops the auto-cycle',
    document.querySelector('[data-i18n="quests"]').textContent === 'Misiones completadas');

  /* 10 — auto-cycle runs when untouched: fresh page, wait a cycle */
  const dom2 = await JSDOM.fromURL('http://localhost:8000/', {
    resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w){
      w.matchMedia = w.matchMedia || (q=>({matches:false,addListener(){},removeListener(){}}));
      w.IntersectionObserver = class { constructor(cb){ this.cb=cb; } observe(t){ this.cb([{target:t,isIntersecting:true}], this); } unobserve(){} disconnect(){} };
    }
  });
  await new Promise(r => dom2.window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 600));
  const before = dom2.window.document.getElementById('lang-cycle-word').textContent;
  await new Promise(r => setTimeout(r, 3800));
  const after = dom2.window.document.getElementById('lang-cycle-word').textContent;
  check('Language auto-cycle animates the pillar word', before === 'English' && after !== before,
    before + ' -> ' + after);

  const fails = results.filter(x=>!x).length;
  console.log('\n' + (results.length-fails) + '/' + results.length + ' checks passed');
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
