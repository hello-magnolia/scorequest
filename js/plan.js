/* ============================================================
   ScoreQuest — plan state and the gates it opens
   ------------------------------------------------------------
   One source of truth for what a subscription actually buys, and
   the cozy wall the player meets when they reach past it.

   window.SQPlan:
     REALMS                 ordered realm registry (slug ids, section, hub id)
     current()              -> 'basic' | 'allaccess' | 'complete'
     plan()                 -> the capability record for current()
     set(id)                adopt a plan (local + profile when signed in)
     openSet()              -> realm ids open to this plan right now
     canEnter(realmId)      may the player walk into this realm at all
     canPractice()          may they replay a cleared trial / rematch a boss
     allRealmsOpen()        true when nothing is realm-gated
     lockNote(realmId)      the sentence that explains a closed realm
     wall(kind, opts)       open the shared upsell wall
     onChange(fn)           subscribe to plan changes

   What the ladder buys (kept in step with the pricing copy):
     Basic      two SAT categories open at a time (one Reading and
                Writing, one Math), no extra practice rounds.
     All Access all eight open at once, unlimited extra practice.
     Complete   everything in All Access, SAT and ACT.

   Where the plan comes from, in order:
     1. profiles.plan for a signed-in player (follows the account)
     2. sq_plan in localStorage (set when a trial starts on success.html)
     3. sq_all_access, the long-standing "test as new user" flag
     4. PREVIEW: with no plan on file the prototype shows the whole
        world, so the demo and the marketing pages stay walkable.

   Copy rules for the wall: this is a teen surface. A closed realm is
   resting, never earned-and-lost, and the way out is either the realm
   that IS open or a grown-up. No prices, no countdowns, no pressure.
   ============================================================ */
