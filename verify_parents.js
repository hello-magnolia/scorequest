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

  // pin the demo to EN so assertions are deterministic regardless of load
  // latency (a manual pill choice stops the auto-cycle by design)
  document.querySelector('.lang-pill[data-lang="en"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 320));

  /* 1 — placement between hero and world */
  const ids = [...document.querySelectorAll('main > section')].map(s => s.id);
  check('Parents section sits between hero and world',
    ids.indexOf('parents') === ids.indexOf('hero') + 1 && ids.indexOf('world') === ids.indexOf('parents') + 1,
    ids.slice(0,4).join(' -> '));

  /* 2 — hook statement */
  check('Hook headline names the boredom problem',
    /#1 reason SAT prep fails/i.test(document.querySelector('.statement-title').textContent) &&
    /boring/i.test(document.querySelector('.statement-title').textContent));

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
    /Information & Ideas/.test(sectionText) && !/Lorewood|Mirror Mines|Ink Reef/.test(sectionText));

  /* 8a — the two-page deck: peeking back page flips to the front on hover */
  const pages = [...document.querySelectorAll('.ppage')];
  check('Report is a two-page deck (summary + performance)', pages.length === 2 &&
    pages[0].classList.contains('is-front') && pages[1].classList.contains('is-back'));
  check('Pages split sensibly: stats on page 1, trend chart on page 2',
    !!pages[0].querySelector('#pstat-time') && !!pages[1].querySelector('#trend-chart'));
  pages[1].dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  check('Hovering the peeking page flips it to the front',
    pages[1].classList.contains('is-front') && pages[0].classList.contains('is-back'));
  const dots = [...document.querySelectorAll('.pdeck-dot')];
  check('Deck dots present and tracking the front page', dots.length === 2 && dots[1].classList.contains('is-active'));
  // one flip per hover gesture: the page that just slid behind must not
  // bounce straight back when the cursor lands on it
  pages[0].dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  check('Hover flips only once per gesture (no bounce-back)', pages[1].classList.contains('is-front'));
  document.getElementById('preport').dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
  pages[0].dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  check('Leaving and re-hovering flips again', pages[0].classList.contains('is-front'));
  const dotsAfter = dots;
  dotsAfter[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  check('Dot click flips back to page 1', pages[0].classList.contains('is-front'));

  // first trend label sits below-right of its dot, clear of the y-axis column
  const firstVal = document.querySelector('#trend-chart .trend-val');
  const firstDot = document.querySelector('#trend-chart .trend-dot');
  check('First score label placed below-right of its dot (clear of the axis)',
    parseFloat(firstVal.getAttribute('x')) > parseFloat(firstDot.getAttribute('cx')) &&
    parseFloat(firstVal.getAttribute('y')) > parseFloat(firstDot.getAttribute('cy')),
    'label(' + firstVal.getAttribute('x') + ',' + firstVal.getAttribute('y') + ') dot(' + firstDot.getAttribute('cx') + ',' + firstDot.getAttribute('cy') + ')');

  /* 8b — layout stability: language swaps must not touch the graphs */
  check('Height stabilizer ran', window.__SQ_STABILIZED === true);
  const svgBefore = document.querySelector('#trend-chart svg');
  const barsBefore = [...document.querySelectorAll('.abar')];
  const fillsBefore = [...document.querySelectorAll('.dbar-fill')].map(f => f.getAttribute('data-w')).join(',');

  /* 9 — 中文 pill translates labels AND domain names */
  document.querySelector('.lang-pill[data-lang="zh"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 350));
  check('中文 pill translates report labels', document.querySelector('[data-i18n="time"]').textContent === '练习时长',
    document.querySelector('[data-i18n="time"]').textContent);
  check('中文 pill translates domain names', /代数/.test(document.getElementById('domain-bars').textContent));
  check('中文 narrative keeps the name and names the weak domain',
    /Kevin/.test(document.querySelector('.glance-text').textContent) &&
    /几何与三角/.test(document.querySelector('.glance-text').textContent));
  check('Charts untouched by language switch (same DOM nodes, same values)',
    document.querySelector('#trend-chart svg') === svgBefore &&
    [...document.querySelectorAll('.abar')].every((b, i) => b === barsBefore[i]) &&
    [...document.querySelectorAll('.dbar-fill')].map(f => f.getAttribute('data-w')).join(',') === fillsBefore);

  /* 10 — Spanish */
  document.querySelector('.lang-pill[data-lang="es"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 350));
  check('ES pill translates labels', document.querySelector('[data-i18n="sets"]').textContent === 'Series de preguntas completadas');

  /* 11 — manual choice stops auto-cycle */
  await new Promise(r => setTimeout(r, 3600));
  check('Manual language choice stops the auto-cycle',
    document.querySelector('[data-i18n="sets"]').textContent === 'Series de preguntas completadas');

  /* 12 — untouched page auto-cycles the parent scroll (the pillar word retired
     with the three-line statement; the demo labels carry the cycle now) */
  const dom2 = await JSDOM.fromURL('http://localhost:8000/', OPTS);
  await new Promise(r => dom2.window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 600));
  const setsEl = () => dom2.window.document.querySelector('[data-i18n="sets"]');
  const before = setsEl().textContent;
  await new Promise(r => setTimeout(r, 3800));
  const after = setsEl().textContent;
  check('Language auto-cycle animates the parent scroll',
    before === 'Question sets completed' && after === '完成练习组数', before + ' -> ' + after);

  /* 12b — 中文 dwells much longer than other languages */
  await new Promise(r => setTimeout(r, 3200)); // well past a normal 2.6s dwell
  const still = setsEl().textContent;
  check('中文 dwell is much longer (still 中文 after a normal cycle length)', after === '完成练习组数' && still === '完成练习组数',
    after + ' held -> ' + still);

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
