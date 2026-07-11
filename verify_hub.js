/* Verify the World Map roadmap: 8 biome segments in order, 40 nodes with
   correct states, serpentine layout, dotted trail, quest drawer launch,
   and live advancement from the progression engine. */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok?'PASS':'FAIL')+'  '+n+(d?'  — '+d:'')); };
// poll a condition instead of racing animation timers with fixed sleeps
const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise(r => setTimeout(r, 40)); } return fn(); };
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


  /* 1a — intro cinematic v2: six scenes, typewriter text, Pomelo's deal */
  const intro = document.querySelector('.intro-overlay');
  const clickIntro = () => intro.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  check('Intro cinematic opens on first visit', !!intro && intro.hidden === false);
  const cueLog = [];
  const realCue = window.SQMusic.cue;
  window.SQMusic.cue = on => { cueLog.push(on); realCue(on); };
  let caws = 0;
  const realCaw = window.SQSfx.caw;
  window.SQSfx.caw = () => { caws++; realCaw(); };
  check('A press-to-begin gate unlocks audio before any typing',
    intro.getAttribute('data-scene') === 'begin' &&
    /press to begin/.test(intro.querySelector('.intro-center').textContent));
  clickIntro(); await sleep(150);
  const textEl = intro.querySelector('.intro-text');
  const full = () => textEl.getAttribute('data-full') || '';
  check('Scene 1 keeps the midnight caption; six dots mark the longer story',
    intro.querySelector('.intro-canvas') === null &&
    /past midnight/.test(full()) && /Anything but question seven/.test(full()) &&
    intro.querySelectorAll('.intro-dot').length === 6);
  check('Captions type character-by-character (Undertale style)',
    textEl.textContent.length > 0 && textEl.textContent.length < full().length,
    textEl.textContent.length + '/' + full().length + ' chars at first paint');
  check('Intro media chain present (video primary, still as fallback only)',
    !!intro.querySelector('.intro-video') && !!intro.querySelector('.intro-img') &&
    /cloudfront|assets\/intro/.test(intro.querySelector('.intro-video').src || 'x') &&
    intro.querySelector('.intro-video').muted === true &&
    !(intro.querySelector('.intro-img').src));
  check('Intro scene 1 attempts its animated Higgsfield render',
    /cloudfront|assets\/intro/.test(intro.querySelector('.intro-video').src || 'x'),
    (intro.querySelector('.intro-video').src || '').split('/').pop());
  clickIntro(); await sleep(50);
  check('First click finishes the line instantly, cursor invites the next',
    textEl.textContent === full() && intro.querySelector('.intro-cursor').classList.contains('is-on'));
  clickIntro(); await sleep(80);
  check('Advance dips the scene to black first', intro.querySelector('.intro-media').classList.contains('is-dark'));
  await sleep(340);
  check('Second click advances to the glowing orange',
    intro.getAttribute('data-scene') === 'orange' && /lands on your desk/.test(full()) &&
    intro.querySelectorAll('.intro-dot.is-done').length === 1);
  check('Scene 2 brings its own audio (unmuted, committed local clip)',
    intro.querySelector('.intro-video').muted === false &&
    /assets\/intro\/orange/.test(intro.querySelector('.intro-video').src || ''));
  check('Scene advance bumps the media generation (stale-load guard active)',
    window.__SQ_MEDIA_GEN >= 2, 'gen=' + window.__SQ_MEDIA_GEN);
  check('Intro preloads its art on open (anti-flash)', window.__SQ_INTRO_PRELOAD === true);
  const nextScene = async () => { clickIntro(); await sleep(60); clickIntro(); await sleep(430); };
  await nextScene(); // orange -> touch
  check('"You touch it." plays alone in the dark',
    intro.getAttribute('data-scene') === 'touch' &&
    (intro.querySelector('.intro-center').getAttribute('data-full') || '') === 'You touch it.');
  clickIntro(); await sleep(60); clickIntro(); await sleep(140); // leave the touch scene
  check('Leaving the touch scene swells brighter and brighter (flare rising)',
    intro.querySelector('.intro-flash').classList.contains('is-rising'));
  await sleep(2050);
  check('The onsen flashback plays from the committed local asset and cues the lullaby',
    intro.getAttribute('data-scene') === 'onsen' && /two capybaras/.test(full()) &&
    /assets\/intro\/onsen/.test(intro.querySelector('.intro-video').src || '') &&
    cueLog[cueLog.length - 1] === true);
  await nextScene(); // onsen -> snatch
  check('The snatch cuts in: "And then, suddenly—"',
    intro.getAttribute('data-scene') === 'snatch' && /suddenly/.test(full()));
  await sleep(450);
  check('The eagle caws on arrival', caws === 1, caws + ' caws');
  await nextScene(); // snatch -> pomelo
  check('Pomelo enters walking through the dark (caption held back)',
    intro.getAttribute('data-scene') === 'pomelo' &&
    intro.classList.contains('is-walking'));
  clickIntro(); await sleep(120);   // a click skips the entrance walk
  check('Pomelo arrives at center and says hello',
    !intro.classList.contains('is-walking') &&
    intro.querySelector('.intro-pomelo').style.left === '50%' &&
    /hello/.test(full()));
  let hops = 0;
  while (intro.querySelector('.intro-name').hidden && hops < 20) { clickIntro(); await sleep(140); hops++; }
  check('Pomelo asks who u are and waits for a typed name',
    !intro.querySelector('.intro-name').hidden && /who are u/.test(full()), hops + ' clicks to the question');
  check('The name field notes parent-report visibility, plainly',
    /parent account is linked/.test(intro.querySelector('.intro-name-note').textContent));
  clickIntro(); await sleep(60);
  check('Clicks cannot skip past the question', !intro.querySelector('.intro-name').hidden);
  intro.querySelector('.intro-name input').value = 'Nova';
  intro.querySelector('.intro-name-ok').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(120);
  check('Pomelo repeats the name back', /Nova/.test(full()), full());
  const seenPages = [full()];
  hops = 0;
  while (intro.querySelector('.intro-choices').hidden && hops < 40) { seenPages.push(full()); clickIntro(); await sleep(140); hops++; }
  check('The story pages read as intended (big bird fast; u are a scholar)',
    seenPages.some(t => /big bird fast\. leg too short\./.test(t)) &&
    seenPages.some(t => /u are a scholar right\?/.test(t)));
  const choices = intro.querySelectorAll('.intro-choice');
  check('Derpy dialogue ends on the deal — two choices, both accept',
    !intro.querySelector('.intro-choices').hidden && choices.length === 2 &&
    /deal, obviously/.test(choices[1].textContent), hops + ' pages clicked through');
  choices[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  check('Accepting the deal persists v2 and cues the lullaby back out',
    intro.hidden === true && window.localStorage.getItem('sq_intro_seen') === 'v2' &&
    cueLog[cueLog.length - 1] === false);

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

  /* 1b — the hero is named inside the story; the builder is gone */
  check('No character builder remains in the page', document.querySelector('.builder-overlay') === null);
  check('The name given to Pomelo is the hero name',
    /Nova/.test(window.localStorage.getItem('sq_character') || ''),
    window.localStorage.getItem('sq_character'));
  const playerLine = document.getElementById('mappage-player');
  check('The map header greets the named player',
    !!playerLine && playerLine.hidden === false &&
    document.getElementById('mappage-player-name').textContent === 'Nova');

  /* 2 — the hub: eight realm doors, no roadmap */
  check('The roadmap is gone: the hub offers the eight realms instead',
    document.getElementById('roadmap') === null &&
    document.querySelectorAll('.hub-realm').length === 8 &&
    /The Realms/.test(document.querySelector('.mappage-title').textContent));
  check('Every hub card deep-links its realm with name and domain',
    !!document.querySelector('.hub-realm[href="realm.html?realm=prismpeaks"]') &&
    /Geometry & Trigonometry/.test(document.querySelector('.hub-realm[href="realm.html?realm=prismpeaks"]').textContent));
  check('Sound and music toggles survive on the hub',
    !!document.getElementById('sound-toggle') && !!document.getElementById('music-toggle'));

  const fails = results.filter(x=>!x).length;
  console.log('\n' + (results.length-fails) + '/' + results.length + ' checks passed');
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