(function () {
  'use strict';

  /* section: 'rw' | 'math'. hub: the id the landing-page cards use. */
  var REALMS = [
    { id: 'lorewood',      name: 'Lorewood',        section: 'rw',   hub: 'info' },
    { id: 'storyforge',    name: 'Story Forge',     section: 'rw',   hub: 'craft' },
    { id: 'inkreef',       name: 'Ink Reef',        section: 'rw',   hub: 'expression' },
    { id: 'syntaxcitadel', name: 'Syntax Citadel',  section: 'rw',   hub: 'conventions' },
    { id: 'mirrormines',   name: 'Mirror Mines',    section: 'math', hub: 'algebra' },
    { id: 'infinityisles', name: 'Infinity Isles',  section: 'math', hub: 'advmath' },
    { id: 'datadocks',     name: 'Data Docks',      section: 'math', hub: 'data' },
    { id: 'prismpeaks',    name: 'Prism Peaks',     section: 'math', hub: 'geometry' }
  ];
  var BY_ID = {}, BY_HUB = {};
  REALMS.forEach(function (r) { BY_ID[r.id] = r; BY_HUB[r.hub] = r; });

  var SECTION_NAME = { rw: 'Reading and Writing', math: 'Math' };

  var PLANS = {
    basic:     { id: 'basic',     name: 'Basic',      openAll: false, extraPractice: false },
    allaccess: { id: 'allaccess', name: 'All Access', openAll: true,  extraPractice: true },
    complete:  { id: 'complete',  name: 'Complete',   openAll: true,  extraPractice: true }
  };
  var PREVIEW = 'allaccess';   // no plan on file: show the whole world

  var listeners = [];
  var localPlan = null;        // cached read of sq_plan
  var lastSeen = null;         // last plan we told listeners about

  function ls(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function profilePlan() {
    var p = window.SQAuth && window.SQAuth.getProfile && window.SQAuth.getProfile();
    return (p && PLANS[p.plan]) ? p.plan : null;
  }

  function current() {
    var fromProfile = profilePlan();
    if (fromProfile) return fromProfile;
    if (localPlan === null) localPlan = ls('sq_plan');
    if (PLANS[localPlan]) return localPlan;
    if (ls('sq_all_access') === '1') return 'complete';
    return PREVIEW;
  }
  function plan() { return PLANS[current()]; }

  function emit() {
    var now = current();
    if (now === lastSeen) return;
    lastSeen = now;
    listeners.forEach(function (fn) { try { fn(now); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent('sq:plan-changed', { detail: now })); } catch (e) {}
  }

  function set(id) {
    if (!PLANS[id]) return false;
    localPlan = id;
    try { window.localStorage.setItem('sq_plan', id); } catch (e) {}
    if (window.SQAuth && window.SQAuth.setPlan) window.SQAuth.setPlan(id);
    emit();
    return true;
  }

  /* ---------- what is finished, and what that opens ----------
     A realm is done when its guardian has stepped aside. That is the
     signal that advances Basic's two-at-a-time window. */
  function isFinished(id) { return ls('sq_boss_' + id) === 'cleared'; }

  function frontier(section) {
    var list = REALMS.filter(function (r) { return r.section === section; });
    for (var i = 0; i < list.length; i++) if (!isFinished(list[i].id)) return list[i];
    return list[list.length - 1];        // the whole section is done
  }

  function allRealmsOpen() { return !!plan().openAll; }

  /* The realms a player may walk into right now. On Basic that is the
     frontier of each section plus everything already finished: ground
     you have cleared stays walkable, it just holds no new trials. */
  function openSet() {
    if (allRealmsOpen()) return REALMS.map(function (r) { return r.id; });
    var open = {};
    ['rw', 'math'].forEach(function (s) { open[frontier(s).id] = true; });
    REALMS.forEach(function (r) { if (isFinished(r.id)) open[r.id] = true; });
    return REALMS.filter(function (r) { return open[r.id]; }).map(function (r) { return r.id; });
  }

  function canEnter(id) {
    var r = BY_ID[id] || BY_HUB[id];
    if (!r) return true;                 // unknown realm: never gate by accident
    if (allRealmsOpen()) return true;
    return openSet().indexOf(r.id) !== -1;
  }

  function canPractice() { return !!plan().extraPractice; }

  /* ---------- the sentence that explains a closed realm ---------- */
  function lockNote(id) {
    var r = BY_ID[id] || BY_HUB[id];
    if (!r || canEnter(r.id)) return '';
    var open = frontier(r.section);
    return plan().name + ' keeps two realms open at a time, one in ' +
      SECTION_NAME.rw + ' and one in ' + SECTION_NAME.math + '. In ' +
      SECTION_NAME[r.section] + ' that is ' + open.name + ' right now, and ' +
      r.name + ' opens once its guardian steps aside. All Access opens all eight at once.';
  }

  /* ============================================================
     The wall: one cozy panel, three reasons to meet it
     ============================================================ */
  var wallEl = null;

  function copyFor(kind, id) {
    var r = BY_ID[id] || BY_HUB[id] || { name: 'That realm' };
    var open = r.section ? frontier(r.section) : null;
    if (kind === 'realm') {
      return {
        eyebrow: 'Resting for now',
        title: r.name + ' is closed for now.',
        body: lockNote(r.id) || (r.name + ' is not open on this plan yet.'),
        go: open ? { label: 'Head to ' + open.name, href: 'realm.html?realm=' + open.id } : null
      };
    }
    if (kind === 'practice') {
      return {
        eyebrow: 'Already cleared',
        title: 'That trial is behind you.',
        body: 'Walking a cleared trial again is extra practice, which All Access includes. ' +
          'On ' + plan().name + ' the path keeps going instead, and nothing you passed is lost.',
        go: null
      };
    }
    return {                                    // rematch
      eyebrow: 'Already cleared',
      title: 'The guardian has stepped aside.',
      body: 'Rematches are extra practice, which All Access includes. ' +
        'On ' + plan().name + ' the way onward is open instead.',
      go: null
    };
  }

  function buildWall() {
    wallEl = document.createElement('div');
    wallEl.className = 'sq-wall';
    wallEl.id = 'sq-wall';
    wallEl.hidden = true;
    wallEl.innerHTML =
      '<div class="sq-wall-card pixel-frame" role="dialog" aria-modal="true" aria-labelledby="sq-wall-title">' +
        '<button class="sq-wall-close" type="button" aria-label="Close">✕</button>' +
        '<p class="eyebrow type-utility sq-wall-eyebrow"></p>' +
        '<h2 class="sq-wall-title" id="sq-wall-title"></h2>' +
        '<p class="sq-wall-body"></p>' +
        '<div class="sq-wall-row">' +
          '<a class="btn btn-gold sq-wall-go" href="#"></a>' +
          '<a class="btn btn-outline sq-wall-grown" href="index.html#pricing">Show a grown-up</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wallEl);
    wallEl.querySelector('.sq-wall-close').addEventListener('click', function () { close(); });
    wallEl.addEventListener('click', function (e) { if (e.target === wallEl) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && wallEl && !wallEl.hidden) close();
    });
  }

  /* opts.realm  which realm the wall is about
     opts.go     { label, href } override for the primary button
     opts.firm   true = no close button, no backdrop dismiss (a real gate) */
  function wall(kind, opts) {
    opts = opts || {};
    if (!wallEl) buildWall();
    var c = copyFor(kind, opts.realm);
    var go = opts.go || c.go;
    wallEl.setAttribute('data-kind', kind);
    wallEl.querySelector('.sq-wall-eyebrow').textContent = c.eyebrow;
    wallEl.querySelector('.sq-wall-title').textContent = c.title;
    wallEl.querySelector('.sq-wall-body').textContent = c.body;
    var goBtn = wallEl.querySelector('.sq-wall-go');
    if (go) { goBtn.hidden = false; goBtn.href = go.href; goBtn.textContent = go.label; }
    else { goBtn.hidden = true; }
    wallEl.querySelector('.sq-wall-close').hidden = !!opts.firm;
    wallEl._firm = !!opts.firm;
    wallEl.hidden = false;
    window.__SQ_WALL = { kind: kind, realm: opts.realm || null, plan: current() };
    if (window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
    return wallEl;
  }

  function close() {
    if (!wallEl || wallEl.hidden || wallEl._firm) return;
    wallEl.hidden = true;
    window.__SQ_WALL = null;
  }

  /* ---------- where a trial becomes real ----------
     A Stripe payment link returns the buyer to success.html?plan=<id>. That
     round trip is the only thing in the browser allowed to name a plan on its
     own, and the page says out loud which one it recorded. */
  (function activateFromUrl() {
    if (!document.body || !document.body.classList.contains('page-success')) return;
    var want = new URLSearchParams(window.location.search).get('plan');
    if (PLANS[want]) set(want);
    var line = document.getElementById('suc-plan');
    if (!line || !PLANS[want]) return;
    line.textContent = 'Your plan: ' + plan().name + '. ' + (allRealmsOpen()
      ? 'All eight realms are open from the first day.'
      : 'Two realms stay open at a time, one in ' + SECTION_NAME.rw +
        ' and one in ' + SECTION_NAME.math + '.');
    line.hidden = false;
  })();

  /* a plan written to the profile after load must reach the gates */
  if (window.SQAuth && window.SQAuth.onChange) window.SQAuth.onChange(function () { emit(); });
  lastSeen = current();

  window.SQPlan = {
    REALMS: REALMS,
    PLANS: PLANS,
    byId: function (id) { return BY_ID[id] || BY_HUB[id] || null; },
    current: current,
    plan: plan,
    set: set,
    isFinished: isFinished,
    openSet: openSet,
    canEnter: canEnter,
    canPractice: canPractice,
    allRealmsOpen: allRealmsOpen,
    lockNote: lockNote,
    wall: wall,
    closeWall: close,
    onChange: function (fn) { listeners.push(fn); fn(current()); }
  };
})();
