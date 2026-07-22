/* ---------------------------------------------------------------
   usernav.js: the signed-in header.
   When a player is logged in, the nav becomes: logo, Map, Parents,
   and an initial-circle on the right. The circle opens a small menu
   (Profile, Settings, Bookmarks, Sign out); the first three open a
   pixel-frame panel. Signed-out pages keep their marketing nav.
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var REALM_NAMES = {
    lorewood: 'Lorewood', storyforge: 'Story Forge', syntaxcitadel: 'Syntax Citadel',
    mirrormines: 'Mirror Mines', inkreef: 'Ink Reef', datadocks: 'Data Docks',
    infinityisles: 'Infinity Isles', prismpeaks: 'Prism Peaks'
  };
  var REALM_IDS = Object.keys(REALM_NAMES);

  function stats() {
    var out = { visited: 0, waypoints: 0, bosses: [], pct: 0 };
    REALM_IDS.forEach(function (id) {
      try {
        if (window.localStorage.getItem('sq_visited_' + id)) out.visited += 1;
        var wp = window.localStorage.getItem('sq_realm_prog_' + id);
        if (wp) out.waypoints += (JSON.parse(wp) || []).length;
        if (window.localStorage.getItem('sq_boss_' + id) === 'cleared') out.bosses.push(id);
      } catch (e) {}
    });
    out.pct = Math.round(out.bosses.length / REALM_IDS.length * 100);
    return out;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function joinDate(user) {
    try {
      var d = new Date(user.created_at);
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function heroName(state) {
    var p = window.SQAuth.getProfile && window.SQAuth.getProfile();
    if (p && p.hero_name) return p.hero_name;
    var u = window.SQAuth.getUser();
    return u && u.email ? u.email.split('@')[0] : 'Adventurer';
  }

  function build(user) {
    var inner = document.querySelector('.nav-inner');
    if (!inner || inner.querySelector('.un-avatar')) return;
    var links = inner.querySelector('.nav-links');
    var cta = inner.querySelector('.nav-cta');
    if (links) {
      links.innerHTML = '';
      links.appendChild(Object.assign(el('a', null, 'Map'), { href: 'map.html' }));
      links.appendChild(Object.assign(el('a', null, 'Parents'), { href: 'parents.html' }));
      links.classList.add('un-ready');
    }
    if (cta) { cta.innerHTML = ''; cta.classList.add('un-ready'); }

    var name = heroName();
    var av = el('button', 'un-avatar', name.charAt(0).toUpperCase());
    av.type = 'button';
    av.setAttribute('aria-label', 'Account menu');
    av.setAttribute('aria-haspopup', 'true');

    var menu = el('div', 'un-menu pixel-frame');
    menu.hidden = true;
    [['Profile', 'profile'], ['Settings', 'settings'], ['Bookmarks', 'bookmarks']].forEach(function (it) {
      var b = el('button', 'un-menu-item', it[0]);
      b.type = 'button';
      b.addEventListener('click', function () { closeMenu(); openPanel(it[1]); });
      menu.appendChild(b);
    });
    var out = el('button', 'un-menu-item un-menu-signout', 'Sign out');
    out.type = 'button';
    out.addEventListener('click', function () {
      window.SQAuth.signOut().then(function () { window.location.href = 'index.html'; });
    });
    menu.appendChild(out);

    var wrapEl = el('div', 'un-wrap');
    wrapEl.appendChild(av);
    wrapEl.appendChild(menu);
    (cta || inner).appendChild(wrapEl);

    function closeMenu() { menu.hidden = true; }
    av.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      if (!menu.hidden && window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
    });
    document.addEventListener('click', function (e) {
      if (!wrapEl.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeMenu(); closePanel(); }
    });
  }

  /* ---------- the panel: profile, settings, bookmarks ---------- */
  var panelEl = null;

  function closePanel() {
    if (panelEl) { panelEl.remove(); panelEl = null; }
  }

  function openPanel(tab) {
    closePanel();
    var user = window.SQAuth.getUser();
    if (!user) return;
    panelEl = el('div', 'un-overlay');
    var box = el('div', 'un-panel pixel-frame');
    var tabs = el('div', 'un-tabs');
    var body = el('div', 'un-body');
    var names = [['profile', 'Profile'], ['settings', 'Settings'], ['bookmarks', 'Bookmarks']];
    names.forEach(function (t) {
      var b = el('button', 'un-tab' + (t[0] === tab ? ' is-active' : ''), t[1]);
      b.type = 'button';
      b.addEventListener('click', function () { openPanel(t[0]); });
      tabs.appendChild(b);
    });
    var x = el('button', 'un-close', '\u00d7');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', closePanel);

    if (tab === 'profile') {
      var s = stats();
      body.appendChild(el('h3', 'un-name', heroName()));
      body.appendChild(el('p', 'un-line type-utility', user.email || ''));
      body.appendChild(el('p', 'un-line', 'Adventuring since ' + joinDate(user)));
      var barWrap = el('div', 'un-bar');
      var fill = el('div', 'un-bar-fill');
      fill.style.width = s.pct + '%';
      barWrap.appendChild(fill);
      body.appendChild(el('p', 'un-line', 'World completion: ' + s.pct + '% (' + s.bosses.length + ' of 8 guardians felled)'));
      body.appendChild(barWrap);
      body.appendChild(el('p', 'un-line', 'Waypoints cleared: ' + s.waypoints + ' \u00b7 Realms explored: ' + s.visited + ' of 8'));
      var chips = el('div', 'un-chips');
      if (s.bosses.length) {
        s.bosses.forEach(function (id) { chips.appendChild(el('span', 'un-chip', REALM_NAMES[id])); });
      } else {
        chips.appendChild(el('span', 'un-line un-dim', 'No lands completed yet. The guardians are waiting.'));
      }
      body.appendChild(el('p', 'un-line un-strong', 'Completed lands'));
      body.appendChild(chips);
    }

    if (tab === 'settings') {
      body.appendChild(el('p', 'un-line un-strong', 'Hero name'));
      var input = el('input', 'un-input');
      input.type = 'text';
      input.maxLength = 24;
      input.value = heroName();
      var save = el('button', 'btn btn-gold un-save', 'Save');
      save.type = 'button';
      save.addEventListener('click', function () {
        save.textContent = 'Saving\u2026';
        window.SQAuth.setHeroName(input.value).then(function (ok) {
          save.textContent = ok ? 'Saved' : 'Try again';
          setTimeout(function () { save.textContent = 'Save'; }, 1400);
        });
      });
      var row = el('div', 'un-row');
      row.appendChild(input);
      row.appendChild(save);
      body.appendChild(row);
      body.appendChild(el('p', 'un-line un-strong', 'Sound'));
      var snd = el('button', 'btn btn-outline', '');
      snd.type = 'button';
      function paintSnd() {
        var on = !window.SQSfx || window.SQSfx.enabled();
        snd.textContent = on ? 'Sound: on' : 'Sound: off';
      }
      snd.addEventListener('click', function () {
        if (!window.SQSfx) return;
        window.SQSfx.setEnabled(!window.SQSfx.enabled());
        paintSnd();
      });
      paintSnd();
      body.appendChild(snd);
    }

    if (tab === 'bookmarks') {
      body.appendChild(el('p', 'un-line', 'No bookmarked lessons yet.'));
      body.appendChild(el('p', 'un-line un-dim', 'Bookmarking arrives with the lesson library: any lesson you star will collect here for quick review.'));
    }

    box.appendChild(x);
    box.appendChild(tabs);
    box.appendChild(body);
    panelEl.appendChild(box);
    panelEl.addEventListener('click', function (e) { if (e.target === panelEl) closePanel(); });
    document.body.appendChild(panelEl);
  }

  function reveal() {
    /* safety valve: a stale token must never leave the nav hidden */
    ['.nav-links', '.nav-cta'].forEach(function (sel) {
      var n = document.querySelector(sel);
      if (n) n.classList.add('un-ready');
    });
  }
  function boot() {
    if (!window.SQAuth || !window.SQAuth.onChange) return setTimeout(reveal, 0);
    setTimeout(reveal, 2200);
    window.SQAuth.onChange(function (state) {
      if (state && state.user) build(state.user);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
