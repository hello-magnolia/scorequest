/* ---------------------------------------------------------------
   account-pages.js: fills the profile, settings, and bookmarks
   pages with the signed-in player's real data. Pages carry static
   skeletons; this script brings them to life once SQAuth resolves.
   Visitors without a session are sent home.
   --------------------------------------------------------------- */
(function () {
  'use strict';

  /* fourth field: how many waypoint trials the realm holds (from realm.js) */
  var REALMS = [
    ['lorewood', 'Lorewood', 'Information & Ideas', 4],
    ['storyforge', 'Story Forge', 'Craft & Structure', 7],
    ['syntaxcitadel', 'Syntax Citadel', 'Conventions', 6],
    ['mirrormines', 'Mirror Mines', 'Algebra', 5],
    ['inkreef', 'Ink Reef', 'Expression of Ideas', 6],
    ['datadocks', 'Data Docks', 'Problem-Solving & Data', 5],
    ['infinityisles', 'Infinity Isles', 'Advanced Math', 6],
    ['prismpeaks', 'Prism Peaks', 'Geometry & Trigonometry', 6]
  ];

  function realmState(id) {
    var out = { visited: false, waypoints: 0, boss: false };
    try {
      out.visited = !!window.localStorage.getItem('sq_visited_' + id);
      var wp = window.localStorage.getItem('sq_realm_prog_' + id);
      if (wp) out.waypoints = (JSON.parse(wp) || []).length;
      out.boss = window.localStorage.getItem('sq_boss_' + id) === 'cleared';
    } catch (e) {}
    return out;
  }

  function totals() {
    var t = { visited: 0, waypoints: 0, bosses: 0 };
    REALMS.forEach(function (r) {
      var s = realmState(r[0]);
      if (s.visited || s.waypoints || s.boss) t.visited += 1;
      t.waypoints += s.waypoints;
      if (s.boss) t.bosses += 1;
    });
    return t;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function put(id, text) {
    var n = document.getElementById(id);
    if (n && text != null) n.textContent = text;
  }

  function heroName() {
    var p = window.SQAuth.getProfile && window.SQAuth.getProfile();
    if (p && p.hero_name) return p.hero_name;
    var u = window.SQAuth.getUser();
    return u && u.email ? u.email.split('@')[0] : 'Adventurer';
  }

  /* ---------- profile ---------- */
  function renderProfile(user) {
    var name = heroName();
    var p = (window.SQAuth.getProfile && window.SQAuth.getProfile()) || {};
    var t = totals();
    var pct = Math.round(t.bosses / REALMS.length * 100);
    var level = 1 + t.bosses + Math.floor((p.xp || 0) / 100);

    put('pf-name', name);
    var av = document.getElementById('pf-avatar');
    if (av) av.textContent = name.charAt(0).toUpperCase();
    put('pf-email', user.email || '');
    try {
      put('pf-joined', 'Joined ' + new Date(user.created_at)
        .toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
    } catch (e) {}
    put('pf-counts', t.visited + ' realms explored \u00b7 ' + t.waypoints +
      ' waypoints \u00b7 ' + t.bosses + ' guardians felled');

    var list = document.getElementById('pf-realms');
    if (list) {
      list.innerHTML = '';
      REALMS.forEach(function (r) {
        var s = realmState(r[0]);
        var frac = s.boss ? 1 : Math.min(s.waypoints / r[3], 0.95);
        var card = el('a', 'pf-jcard' + (s.boss ? ' is-cleared' : ''));
        card.href = 'realm.html?realm=' + r[0];
        var art = el('div', 'pf-jcard-art');
        art.style.backgroundImage = "url('assets/realms/thumbs/" + r[0] + ".webp')";
        card.appendChild(art);
        var body = el('div', 'pf-jcard-body');
        var idc = el('div', 'pf-jcard-id');
        idc.appendChild(el('span', 'pf-jcard-name', r[1]));
        idc.appendChild(el('span', 'pf-jcard-domain type-utility', r[2]));
        body.appendChild(idc);
        var bar = el('div', 'pf-jbar');
        var bfill = el('div', 'pf-jbar-fill');
        bfill.style.width = Math.round(frac * 100) + '%';
        bar.appendChild(bfill);
        body.appendChild(bar);
        card.appendChild(body);
        var badge = el('div', 'pf-jbadge' + (s.boss ? ' is-earned' : ''));
        badge.textContent = s.boss ? '\u2605' : '';
        badge.setAttribute('aria-label', s.boss ? r[1] + ' badge earned' : r[1] + ' badge not yet earned');
        card.appendChild(badge);
        list.appendChild(card);
      });
    }

    put('hc-name', name);
    put('hc-level', 'Level ' + level);
    put('hc-xp', String(p.xp || 0));
    put('hc-streak', String(p.streak || 0));

    var ach = document.getElementById('pf-ach');
    if (ach) {
      ach.innerHTML = '';
      [
        ['First steps', 'Enter your first realm', t.visited >= 1],
        ['Trailblazer', 'Clear ten waypoints', t.waypoints >= 10],
        ['Guardian slayer', 'Fell your first guardian', t.bosses >= 1],
        ['Halfway there', 'Fell four guardians', t.bosses >= 4],
        ['World conqueror', 'Fell all eight guardians', t.bosses >= 8]
      ].forEach(function (a) {
        var row = el('div', 'pf-ach' + (a[2] ? ' is-earned' : ''));
        row.appendChild(el('span', 'pf-ach-mark', a[2] ? '\u2605' : '\u2606'));
        var body = el('div', null);
        body.appendChild(el('div', 'pf-ach-name', a[0]));
        body.appendChild(el('div', 'pf-ach-how type-utility', a[1]));
        row.appendChild(body);
        ach.appendChild(row);
      });
    }
  }

  /* ---------- settings ---------- */
  function renderSettings(user) {
    var input = document.getElementById('st-name');
    if (input) input.value = heroName();
    put('st-email', user.email || '');
    var save = document.getElementById('st-save');
    if (save) save.addEventListener('click', function () {
      save.textContent = 'Saving\u2026';
      window.SQAuth.setHeroName(input.value).then(function (ok) {
        save.textContent = ok ? 'Saved' : 'Try again';
        setTimeout(function () { save.textContent = 'Save name'; }, 1500);
      });
    });
    var snd = document.getElementById('st-sound');
    if (snd) {
      var paint = function () {
        var on = !window.SQSfx || window.SQSfx.enabled();
        snd.textContent = on ? 'Sound: on' : 'Sound: off';
      };
      snd.addEventListener('click', function () {
        if (!window.SQSfx) return;
        window.SQSfx.setEnabled(!window.SQSfx.enabled());
        paint();
      });
      paint();
    }
    var reset = document.getElementById('st-reset');
    if (reset) reset.addEventListener('click', function () {
      if (!window.confirm('Clear this device\u2019s local progress? Your account keeps everything synced to it; this only resets what this browser remembers.')) return;
      try {
        Object.keys(window.localStorage).forEach(function (k) {
          if (k.indexOf('sq_visited_') === 0 || k.indexOf('sq_realm_prog_') === 0 || k.indexOf('sq_boss_') === 0) {
            window.localStorage.removeItem(k);
          }
        });
      } catch (e) {}
      reset.textContent = 'Cleared';
      setTimeout(function () { reset.textContent = 'Reset local progress'; }, 1500);
    });
    var out = document.getElementById('st-signout');
    if (out) out.addEventListener('click', function () {
      window.SQAuth.signOut().then(function () { window.location.href = 'index.html'; });
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    try {
      if (!window.localStorage.getItem('sb-moasnmwcikwybriwaoip-auth-token')) {
        window.location.href = 'index.html';
        return;
      }
    } catch (e) {}
    if (!window.SQAuth || !window.SQAuth.onChange) return;
    var rendered = false;
    window.SQAuth.onChange(function (state) {
      if (!state || !state.user || rendered) return;
      rendered = true;
      var page = document.body.getAttribute('data-account-page');
      if (page === 'profile') renderProfile(state.user);
      if (page === 'settings') renderSettings(state.user);
    });
    setTimeout(function () {
      if (!rendered && !(window.SQAuth.getUser && window.SQAuth.getUser())) {
        window.location.href = 'index.html';
      }
    }, 5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
