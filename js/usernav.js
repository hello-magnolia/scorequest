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
    [['Profile', 'profile.html'], ['Settings', 'settings.html'], ['Bookmarks', 'bookmarks.html']].forEach(function (it) {
      var a2 = el('a', 'un-menu-item', it[0]);
      a2.href = it[1];
      menu.appendChild(a2);
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
      if (e.key === 'Escape') closeMenu();
    });
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
