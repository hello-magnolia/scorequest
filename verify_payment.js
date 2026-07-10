/* Verify the payment screens and the parents page: plan selection driven by
   URL and clicks, billing toggle math, trial-first framing, Stripe demo mode,
   success next-steps, parents-page report/live/goals content, index wiring. */
const { JSDOM, VirtualConsole } = require('jsdom');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); };
const vc = new VirtualConsole(); vc.on('error', () => {}); vc.on('jsdomError', () => {});
const OPTS = {
  resources: 'usable', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(w) {
    w.matchMedia = w.matchMedia || (q => ({ matches: false, addListener() {}, removeListener() {} }));
    w.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(t) { this.cb([{ target: t, isIntersecting: true }], this); } unobserve() {} disconnect() {} };
  }
};
const load = async (path) => {
  const dom = await JSDOM.fromURL('http://localhost:8000/' + path, OPTS);
  await new Promise(r => dom.window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 350));
  return dom.window;
};
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

(async () => {
  /* 1 — checkout: defaults */
  let w = await load('checkout.html');
  let d = w.document;
  check('Checkout page loads with three selectable plans',
    !!d.getElementById('checkout') && d.querySelectorAll('.co-plan').length === 3);
  check('Guildmaster is preselected as the featured default',
    d.querySelector('.co-plan[data-plan="guildmaster"]').classList.contains('is-selected') &&
    d.getElementById('co-name').textContent === 'Guildmaster' &&
    /\$120\/mo/.test(d.getElementById('co-price').textContent));
  check('Trial-first framing: due today is $0.00, real price stated beside it',
    d.getElementById('co-due').textContent === '$0.00' &&
    /then \$120\/month after your 7-day free trial/.test(d.getElementById('co-after').textContent));
  check('Demo mode is honest until Stripe links are pasted in',
    d.getElementById('co-cta').classList.contains('is-demo') &&
    d.getElementById('co-cta').getAttribute('aria-disabled') === 'true' &&
    d.getElementById('co-demo-note').hidden === false &&
    /config\.js/.test(d.getElementById('co-demo-note').textContent));
  check('Stripe trust line present (secured by Stripe, cancel anytime)',
    /Stripe/.test(d.querySelector('.co-trust').textContent) &&
    /Cancel anytime/.test(d.querySelector('.co-trust').textContent));
  check('FAQ answers the charge-timing question plainly',
    d.querySelectorAll('.co-faq details').length === 3 &&
    /Never during the trial/.test(d.querySelector('.co-faq').textContent));

  /* 2 — checkout: interactions */
  click(w, d.querySelector('.co-bill[data-billing="annual"]'));
  await new Promise(r => setTimeout(r, 40));
  check('Annual billing recomputes: $96/mo billed $1,152 yearly',
    /\$96\/mo/.test(d.getElementById('co-price').textContent) &&
    /billed \$1,152 yearly/.test(d.getElementById('co-price-note').textContent) &&
    /\$1,152\/year/.test(d.getElementById('co-after').textContent));
  click(w, d.querySelector('.co-plan[data-plan="adventurer"]'));
  await new Promise(r => setTimeout(r, 40));
  check('Switching plans keeps the billing period ($39/mo annual Adventurer)',
    d.getElementById('co-name').textContent === 'Adventurer' &&
    /\$39\/mo/.test(d.getElementById('co-price').textContent));
  check('Selection state lives in the URL for direct linking',
    /plan=adventurer/.test(w.location.search) && /billing=annual/.test(w.location.search));

  /* 3 — checkout: deep link */
  w = await load('checkout.html?plan=champion');
  d = w.document;
  check('Pricing CTAs deep-link a plan (?plan=champion preselects it)',
    d.querySelector('.co-plan[data-plan="champion"]').classList.contains('is-selected') &&
    /\$360\/mo/.test(d.getElementById('co-price').textContent));

  /* 4 — success page */
  w = await load('success.html');
  d = w.document;
  check('Success page welcomes and routes the student to the map',
    /Welcome to the guild/.test(d.querySelector('.suc-title').textContent) &&
    !!d.querySelector('a[href="map.html"]'));
  check('Success page routes parents to their page',
    !!d.querySelector('.suc-steps a[href="parents.html"]'));

  /* 5 — parents page */
  w = await load('parents.html');
  d = w.document;
  check('Parents page opens on the promise: know it\u2019s working',
    /Know it\u2019s working|Know it's working/.test(d.querySelector('.pp-title').textContent));
  const reportText = d.getElementById('report').textContent;
  check('The weekly report section lists the five measurements + language',
    d.querySelectorAll('#report .pp-card').length === 6 &&
    /Practice time/.test(reportText) && /Scored practice exams/.test(reportText) &&
    /\u4E2D\u6587/.test(reportText));
  check('Report section links to the live sample on the landing page',
    !!d.querySelector('.pp-sample a[href="index.html#parents"]'));
  check('Log-in-anytime section shows the live view (today, streak, focus)',
    /Log in any time/.test(d.getElementById('login').textContent) &&
    d.querySelectorAll('#login .pp-live-card').length === 3 &&
    /Streak/.test(d.getElementById('login').textContent));
  check('Goals section answers on-pace with three plain states + stop alert',
    /On pace, or not\?/.test(d.getElementById('goals').textContent) &&
    d.querySelectorAll('#goals .pp-goal-row').length === 3 &&
    /pauses for three days/.test(d.getElementById('goals').textContent));
  check('Measured-not-promised principle stated on the goals section',
    /We do not project scores/.test(d.getElementById('goals').textContent));
  check('Parents page CTA leads to checkout',
    !!d.querySelector('.pp-cta a[href="checkout.html"]'));

  /* 6 — index wiring */
  w = await load('index.html');
  d = w.document;
  check('Landing nav and footer link to the parents page',
    !!d.querySelector('.nav-links a[href="parents.html"]') &&
    !!d.querySelector('.footer-links a[href="parents.html"]'));
  check('All three pricing CTAs deep-link into checkout',
    !!d.querySelector('a[href="checkout.html?plan=adventurer"]') &&
    !!d.querySelector('a[href="checkout.html?plan=guildmaster"]') &&
    !!d.querySelector('a[href="checkout.html?plan=champion"]'));
  check('Parent pitch links through to the full parents page',
    !!d.querySelector('.pitch-more a[href="parents.html"]'));

  const passed = results.filter(Boolean).length;
  console.log('\n' + passed + '/' + results.length + ' checks passed');
  process.exit(passed === results.length ? 0 : 1);
})();
