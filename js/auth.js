/* ============================================================
   ScoreQuest - auth + progress (Supabase)
   ------------------------------------------------------------
   Public surface (window.SQAuth):
     init()                       set up client, restore session, wire UI
     openModal() / closeModal()
     signInWithGoogle()
     signInWithEmail(email, pw)
     signUpWithEmail(email, pw, heroName)
     signOut()
     getUser()                    -> current user object or null
     onChange(fn)                 subscribe to auth-state changes
     saveProgress(patch)          merge+persist progress (realm XP, streak…)
     getProgress()                -> progress object

   Design notes:
   - The Supabase JS client is loaded from the official CDN in index.html.
   - If config is unfilled OR the CDN is unreachable, we fall back to
     DEMO MODE: same UI, progress kept in localStorage for the session,
     Google button explains it needs configuration. Nothing breaks.
   - No secrets here. The anon key is public by design; real protection
     comes from Row Level Security policies (supabase_setup.sql).
   ============================================================ */
(function () {
  'use strict';

  var cfg = window.SCOREQUEST_CONFIG || {};
  var configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf('__') !== 0 &&
    cfg.SUPABASE_ANON_KEY.indexOf('__') !== 0;

  var supabase = null;
  var listeners = [];
  var state = { user: null, profile: null, progress: defaultProgress(), demo: !configured };

  function defaultProgress() {
    return { xp: 0, streak: 0, realms: {}, updated_at: null };
  }

  /* ---------- client bootstrap ---------- */
  function makeClient() {
    if (!configured) return null;
    if (!window.supabase || !window.supabase.createClient) return null; // CDN blocked
    try {
      return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
    } catch (e) {
      console.warn('[ScoreQuest] Supabase client init failed, using demo mode.', e);
      return null;
    }
  }

  /* ---------- notify ---------- */
  function emit() { listeners.forEach(function (fn) { try { fn(state); } catch (e) {} }); }

  /* ---------- profile + progress persistence ---------- */
  function localKey() { return 'sq_demo_progress'; }

  function loadDemoProgress() {
    try {
      var raw = window.localStorage.getItem(localKey());
      if (raw) state.progress = JSON.parse(raw);
    } catch (e) {}
  }
  function saveDemoProgress() {
    try { window.localStorage.setItem(localKey(), JSON.stringify(state.progress)); } catch (e) {}
  }

  function fetchProfile() {
    if (!supabase || !state.user) return Promise.resolve();
    return supabase
      .from('profiles')
      .select('hero_name, xp, streak, realms, updated_at')
      .eq('id', state.user.id)
      .single()
      .then(function (res) {
        if (res.data) {
          state.profile = { hero_name: res.data.hero_name };
          state.progress = {
            xp: res.data.xp || 0,
            streak: res.data.streak || 0,
            realms: res.data.realms || {},
            updated_at: res.data.updated_at,
          };
        }
        syncRealms();
      })
      .catch(function () { /* row may not exist yet; trigger creates it */ });
  }

  /* ---------- game <-> account sync ----------
     The game pages read and write plain localStorage keys
     (sq_visited_<id>, sq_realm_prog_<id>, sq_boss_<id>). This layer
     mirrors those keys into profiles.realms and back, unioned, so
     progress follows the account across devices. */
  var REALM_IDS = ['lorewood', 'storyforge', 'syntaxcitadel', 'mirrormines',
    'inkreef', 'datadocks', 'infinityisles', 'prismpeaks'];
  function readLocalRealm(id) {
    var out = {};
    try {
      if (window.localStorage.getItem('sq_visited_' + id)) out.visited = true;
      var wp = window.localStorage.getItem('sq_realm_prog_' + id);
      if (wp) out.waypoints = JSON.parse(wp);
      if (window.localStorage.getItem('sq_boss_' + id) === 'cleared') out.boss = 'cleared';
    } catch (e) {}
    return out;
  }
  function mergeRealm(x, y) {
    x = x || {}; y = y || {};
    var out = {};
    if (x.visited || y.visited) out.visited = true;
    var wp = {};
    (x.waypoints || []).concat(y.waypoints || []).forEach(function (n) { wp[n] = true; });
    var list = Object.keys(wp).map(Number);
    if (list.length) out.waypoints = list;
    if (x.boss === 'cleared' || y.boss === 'cleared') out.boss = 'cleared';
    return out;
  }
  function writeLocalRealm(id, r) {
    if (!r) return;
    try {
      if (r.visited) window.localStorage.setItem('sq_visited_' + id, '1');
      if (r.waypoints && r.waypoints.length)
        window.localStorage.setItem('sq_realm_prog_' + id, JSON.stringify(r.waypoints));
      if (r.boss === 'cleared') window.localStorage.setItem('sq_boss_' + id, 'cleared');
    } catch (e) {}
  }
  function syncRealms() {
    var realms = state.progress.realms || {};
    var merged = {};
    REALM_IDS.forEach(function (id) {
      merged[id] = mergeRealm(realms[id], readLocalRealm(id));
      writeLocalRealm(id, merged[id]);
    });
    saveProgress({ realms: merged });
    try { document.dispatchEvent(new CustomEvent('sq:progress-synced')); } catch (e) {}
  }
  function reportRealm(id) {
    var realms = Object.assign({}, state.progress.realms || {});
    realms[id] = mergeRealm(realms[id], readLocalRealm(id));
    saveProgress({ realms: realms });
  }

  /* ---------- public: save progress ---------- */
  function saveProgress(patch) {
    state.progress = Object.assign({}, state.progress, patch || {});
    state.progress.updated_at = new Date().toISOString();
    emit();
    if (state.demo || !supabase || !state.user) { saveDemoProgress(); return Promise.resolve(); }
    return supabase
      .from('profiles')
      .update({
        xp: state.progress.xp,
        streak: state.progress.streak,
        realms: state.progress.realms,
        updated_at: state.progress.updated_at,
      })
      .eq('id', state.user.id)
      .then(function () {});
  }

  /* ---------- auth actions ---------- */
  function mapUrl() {
    return window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'map.html';
  }
  function enterWorld() {
    // after a successful login / hero creation, drop the player onto the map
    window.__SQ_LAST_REDIRECT = 'map.html';
    if (window.__SQ_NO_REDIRECT) return;                       // test hook
    if (document.body.classList.contains('page-map')) return;  // already there
    window.location.href = 'map.html';
  }
  function redirectTarget() {
    // OAuth round-trip lands the player on the world map
    return mapUrl();
  }

  function signInWithGoogle() {
    if (!supabase) return demoNotice('Google sign-in needs Supabase configured (js/config.js).');
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTarget() },
    });
  }

  function signUpWithEmail(email, pw, heroName) {
    if (!supabase) return demoLogin(heroName || email.split('@')[0]);
    return supabase.auth
      .signUp({
        email: email,
        password: pw,
        options: { data: { hero_name: heroName || email.split('@')[0] }, emailRedirectTo: redirectTarget() },
      })
      .then(function (res) {
        handleAuthResult(res);
        if (res.data && res.data.session) enterWorld();
        return res;
      });
  }

  function signInWithEmail(email, pw) {
    if (!supabase) return demoLogin(email.split('@')[0]);
    return supabase.auth.signInWithPassword({ email: email, password: pw }).then(function (res) {
      handleAuthResult(res);
      if (res.data && res.data.session) enterWorld();
      return res;
    });
  }

  function handleAuthResult(res) {
    if (res.error) throw res.error;
    return res;
  }

  function signOut() {
    try { window.localStorage.removeItem('sq_all_access'); } catch (e) {}
    if (supabase && state.user) supabase.auth.signOut();
    state.user = null; state.profile = null; state.progress = defaultProgress();
    if (state.demo) { try { window.localStorage.removeItem(localKey()); } catch (e) {} }
    emit();
  }

  /* ---------- test as new user: a clean first run, every time ---------- */
  function testAsNewUser() {
    // wipe all first-run state so the intro cinematic and character builder
    // play again exactly as a brand-new player would see them
    try {
      window.localStorage.removeItem('sq_intro_seen');
      window.localStorage.removeItem('sq_character');
      window.localStorage.removeItem('sq_demo_progress');
      window.localStorage.setItem('sq_all_access', '1'); // full paid capabilities
    } catch (e) {}
    demoLogin('Tester');
    // already on the map? reload so the intro actually replays
    if (!window.__SQ_NO_REDIRECT && document.body.classList.contains('page-map')) {
      window.location.reload();
    }
  }

  /* ---------- demo mode helpers ---------- */
  function demoLogin(name) {
    state.demo = true;
    state.user = { id: 'demo', email: name + '@demo', demo: true };
    state.profile = { hero_name: name };
    loadDemoProgress();
    emit();
    closeModal();
    enterWorld();
    return Promise.resolve({ demo: true });
  }
  function demoNotice(msg) {
    var el = document.getElementById('auth-msg');
    if (el) { el.textContent = msg; el.hidden = false; }
    return Promise.resolve({ demo: true, notice: msg });
  }

  /* ---------- session restore ---------- */
  function restore() {
    if (!supabase) { // demo mode: restore a demo session if one exists
      loadDemoProgress();
      emit();
      return Promise.resolve();
    }
    return supabase.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (session && session.user) {
        state.user = session.user;
        state.profile = { hero_name: (session.user.user_metadata || {}).hero_name };
        return fetchProfile().then(emit);
      }
      emit();
    });
  }

  /* ============================================================
     UI - pixel "Choose your hero" modal + nav state
     ============================================================ */
  var modal;

  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'auth-overlay';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="auth-card pixel-frame" role="dialog" aria-modal="true" aria-labelledby="auth-title">' +
        '<button class="auth-close" aria-label="Close">\u2715</button>' +
        '<p class="eyebrow type-utility auth-eyebrow">Enter the world</p>' +
        '<h2 id="auth-title" class="auth-title" data-mode="in">Choose your hero</h2>' +
        '<button class="btn btn-google btn-block auth-google">' +
          '<span class="g-mark" aria-hidden="true">G</span> Continue with Google</button>' +
        '<button class="btn btn-outline btn-block auth-guest">Test as new user (replays the intro)</button>' +
        '<div class="auth-or"><span>or</span></div>' +
        '<label class="auth-field auth-heroname" hidden><span class="type-utility">Hero name</span>' +
          '<input type="text" autocomplete="nickname" maxlength="24" placeholder="e.g. Nightscholar" /></label>' +
        '<label class="auth-field"><span class="type-utility">Email</span>' +
          '<input type="email" autocomplete="email" placeholder="you@example.com" /></label>' +
        '<label class="auth-field"><span class="type-utility">Password</span>' +
          '<input type="password" autocomplete="current-password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" /></label>' +
        '<p class="auth-msg" id="auth-msg" hidden></p>' +
        '<button class="btn btn-gold btn-block auth-submit">Begin the quest</button>' +
        '<p class="auth-switch">New here? <button class="auth-toggle" type="button">Create a hero</button></p>' +
        (state.demo
          ? '<p class="auth-demo type-utility">Demo mode \u00b7 add Supabase keys in js/config.js to save real accounts</p>'
          : '') +
      '</div>';
    document.body.appendChild(modal);

    var card = modal.querySelector('.auth-card');
    var titleEl = modal.querySelector('.auth-title');
    var heroField = modal.querySelector('.auth-heroname');
    var emailInput = modal.querySelector('input[type="email"]');
    var pwInput = modal.querySelector('input[type="password"]');
    var heroInput = heroField.querySelector('input');
    var submit = modal.querySelector('.auth-submit');
    var toggle = modal.querySelector('.auth-toggle');
    var switchLine = modal.querySelector('.auth-switch');
    var msg = modal.querySelector('#auth-msg');
    var mode = 'in'; // 'in' | 'up'

    function setMode(m) {
      mode = m;
      msg.hidden = true;
      if (m === 'up') {
        titleEl.textContent = 'Create your hero';
        heroField.hidden = false;
        submit.textContent = 'Create hero';
        pwInput.setAttribute('autocomplete', 'new-password');
        switchLine.innerHTML = 'Already have a hero? <button class="auth-toggle" type="button">Log in</button>';
      } else {
        titleEl.textContent = 'Choose your hero';
        heroField.hidden = true;
        submit.textContent = 'Begin the quest';
        pwInput.setAttribute('autocomplete', 'current-password');
        switchLine.innerHTML = 'New here? <button class="auth-toggle" type="button">Create a hero</button>';
      }
      switchLine.querySelector('.auth-toggle').addEventListener('click', function () {
        setMode(mode === 'in' ? 'up' : 'in');
      });
    }

    function fail(e) {
      msg.textContent = (e && e.message) ? e.message : 'Something went wrong. Try again.';
      msg.hidden = false;
      submit.disabled = false;
    }

    modal.querySelector('.auth-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

    modal.querySelector('.auth-google').addEventListener('click', function () {
      signInWithGoogle().catch(fail);
    });

    modal.querySelector('.auth-guest').addEventListener('click', function () {
      testAsNewUser();
    });

    submit.addEventListener('click', function () {
      var email = emailInput.value.trim(), pw = pwInput.value;
      if (!email || !pw) { msg.textContent = 'Enter an email and password.'; msg.hidden = false; return; }
      if (pw.length < 6) { msg.textContent = 'Password needs at least 6 characters.'; msg.hidden = false; return; }
      submit.disabled = true; msg.hidden = true;
      var action = mode === 'up'
        ? signUpWithEmail(email, pw, heroInput.value.trim())
        : signInWithEmail(email, pw);
      action.then(function (res) {
        submit.disabled = false;
        if (res && res.data && res.data.user && !res.data.session) {
          // email-confirm flow
          msg.textContent = 'Check your email to confirm your hero, then log in.';
          msg.hidden = false;
        } else if (!res || !res.notice) {
          closeModal();
        }
      }).catch(fail);
    });

    switchLine.querySelector('.auth-toggle').addEventListener('click', function () {
      setMode(mode === 'in' ? 'up' : 'in');
    });

    modal._setMode = setMode;
  }

  function openModal(mode) {
    if (!modal) buildModal();
    if (mode && modal._setMode) modal._setMode(mode);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = modal.querySelector('input[type="email"]');
    if (first) setTimeout(function () { first.focus(); }, 30);
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------- nav CTA reflects auth state ---------- */
  function wireNav() {
    var navCta = document.querySelector('.nav-cta');
    if (!navCta) return;
    function render() {
      if (state.user) {
        var name = (state.profile && state.profile.hero_name) || 'Hero';
        navCta.innerHTML =
          '<span class="hero-badge type-utility" title="Signed in">\u2726 ' + escapeHtml(name) + '</span>' +
          '<button class="btn btn-outline btn-signout">Log out</button>';
        navCta.querySelector('.btn-signout').addEventListener('click', signOut);
      } else {
        navCta.innerHTML =
          '<button class="btn btn-ghost btn-login">Log in</button>' +
          '<button class="btn btn-gold btn-start">Start free</button>';
        navCta.querySelector('.btn-login').addEventListener('click', function () { openModal('in'); });
        navCta.querySelector('.btn-start').addEventListener('click', function () { openModal('up'); });
      }
    }
    listeners.push(render);
    render();

    // hero + pricing CTAs also open the modal
    document.querySelectorAll('a[href="#pricing"].btn-gold, .btn-gold.btn-block, .outro .btn-gold').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (state.user) return; // already in; let it scroll
        e.preventDefault();
        openModal('up');
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- init ---------- */
  function init() {
    supabase = makeClient();
    state.demo = !supabase;
    buildModal();
    wireNav();
    if (supabase) {
      supabase.auth.onAuthStateChange(function (_evt, session) {
        state.user = session ? session.user : null;
        if (state.user) {
          state.profile = { hero_name: (state.user.user_metadata || {}).hero_name };
          fetchProfile().then(emit);
        } else {
          state.progress = defaultProgress();
          emit();
        }
      });
    }
    restore();
  }

  window.SQAuth = {
    init: init,
    openModal: openModal,
    closeModal: closeModal,
    signInWithGoogle: signInWithGoogle,
    signInWithEmail: signInWithEmail,
    signUpWithEmail: signUpWithEmail,
    signOut: signOut,
    getUser: function () { return state.user; },
    getProfile: function () { return state.profile; },
    setHeroName: function (name) {
      name = String(name || '').trim().slice(0, 24);
      if (!name || !state.user || !supabase) return Promise.resolve(false);
      return supabase.from('profiles').update({ hero_name: name }).eq('id', state.user.id)
        .then(function () {
          state.profile = Object.assign({}, state.profile, { hero_name: name });
          emit();
          return true;
        })
        .catch(function () { return false; });
    },
    getProgress: function () { return state.progress; },
    saveProgress: saveProgress,
    reportRealm: reportRealm,
    onChange: function (fn) { listeners.push(fn); fn(state); },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
