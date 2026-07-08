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

  /* 6b — the adventurer sprite stands at the frontier */
  const sprite = document.querySelector('.hero-sprite');
  let spritePainted = false;
  try {
    const d = sprite.querySelector('canvas').getContext('2d').getImageData(0, 0, 16, 20).data;
    spritePainted = [...d].some(v => v > 0);
  } catch (e) {}
  check('Adventurer sprite present and painted', !!sprite && spritePainted);
  check('Sprite starts at Gloamwood node 1',
    window.__SQ_SPRITE && window.__SQ_SPRITE.node === infoNodes[0]);
  check('Sprite replaces the START badge as the marker',
    document.getElementById('roadmap').classList.contains('has-sprite'));

  /* 7 — clicking the current node opens the quest drawer */
  infoNodes[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 80));
  const drawer = document.querySelector('.quest-overlay');
  check('Current node opens the quest drawer', !!drawer && !drawer.hidden && !!drawer.querySelector('.quest-q'));
  drawer.querySelector('.quest-close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  /* 8 — progression advances the path live */
  const G = window.SQGame;
  G.completeQuest('info', 5, 5); G.completeQuest('info', 5, 5); G.completeQuest('info', 5, 5); // -> Lv 2
  await new Promise(r => setTimeout(r, 80));
  check('Reaching Lv 2 completes node 1 and advances START to node 2',
    infoNodes[0].classList.contains('is-done') && infoNodes[1].classList.contains('is-current'));
  await new Promise(r => setTimeout(r, 1400)); // let the walk finish (~118px at 170px/s)
  check('Sprite walks the trail to node 2',
    window.__SQ_SPRITE.node === infoNodes[1] && window.__SQ_SPRITE.walking === false,
    'walking=' + window.__SQ_SPRITE.walking);
  check('Lv 2 unlocks Echo Vale on the path',
    !craftSeg.classList.contains('seg-locked') &&
    craftSeg.querySelector('.rnode').classList.contains('is-current'));

  /* 9 — clearing a realm: all nodes done, segment conquered */
  for (let i=0;i<20;i++) G.completeQuest('info', 5, 5);
  await new Promise(r => setTimeout(r, 80));
  check('Cleared realm: all 5 nodes done + segment conquered',
    infoNodes.every(n => n.classList.contains('is-done')) &&
    segs[0].classList.contains('seg-cleared') &&
    /Conquered/.test(segs[0].querySelector('.seg-level').textContent));

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
