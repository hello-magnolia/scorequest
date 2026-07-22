/* ============================================================
   ScoreQuest — checkout
   ------------------------------------------------------------
   The payment screen, built for the person actually paying: a
   parent. Deliberate rules for this surface:
   - Trial-first framing: due today is $0.00; the real price is
     stated plainly right next to it. No countdowns, no urgency.
   - Payment itself happens on Stripe via Payment Links (config.js
     -> STRIPE_LINKS). The card never touches this site.
   - Until links are pasted in, the page runs in demo mode: the
     whole flow works, and the final button says so honestly.
   State lives in the URL (?plan=&billing=) so plans can be linked
   directly from the pricing section.
   ============================================================ */
(function () {
  'use strict';
  if (!document.getElementById('checkout')) return;

  var PLANS = {
    basic: {
      name: 'Basic', monthly: 99, annual: 948, annualMo: 79,
      tagline: 'The standard path, two realms at a time.',
      features: [
        'Two realms open at a time',
        'Core question bank',
        'Standard practice path for everyone',
        'Extra practice rounds not included'
      ]
    },
    allaccess: {
      name: 'All Access', monthly: 129, annual: 1236, annualMo: 103, featured: true,
      tagline: 'Every realm open at once, personalized to your child.',
      features: [
        'All 8 realms open at once, every SAT category at the same time',
        'Full question bank, including the hardest tiers',
        'Follows your child\u2019s personalized plan from their diagnostic',
        'Unlimited extra practice: replay any node, rematch any boss, drill any weak spot'
      ]
    },
    complete: {
      name: 'Complete', monthly: 249, annual: 2388, annualMo: 199,
      tagline: 'Everything in All Access, for both the SAT and ACT.',
      features: [
        'Everything in All Access',
        'Both the SAT and the ACT, one subscription'
      ]
    }
  };

  var params = new URLSearchParams(window.location.search);
  var state = {
    plan: PLANS[params.get('plan')] ? params.get('plan') : 'allaccess',
    billing: params.get('billing') === 'annual' ? 'annual' : 'monthly'
  };

  function money(n) { return '$' + n.toLocaleString('en-US'); }

  function stripeLink() {
    var cfg = (window.SCOREQUEST_CONFIG || {}).STRIPE_LINKS || {};
    var url = cfg[state.plan + '_' + state.billing] || '';
    return url.indexOf('__') === 0 ? null : url;
  }

  function syncUrl() {
    var q = '?plan=' + state.plan + '&billing=' + state.billing;
    try { window.history.replaceState(null, '', q); } catch (e) {}
  }

  function render() {
    var p = PLANS[state.plan];

    document.querySelectorAll('.co-plan').forEach(function (b) {
      b.classList.toggle('is-selected', b.getAttribute('data-plan') === state.plan);
      b.setAttribute('aria-pressed', b.getAttribute('data-plan') === state.plan ? 'true' : 'false');
    });
    document.querySelectorAll('.co-bill').forEach(function (b) {
      b.classList.toggle('is-selected', b.getAttribute('data-billing') === state.billing);
      b.setAttribute('aria-pressed', b.getAttribute('data-billing') === state.billing ? 'true' : 'false');
    });

    document.getElementById('co-name').textContent = p.name;
    document.getElementById('co-tagline').textContent = p.tagline;
    document.getElementById('co-price').textContent = state.billing === 'annual'
      ? money(p.annualMo) + '/mo'
      : money(p.monthly) + '/mo';
    document.getElementById('co-price-note').textContent = state.billing === 'annual'
      ? 'billed ' + money(p.annual) + ' yearly (save 20%)'
      : 'billed monthly \u00B7 switch to annual to save 20%';

    var list = document.getElementById('co-features');
    list.innerHTML = '';
    p.features.forEach(function (f) {
      var li = document.createElement('li');
      li.textContent = f;
      list.appendChild(li);
    });

    document.getElementById('co-due').textContent = '$0.00';
    document.getElementById('co-after').textContent = 'then ' + (state.billing === 'annual'
      ? money(p.annual) + '/year'
      : money(p.monthly) + '/month') + ' after your 7-day free trial';

    var cta = document.getElementById('co-cta');
    var note = document.getElementById('co-demo-note');
    var link = stripeLink();
    if (link) {
      cta.href = link;
      cta.classList.remove('is-demo');
      cta.removeAttribute('aria-disabled');
      cta.textContent = 'Start your free trial';
      note.hidden = true;
    } else {
      cta.href = '#';
      cta.classList.add('is-demo');
      cta.setAttribute('aria-disabled', 'true');
      cta.textContent = 'Secure checkout connects here';
      note.hidden = false;
    }
    syncUrl();
  }

  document.querySelectorAll('.co-plan').forEach(function (b) {
    b.addEventListener('click', function () {
      state.plan = b.getAttribute('data-plan');
      render();
    });
  });
  document.querySelectorAll('.co-bill').forEach(function (b) {
    b.addEventListener('click', function () {
      state.billing = b.getAttribute('data-billing');
      render();
    });
  });
  document.getElementById('co-cta').addEventListener('click', function (e) {
    if (this.classList.contains('is-demo')) e.preventDefault();
  });

  render();
})();
