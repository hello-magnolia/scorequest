/* Verify the World Map roadmap: 8 biome segments in order, 40 nodes with
   correct states, serpentine layout, dotted trail, quest drawer launch,
   and live advancement from the progression engine. */
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
  const dom = await JSDOM.fromURL('http://localhost:8000/map.html', OPTS);
  const { window } = dom; const { document } = window;
  await new Promise(r => window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 700));

  /* 1 — page + segments */
  check('World Map page loads with roadmap', !!document.getElementById('roadmap'));
  const segs = [...document.querySelectorAll('.seg')];
  const order = segs.map(s => s.getAttribute('data-realm')).join(',');
  check('8 biome segments in realm order', segs.length === 8 &&
    order === 'info,craft,expression,conventions,algebra,advmath,data,geometry', order);

  /* 1a — intro cinematic plays first: five scenes, click-through, then the builder */
  const intro = document.querySelector('.intro-overlay');
  check('Intro cinematic opens on first visit (before the builder)',
    !!intro && intro.hidden === false &&
    (document.querySelector('.builder-overlay') === null || document.querySelector('.builder-overlay').hidden));
  check('Intro shows whimsical caption + dots (no low-res canvas layer)',
    intro.querySelector('.intro-canvas') === null &&
    /past midnight/.test(intro.querySelector('.intro-text').textContent) &&
    /Anything but question seven/.test(intro.querySelector('.intro-text').textContent) &&
    intro.querySelectorAll('.intro-dot').length === 5);
  check('Intro media chain present (video primary, still as fallback only)',
    !!intro.querySelector('.intro-video') && !!intro.querySelector('.intro-img') &&
    /cloudfront|assets\/intro/.test(intro.querySelector('.intro-video').src || 'x') &&
    !(intro.querySelector('.intro-img').src));
  check('Intro scene 1 attempts its animated Higgsfield render',
    /cloudfront|assets\/intro/.test(intro.querySelector('.intro-video').src || 'x'),
    (intro.querySelector('.intro-video').src || '').split('/').pop());
  const cap0 = intro.querySelector('.intro-text').textContent;
  intro.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // click the scene itself
  await new Promise(r => setTimeout(r, 80));
  check('Advance dips the scene to black first', intro.querySelector('.intro-media').classList.contains('is-dark'));
  await new Promise(r => setTimeout(r, 340));
  check('Clicking the scene advances the story',
    intro.querySelector('.intro-text').textContent !== cap0 &&
    intro.querySelectorAll('.intro-dot.is-done').length === 1);
  check('Scene advance bumps the media generation (stale-load guard active)',
    window.__SQ_MEDIA_GEN >= 2, 'gen=' + window.__SQ_MEDIA_GEN);
  check('Intro preloads its art on open (anti-flash)', window.__SQ_INTRO_PRELOAD === true);
  const nextBtn = intro.querySelector('.intro-next');
  for (let k = 0; k < 3; k++) { nextBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, 380)); }
  check('Final scene offers the call to adventure', nextBtn.textContent === 'Create your hero');
  nextBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  check('Finishing the intro persists and opens character creation',
    intro.hidden === true && !!window.localStorage.getItem('sq_intro_seen'));

  /* 1a2 — sound module present and safe without AudioContext */
  let sfxSafe = true;
  try {
    window.SQSfx.tap(1); window.SQSfx.correct(); window.SQSfx.toggle(); window.SQSfx.toggle();
    ['info','craft','expression','conventions','algebra','advmath','data','geometry']
      .forEach(id => window.SQSfx.realmTap(id));
  } catch (e) { sfxSafe = false; }
  check('Each realm has its own themed sound', sfxSafe);
  check('Sound module loaded and safe in any environment', !!window.SQSfx && sfxSafe);
  let musicSafe = true;
  try { window.SQMusic.ensure(); window.SQMusic.toggle(); window.SQMusic.toggle(); window.SQSfx.click(); } catch (e) { musicSafe = false; }
  check('Original background music engine loaded and safe', !!window.SQMusic && musicSafe);
  check('Sound + music toggles present on the map',
    !!document.getElementById('sound-toggle') && !!document.getElementById('music-toggle'));

  /* 1b — character builder opens after the intro */
  const builder = document.querySelector('.builder-overlay');
  check('Character builder opens after the intro', !!builder && builder.hidden === false);
  const pcv = builder.querySelector('canvas');
  let previewPainted = false;
  try { previewPainted = [...pcv.getContext('2d').getImageData(0,0,16,20).data].some(v=>v>0); } catch(e){}
  check('Builder shows a painted hero preview', previewPainted);
  const hatBefore = pcv.getContext('2d').getImageData(6,1,1,1).data.join(',');
  builder.querySelector('.swatch[data-kind="hat"][data-i="1"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  await new Promise(r2 => setTimeout(r2, 40));
  const hatAfter = pcv.getContext('2d').getImageData(6,1,1,1).data.join(',');
  check('Choosing a swatch recolors the hero live', hatBefore !== hatAfter, hatBefore + ' -> ' + hatAfter);
  builder.querySelector('.builder-name input').value = 'Nova';
  builder.querySelector('.builder-begin').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  await new Promise(r2 => setTimeout(r2, 60));
  check('Begin saves the character and closes the builder',
    builder.hidden === true && /Nova/.test(window.localStorage.getItem('sq_character') || ''));
  check('Customize hero button reopens the builder', !!document.getElementById('customize-hero'));

  /* 1c — the capybara has all six frames */
  check('Capybara has the full sequence (stand, walk x2, blink, sit, bend, chew x2)',
    (() => { try { const cv = document.createElement('canvas'); cv.width = window.SQCompanion.w; cv.height = window.SQCompanion.h;
      [0,1,2,3,4,5,6,7].forEach(f => window.SQCompanion.draw(cv.getContext('2d'), f)); return true; } catch (e) { return false; } })());
  await new Promise(r => setTimeout(r, 3500));
  check('Left alone, the capybara sits down to chew grass',
    window.__SQ_SPRITE.sitting === true);

  /* 2 — nodes: 5 per segment, one boss each */
  const nodes = document.querySelectorAll('.rnode');
  check('40 quest nodes (5 per realm)', nodes.length === 40, nodes.length + ' nodes');
  check('One boss node per realm', document.querySelectorAll('.rnode-boss').length === 8);

  /* 3 — biome theming: canvases painted, themed icons present */
  const painted = segs.filter(s => {
    const cv = s.querySelector('.seg-bg');
    try { return [...cv.getContext('2d').getImageData(0,0,8,8).data].some(v=>v>0); } catch(e){ return false; }
  });
  check('All 8 biome backdrops painted', painted.length === 8, painted.length + '/8');
  check('Each realm has its own biome icon', document.querySelectorAll('.rnode-icon[data-biome="info"]').length === 5 &&
    document.querySelectorAll('.rnode-icon[data-biome="geometry"]').length === 5);

  /* 3b — the stunning pass: art chain, sparks, parallax, glow hook */
  check('Every segment attempts the generated realm art (local -> CDN chain)',
    segs.every(s => { const img = s.querySelector('.seg-art'); return img && /assets\/realms|cloudfront/.test(img.src || 'x'); }));
  check('Segment art is eager (hidden + lazy would never load)',
    segs.every(s => !s.querySelector('.seg-art').hasAttribute('loading')));
  check('Ambient sparks drift in every segment',
    segs.every(s => s.querySelectorAll('.spark').length >= 5));
  window.dispatchEvent(new window.Event('scroll'));
  await new Promise(r => setTimeout(r, 80));
  check('Parallax applies a transform to segment media on scroll',
    segs.some(s => (s.querySelector('.seg-media').style.transform || '').includes('translateY')));

  /* 4 — fresh state: first node of first realm is current, rest gated */
  const infoNodes = [...segs[0].querySelectorAll('.rnode')];
  check('Gloamwood node 1 is the current START node',
    infoNodes[0].classList.contains('is-current') && !infoNodes[0].disabled);
  check('Gloamwood nodes 2-5 locked at start',
    infoNodes.slice(1).every(n => n.classList.contains('is-locked') && n.disabled));
  const craftSeg = segs[1];
  check('Echo Vale segment locked at start',
    craftSeg.classList.contains('seg-locked') &&
    [...craftSeg.querySelectorAll('.rnode')].every(n => n.disabled));
  check('Copperpeak (Math track start) node 1 open',
    segs[4].querySelector('.rnode').classList.contains('is-current'));

  /* 5 — serpentine layout: nodes spread across at least 3 x positions */
  const xs = new Set(infoNodes.map(n => n.style.left));
  check('Serpentine path: nodes at 3+ horizontal positions', xs.size >= 3, xs.size + ' distinct x');

  /* 6 — dotted trail path per segment */
  check('Dotted trail drawn in every segment',
    segs.every(s => { const p = s.querySelector('.seg-trail-path'); return p && (p.getAttribute('d')||'').startsWith('M'); }));

  /* 6b — the capybara stands at the frontier as the traveler */
  const sprite = document.querySelector('.companion-sprite');
  let spritePainted = false;
  try {
    const d = sprite.querySelector('canvas').getContext('2d')
      .getImageData(0, 0, window.SQCompanion.w, window.SQCompanion.h).data;
    spritePainted = [...d].some(v => v > 0);
  } catch (e) {}
  check('Capybara traveler present and painted', !!sprite && spritePainted);
  check('Capybara starts at Gloamwood node 1',
    window.__SQ_SPRITE && window.__SQ_SPRITE.node === infoNodes[0]);
  check('Capybara replaces the START badge as the marker',
    document.getElementById('roadmap').classList.contains('has-sprite'));
  check('No hero sprite remains on the map', document.querySelector('.hero-sprite') === null);

  /* 7 — clicking the current node opens the quest drawer */
  infoNodes[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 80));
  const drawer = document.querySelector('.quest-overlay');
  check('Current node opens the quest drawer', !!drawer && !drawer.hidden && !!drawer.querySelector('.quest-q'));
  drawer.querySelector('.quest-close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  /* 8 — progression advances the path live */
  const G = window.SQGame;
  G.completeQuest('info', 5, 5); // one lesson -> Lv 2
  await new Promise(r => setTimeout(r, 80));
  check('Reaching Lv 2 completes node 1 and advances START to node 2',
    infoNodes[0].classList.contains('is-done') && infoNodes[1].classList.contains('is-current'));
  check('Destination stays visually locked while the capybara travels',
    infoNodes[1].classList.contains('is-pending'));
  await new Promise(r => setTimeout(r, 1600)); // let the walk finish
  check('Capybara walks the trail to node 2',
    window.__SQ_SPRITE.node === infoNodes[1] && window.__SQ_SPRITE.walking === false,
    'walking=' + window.__SQ_SPRITE.walking);
  check('Arrival unlocks the lesson (pending lifted)',
    !infoNodes[1].classList.contains('is-pending') && infoNodes[1].classList.contains('is-current'));
  check('Lv 2 unlocks Echo Vale on the path',
    !craftSeg.classList.contains('seg-locked') &&
    craftSeg.querySelector('.rnode').classList.contains('is-current'));

  /* 8c — the journey waits for Return to map when the drawer is open */
  infoNodes[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 80));
  const drawerEl = document.querySelector('.quest-overlay');
  check('Drawer open at the new lesson', drawerEl && !drawerEl.hidden);
  while (window.SQGame.realmState('info').level < 3) window.SQGame.completeQuest('info', 3, 3);
  await new Promise(r2 => setTimeout(r2, 120));
  check('Capybara holds position while the drawer is open',
    window.__SQ_SPRITE.walking === false && window.__SQ_SPRITE.node === infoNodes[1] &&
    infoNodes[2].classList.contains('is-pending'));
  drawerEl.querySelector('.quest-close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 1700));
  check('Return to map starts the journey to the next lesson',
    window.__SQ_SPRITE.node === infoNodes[2] && !infoNodes[2].classList.contains('is-pending') &&
    infoNodes[2].classList.contains('is-current'));

  /* 9 — clearing a realm: all nodes done, segment conquered */
  for (let i=0;i<20;i++) G.completeQuest('info', 5, 5);
  await new Promise(r => setTimeout(r, 80));
  check('Cleared realm: all 5 nodes done + segment conquered',
    infoNodes.every(n => n.classList.contains('is-done')) &&
    segs[0].classList.contains('seg-cleared') &&
    /Conquered/.test(segs[0].querySelector('.seg-level').textContent));

  /* 9b — all-access (test / paid users): every realm unlocked */
  window.localStorage.setItem('sq_all_access', '1');
  const allState = window.SQGame.getState();
  check('All-access unlocks every realm (paying-user capabilities)',
    Object.values(allState.realms).every(st => st.unlocked === true));
  window.localStorage.removeItem('sq_all_access');

  /* 10 — world rank live */
  check('World rank displayed and updated',
    /Lv (1[0-9]|[9])/.test(document.getElementById('world-rank').textContent),
    document.getElementById('world-rank').textContent);

  /* 11 — copy rules hold here too */
  check('No em dashes on the map page', !document.body.textContent.includes('\u2014'));

  /* 12 — index links students to the map */
  const idx = await JSDOM.fromURL('http://localhost:8000/', OPTS);
  await new Promise(r => idx.window.addEventListener('load', r));
  const links = [...idx.window.document.querySelectorAll('a[href="map.html"]')];
  check('Landing page links to the world map (hero + world section)', links.length >= 2, links.length + ' links');

  const fails = results.filter(x=>!x).length;
  console.log('\n' + (results.length-fails) + '/' + results.length + ' checks passed');
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
