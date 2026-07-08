/* Verify the formal Parent Progress Report: placement, professional voice
   (no game vocabulary), real-name orientation, measured-not-projected score
   guardrail, three charts, translations incl. domain names, auto-cycling. */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok?'PASS':'FAIL')+'  '+n+(d?'  — '+d:'')); };
const vc = new VirtualConsole(); vc.on('error',()=>{}); vc.on('jsdomError',()=>{});
const OPTS = {
  resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(w){
    w.matchMedia = w.matchMedia || (q=>({matches:false,addListener(){},removeListener(){}}));
    w.IntersectionObserver = class { constructor(cb){ this.cb=cb; } observe(t){ this.cb([{target:t,isIntersecting:true}], this); } unobserve(){} disconnect(){} };
  }
};

(async () => {
  const dom = await JSDOM.fromURL('http://localhost:8000/', OPTS);
  const { window } = dom; const { document } = window;
  await new Promise(r => window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 700));

  /* 1 — placement between hero and world */
  const ids = [...document.querySelectorAll('main > section')].map(s => s.id);
  check('Parents section sits between hero and world',
    ids.indexOf('parents') === ids.indexOf('hero') + 1 && ids.indexOf('world') === ids.indexOf('parents') + 1,
    ids.slice(0,4).join(' -> '));

  /* 2 — hook statement */
  check('Hook headline present ("students never do the work")',
    /never do the work/i.test(document.querySelector('.statement-title').textContent));

  const sectionText = document.getElementById('parents').textContent;

  /* 3 — professional voice: no game vocabulary in the parent surface */
  const gameWords = sectionText.match(/\b(quests?|realms?|boss(es)?|XP|guild(master)?|hero(es)?|loot|streaks?|scroll)\b/i);
  check('No game vocabulary in parents section', !gameWords, gameWords ? 'found: ' + gameWords[0] : 'clean');

  /* 4 — first-name-only student, never a surname or game name */
  const shownName = document.getElementById('preport-name').textContent.trim();
  check('Report shows first name only (Kevin, no surname)',
    shownName === 'Kevin' && !/\s/.test(shownName), shownName);
  check('No in-game character names on the page', !/Nightscholar|Emily Chen/i.test(document.body.textContent));

  /* 4b — copy is short: statement + pillars trimmed */
  const subLen = document.querySelector('.statement-sub').textContent.trim().length;
  const pillarMax = Math.max(...[...document.querySelectorAll('.pillar p')].map(p => p.textContent.trim().length));
  check('Statement blurb is short (<140 chars)', subLen < 140, subLen + ' chars');
  check('Each pillar is short (<110 chars)', pillarMax < 110, 'longest ' + pillarMax + ' chars');

  /* 4c — left/right demo layout: pitch rail beside the report */
  const row = document.querySelector('.parents-demo-row');
  const pitch = row && row.querySelector('.preport-pitch');
  check('Left/right layout: pitch rail sits beside the report',
    !!row && !!pitch && pitch.nextElementSibling && pitch.nextElementSibling.id === 'preport');
  check('Pitch speaks peace-of-mind to parents',
    /Peace of mind/i.test(pitch.textContent) && /fingertips/i.test(pitch.textContent));

  /* 4d — personable narrative instead of alert boxes */
  const narrative = document.querySelector('.glance-text');
  check('Glance is a personable narrative ("This week, Kevin…")',
    !!narrative && /^This week, Kevin/.test(narrative.textContent.trim()));
  check('No red/green alert boxes remain',
    document.querySelectorAll('.flag-attn, .flag-good').length === 0);

  /* 4e — weak domain highlighted in red on the accuracy chart */
  const weakFills = document.querySelectorAll('.dbar-fill.is-weak');
  const weakRow = document.querySelector('.dbar-weak');
  check('Exactly one weak domain rendered in red (Geometry & Trig, 54%)',
    weakFills.length === 1 && !!weakRow && /Geometry/.test(weakRow.textContent) && /54%/.test(weakRow.textContent),
    weakRow ? weakRow.textContent.trim().slice(0,50) : 'none');

  /* 4f — trend line survives a state-change re-render (the formatting bug) */
  window.SQGame.completeQuest('info', 5, 5); // triggers renderReport()
  await new Promise(r => setTimeout(r, 80));
  const line = document.querySelector('.trend-line');
  check('Trend line stays drawn after report re-renders',
    !!line && (line.classList.contains('trend-drawn') || line.style.strokeDashoffset === '0'));

  /* 5 — guardrail: measured scores allowed, projections/guarantees forbidden */
  const projection = sectionText.match(/guarantee|projected|predict|forecast|will\s+(score|gain|improve)|\+\s?\d+\s*(points?|pts)/i);
  check('No projected-score or guarantee language', !projection, projection ? 'found: ' + projection[0] : 'measured data only');
  check('Measured practice-exam scores shown (1050 -> 1230)',
    /1050/.test(sectionText) && /1230/.test(sectionText));

  /* 6 — stats populated with formal labels */
  check('Formal stat tiles populated',
    /\d+h \d+m|\d+m/.test(document.getElementById('pstat-time').textContent) &&
    document.getElementById('pstat-sets').textContent === '18' &&
    document.getElementById('pstat-days').textContent === '12' &&
    document.getElementById('pstat-exams').textContent === '4');

  /* 7 — three charts render */
  const svg = document.querySelector('#trend-chart svg');
  check('Exam score trend chart renders (SVG line + 4 points)',
    !!svg && !!svg.querySelector('polyline') && svg.querySelectorAll('.trend-dot').length === 4);
  const bars = [...document.querySelectorAll('.abar')];
  check('Weekly practice chart renders 7 bars with heights',
    bars.length === 7 && bars.every(b => parseInt(b.style.height) > 0 || b.classList.contains('abar-zero')));
  check('Accuracy chart renders all 8 content domains',
    document.querySelectorAll('.dbar').length === 8);

  /* 8 — official domain names, not biome names, in the report */
  check('Report uses official SAT domain names, not biome names',
    /Information & Ideas/.test(sectionText) && !/Gloamwood|Copperpeak|Inkmarsh/.test(sectionText));

  /* 9 — 中文 pill translates labels AND domain names */
  document.querySelector('.lang-pill[data-lang="zh"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 350));
  check('中文 pill translates report labels', document.querySelector('[data-i18n="time"]').textContent === '练习时长',
    document.querySelector('[data-i18n="time"]').textContent);
  check('中文 pill translates domain names', /代数/.test(document.getElementById('domain-bars').textContent));
  check('中文 narrative keeps the name and names the weak domain',
    /Kevin/.test(document.querySelector('.glance-text').textContent) &&
    /几何与三角/.test(document.querySelector('.glance-text').textContent));

  /* 10 — Spanish */
  document.querySelector('.lang-pill[data-lang="es"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 350));
  check('ES pill translates labels', document.querySelector('[data-i18n="sets"]').textContent === 'Series de preguntas completadas');

  /* 11 — manual choice stops auto-cycle */
  await new Promise(r => setTimeout(r, 3600));
  check('Manual language choice stops the auto-cycle',
    document.querySelector('[data-i18n="sets"]').textContent === 'Series de preguntas completadas');

  /* 12 — untouched page auto-cycles the pillar word */
  const dom2 = await JSDOM.fromURL('http://localhost:8000/', OPTS);
  await new Promise(r => dom2.window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 600));
  const before = dom2.window.document.getElementById('lang-cycle-word').textContent;
  await new Promise(r => setTimeout(r, 3800));
  const after = dom2.window.document.getElementById('lang-cycle-word').textContent;
  check('Language auto-cycle animates the pillar word', before === 'English' && after !== before, before + ' -> ' + after);

  /* rendering guarantee (regression from the overlay bug) */
  const cssText = await new Promise((res, rej) => {
    require('http').get('http://localhost:8000/css/style.css', r => {
      let b = ''; r.on('data', c => b += c); r.on('end', () => res(b));
    }).on('error', rej);
  });
  check('[hidden]{display:none !important} rule still present',
    /\[hidden\]\s*\{\s*display:\s*none\s*!important/.test(cssText));

  const fails = results.filter(x=>!x).length;
  console.log('\n' + (results.length-fails) + '/' + results.length + ' checks passed');
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
