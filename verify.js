/* Verification harness: loads http://localhost:8000 in jsdom (with real
   node-canvas behind HTMLCanvasElement), polyfills IntersectionObserver,
   executes the page scripts, then drives every animation trigger and asserts. */
const { JSDOM, VirtualConsole } = require('jsdom');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''));
}

const vc = new VirtualConsole();
vc.on('error', () => {});      // font CDN unreachable in sandbox — expected
vc.on('jsdomError', () => {}); // ignore resource-loading noise, we assert behaviour instead

(async () => {
  // --- IntersectionObserver polyfill that we can drive manually ---
  const observers = [];
  class FakeIO {
    constructor(cb, opts) { this.cb = cb; this.targets = new Set(); observers.push(this); }
    observe(el) { this.targets.add(el); }
    unobserve(el) { this.targets.delete(el); }
    disconnect() { this.targets.clear(); }
    fireAll(isIntersecting) {
      const entries = [...this.targets].map(t => ({ target: t, isIntersecting }));
      if (entries.length) this.cb(entries, this);
    }
  }

  const dom = await JSDOM.fromURL('http://localhost:8000/', {
    resources: 'usable',
    virtualConsole: vc,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.IntersectionObserver = FakeIO;
      window.fetch = (url, opts) => Promise.resolve({ ok: false }); // hero.mp4 probe -> 404 path
      window.matchMedia = window.matchMedia || (q => ({ matches: false, addListener() {}, removeListener() {} }));
    },
  });

  const { window } = dom;
  const { document } = window;
  await new Promise(res => {
    if (document.readyState === 'complete') res();
    else window.addEventListener('load', res);
  });
  await new Promise(r => setTimeout(r, 400)); // let rAF loops tick

  const errors = [];
  window.addEventListener('error', e => errors.push(e.message));

  /* 1 — page & script bootstrapping */
  check('Page loads with title', /ScoreQuest/.test(document.title));
  check('PixelWorld engine attached', !!window.PixelWorld && Object.keys(window.PixelWorld.scenes).length === 10,
    Object.keys(window.PixelWorld?.scenes || {}).join(','));

  /* 2 — hero canvas actually painted pixels */
  const heroCv = document.getElementById('hero-canvas');
  let heroPainted = false;
  try {
    const ctx = heroCv.getContext('2d');
    const data = ctx.getImageData(0, 0, 10, 10).data;
    heroPainted = [...data].some(v => v > 0);
  } catch (e) { heroPainted = false; }
  check('Hero canvas animation painted pixels', heroPainted, heroCv.width + 'x' + heroCv.height);

  /* 3 — hero video source chain engaged (local -> Higgsfield CDN -> canvas) */
  const heroVid = document.getElementById('hero-video');
  check('Hero video source chain attempts a source', !!heroVid.src,
    (heroVid.src || '').split('/').pop());

  /* 4 — all eight realm cards resolve to art (generated img OR painted canvas fallback) */
  await new Promise(r => setTimeout(r, 1200)); // let the img error->CDN->error chain settle
  const arts = [...document.querySelectorAll('.card-art')];
  const resolved = arts.filter(a => {
    const img = a.querySelector('img');
    if (img && img.complete && img.naturalWidth > 0) return true; // generated image loaded
    const cv = a.querySelector('canvas');
    if (!cv) return false;
    try {
      const d = cv.getContext('2d').getImageData(0, 0, 8, 8).data;
      return [...d].some(v => v > 0); // canvas fallback painted
    } catch (e) { return false; }
  });
  check('All 8 realm cards resolve to art (img or canvas fallback)', resolved.length === 8, resolved.length + '/8');
  const chained = [...document.querySelectorAll('.card-art img')].every(img =>
    !img.src || /cloudfront|assets\/realms/.test(img.src));
  check('Card img source chain uses local/CDN sources only', chained);

  /* 5 — typewriter is typing */
  const tw = document.getElementById('typewriter');
  const twA = tw.textContent;
  await new Promise(r => setTimeout(r, 500));
  const twB = tw.textContent;
  check('Typewriter effect running', twB.length > 0 && twB !== twA, JSON.stringify(twA) + ' -> ' + JSON.stringify(twB));

  /* 6 — scroll reveals: fire the observers like a scroll would */
  const revealCount = document.querySelectorAll('.reveal').length;
  observers.forEach(o => o.fireAll(true));
  await new Promise(r => setTimeout(r, 100));
  const visibleCount = document.querySelectorAll('.reveal.is-visible').length;
  check('Scroll reveals trigger (IntersectionObserver)', visibleCount === revealCount && revealCount > 10,
    visibleCount + '/' + revealCount + ' revealed');

  /* 7 — stagger delays applied to grid children */
  const staggered = [...document.querySelectorAll('.cards > .card')]
    .every((c, i) => c.style.getPropertyValue('--reveal-delay') === (i * 90) + 'ms');
  check('Cascading stagger delays set on cards', staggered);

  /* 8 — XP forecast bars fill after reveal */
  await new Promise(r => setTimeout(r, 150));
  const bars = [...document.querySelectorAll('.bar-fill')];
  const barsFilled = bars.every(b => b.style.width === b.getAttribute('data-fill') + '%');
  check('XP forecast bars fill on reveal', barsFilled, bars.map(b => b.style.width).join(', '));

  /* 9 — count-ups reach their targets */
  await new Promise(r => setTimeout(r, 1600));
  const counts = [...document.querySelectorAll('[data-count]')];
  const countsOk = counts.every(el => el.textContent === el.getAttribute('data-count'));
  check('Count-up stats reach targets (800/24/8/1 + 1460)', countsOk,
    counts.map(el => el.textContent).join(','));

  /* 10 — quest trail: mask injected, dashoffset responds to scroll */
  const trailSvgPaths = document.querySelectorAll('.trail path');
  check('Quest-trail mask layer injected', trailSvgPaths.length === 2, trailSvgPaths.length + ' paths');
  const mask = trailSvgPaths[1];
  const off0 = mask && mask.style.strokeDashoffset;
  // simulate scrolling: move the section up the viewport and fire scroll
  const trailWrap = document.querySelector('.trail-wrap');
  trailWrap.getBoundingClientRect = () => ({ top: -400, height: 900, bottom: 500, left: 0, right: 720, width: 720 });
  window.dispatchEvent(new window.Event('scroll'));
  await new Promise(r => setTimeout(r, 50));
  const off1 = mask && mask.style.strokeDashoffset;
  check('Quest trail draws with scroll (dashoffset changes)', off0 !== off1 && parseFloat(off1) < 0,
    off0 + ' -> ' + off1);

  /* 11 — sticky nav state flips on scroll */
  const nav = document.getElementById('nav');
  const beforeNav = nav.classList.contains('is-scrolled');
  Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
  window.dispatchEvent(new window.Event('scroll'));
  check('Sticky nav gains scrolled state', !beforeNav && nav.classList.contains('is-scrolled'));

  /* 12 — realm filter pills */
  const mathPill = [...document.querySelectorAll('.pill')].find(p => p.getAttribute('data-filter') === 'math');
  mathPill.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const hidden = document.querySelectorAll('.card.is-filtered').length;
  const shown = document.querySelectorAll('.card:not(.is-filtered)').length;
  check('Math filter shows the 4 Math realms, hides the 4 R&W realms', shown === 4 && hidden === 4, shown + ' shown, ' + hidden + ' hidden');

  /* 13 — no runtime errors */
  check('No uncaught runtime errors', errors.length === 0, errors.join(' | ') || 'clean');

  const fails = results.filter(r => !r.ok).length;
  console.log('\n' + (results.length - fails) + '/' + results.length + ' checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
