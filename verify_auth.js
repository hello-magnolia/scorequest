/* Verify the auth layer loads, degrades to demo mode when Supabase CDN is
   unreachable (sandbox condition), and the "Choose your hero" modal works. */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok?'PASS':'FAIL')+'  '+n+(d?'  — '+d:'')); };
const vc = new VirtualConsole(); vc.on('error',()=>{}); vc.on('jsdomError',()=>{});

(async () => {
  const dom = await JSDOM.fromURL('http://localhost:8000/', {
    resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w){ w.matchMedia = w.matchMedia || (q=>({matches:false,addListener(){},removeListener(){}})); }
  });
  const { window } = dom, { document } = window;
  await new Promise(r => window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 600));

  check('SQAuth API present', !!window.SQAuth && typeof window.SQAuth.openModal === 'function');
  check('Starts signed-out (no user)', window.SQAuth.getUser() === null);

  // config still has placeholders -> must be demo mode, not a broken client
  const demoBadge = document.querySelector('.auth-demo');
  check('Demo mode active while config unfilled', !!window.SQAuth && !!demoBadge,
    demoBadge ? demoBadge.textContent.trim().slice(0,40) : 'no demo badge');

  // nav CTA rewritten to live login buttons
  const loginBtn = document.querySelector('.nav-cta .btn-login');
  const startBtn = document.querySelector('.nav-cta .btn-start');
  check('Nav shows live Log in / Start free buttons', !!loginBtn && !!startBtn);

  // opening the modal
  const overlay = document.querySelector('.auth-overlay');
  check('Auth modal built into DOM', !!overlay && overlay.hidden === true);
  loginBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  check('Log in opens modal in sign-in mode', !overlay.hidden &&
    document.querySelector('.auth-title').textContent === 'Choose your hero');

  // toggle to sign-up reveals hero-name field
  document.querySelector('.auth-toggle').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  const heroField = document.querySelector('.auth-heroname');
  check('Toggle to Create hero reveals hero-name field', heroField && heroField.hidden === false &&
    document.querySelector('.auth-title').textContent === 'Create your hero');

  // Google button present and labelled
  const g = document.querySelector('.auth-google');
  check('Continue with Google button present', !!g && /Google/.test(g.textContent));

  // demo email login logs a hero in and updates the nav
  document.querySelector('.auth-heroname input').value = 'Nightscholar';
  document.querySelector('input[type=email]').value = 'test@demo.com';
  document.querySelector('input[type=password]').value = 'secret123';
  document.querySelector('.auth-submit').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  await new Promise(r => setTimeout(r, 120));
  check('Demo signup logs hero in', window.SQAuth.getUser() !== null,
    window.SQAuth.getUser() ? window.SQAuth.getUser().email : 'null');
  const coin = document.querySelector('.nav-cta .un-avatar');
  check('Nav dons the initialed coin for the signed-in hero', !!coin && coin.textContent === 'N',
    coin ? 'coin ' + coin.textContent : 'no coin');

  // progress persistence API
  window.SQAuth.saveProgress({ xp: 240, streak: 3, realms: { algebra: { cleared: true } } });
  const p = window.SQAuth.getProgress();
  check('saveProgress/getProgress round-trips', p.xp === 240 && p.streak === 3 && p.realms.algebra.cleared === true,
    'xp='+p.xp+' streak='+p.streak);

  // sign out returns to logged-out nav
  window.SQAuth.signOut();
  await new Promise(r => setTimeout(r, 60));
  check('Sign out restores Log in button', !!document.querySelector('.nav-cta .btn-login') && window.SQAuth.getUser()===null);

  /* login flows enter the world map */
  check('Demo hero creation routes the player to the world map', window.__SQ_LAST_REDIRECT === 'map.html');

  // test-as-new-user flow: wipes first-run state so the intro replays
  window.__SQ_LAST_REDIRECT = null;
  window.localStorage.setItem('sq_intro_seen', '1');
  window.localStorage.setItem('sq_character', '{"hat":1}');
  document.querySelector('.nav-cta .btn-login').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 40));
  const testerBtn = document.querySelector('.auth-guest');
  check('"Test as new user" button present in the modal', !!testerBtn && /Test as new user/.test(testerBtn.textContent));
  testerBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 80));
  check('Tester click wipes intro + character state for a clean first run',
    window.localStorage.getItem('sq_intro_seen') === null &&
    window.localStorage.getItem('sq_character') === null);
  check('Tester receives all-access (every realm unlocked)',
    window.localStorage.getItem('sq_all_access') === '1');
  check('Tester logs in and routes to the map',
    !!window.SQAuth.getUser() && window.__SQ_LAST_REDIRECT === 'map.html',
    (window.SQAuth.getUser() || {}).email || 'no user');
  const coin2 = document.querySelector('.nav-cta .un-avatar');
  check('Nav dons the tester’s initialed coin', !!coin2 && coin2.textContent === 'T',
    coin2 ? 'coin ' + coin2.textContent : 'no coin');
  window.SQAuth.signOut();
  await new Promise(r => setTimeout(r, 40));

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
  check('Auth overlay hidden attribute restored after use', document.querySelector('.auth-overlay').hasAttribute('hidden'));

  const fails = results.filter(x=>!x).length;
  console.log('\n' + (results.length-fails) + '/' + results.length + ' checks passed');
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
