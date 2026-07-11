/* Verify the realm walkabout architecture: one template driven by ?realm=,
   manifest-selected art with local-first chains, HUD ordinals, prev/next
   preview navigation, boss popup wiring, and the map hub's preview strip. */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); };
const vc = new VirtualConsole(); vc.on('error', () => {}); vc.on('jsdomError', () => {});
const OPTS = {
  resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(w) {
    w.matchMedia = w.matchMedia || (q => ({ matches: false, addListener() {}, removeListener() {} }));
  }
};
const load = async (path) => {
  const dom = await JSDOM.fromURL('http://localhost:8000/' + path, OPTS);
  await new Promise(r => dom.window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 400));
  return dom.window;
};

(async () => {
  /* default realm */
  let w = await load('realm.html');
  let d = w.document;
  check('Realm template loads and defaults to Lorewood (realm 1 of 8)',
    d.getElementById('rw-title').textContent === 'Lorewood' &&
    /Realm 1 of 8/.test(d.getElementById('rw-meta').textContent) &&
    /Information & Ideas/.test(d.getElementById('rw-meta').textContent));
  check('The art chain is local-first with the placeholder CDN fallback',
    /assets\/realms\/lorewood|cloudfront/.test(d.getElementById('rw-bg').src));
  check('Pomelo rides the padded companion canvas',
    d.getElementById('rw-capy').width === 49 && d.getElementById('rw-capy').height === 43);
  check('The boss area waits at the end (door marker + sealed-door text ready)',
    !!d.getElementById('rw-door') &&
    /sealed/.test(d.getElementById('rw-popup-text').textContent) &&
    d.getElementById('rw-popup').hidden === true);
  check('First realm: back-arrow off, next leads to Story Forge',
    d.getElementById('rw-prev').classList.contains('is-off') &&
    /realm=storyforge/.test(d.getElementById('rw-next').href) &&
    /Onward to Story Forge/.test(d.getElementById('rw-popup-next').textContent));

  /* deep link mid-chain */
  w = await load('realm.html?realm=datadocks');
  d = w.document;
  check('?realm=datadocks selects Data Docks (realm 7 of 8) with both arrows live',
    d.getElementById('rw-title').textContent === 'Data Docks' &&
    /Realm 7 of 8/.test(d.getElementById('rw-meta').textContent) &&
    /realm=infinityisles/.test(d.getElementById('rw-prev').href) &&
    /realm=prismpeaks/.test(d.getElementById('rw-next').href));

  /* the finale */
  w = await load('realm.html?realm=prismpeaks');
  d = w.document;
  check('Prism Peaks is the last realm: no onward, the nest is named',
    /Realm 8 of 8/.test(d.getElementById('rw-meta').textContent) &&
    d.getElementById('rw-next').classList.contains('is-off') &&
    d.getElementById('rw-popup-next').hidden === true &&
    /nest/.test(d.getElementById('rw-popup-text').textContent));

  /* junk param */
  w = await load('realm.html?realm=zzz');
  d = w.document;
  check('Unknown realm ids fall back to Lorewood',
    d.getElementById('rw-title').textContent === 'Lorewood');

  /* hub strip */
  w = await load('map.html');
  d = w.document;
  check('The World Map hub links all eight realm walkabouts',
    d.querySelectorAll('.realm-preview-links a[href^="realm.html?realm="]').length === 8 &&
    /architecture preview/.test(d.querySelector('.realm-preview').textContent));

  const passed = results.filter(Boolean).length;
  console.log('\n' + passed + '/' + results.length + ' checks passed');
  process.exit(passed === results.length ? 0 : 1);
})();
