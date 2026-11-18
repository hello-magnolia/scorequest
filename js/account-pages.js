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
    /* No email handle and no full_name fallback on teen surfaces: both are the
       player's real identity, which is exactly what a hero name is not. */
    var chr = window.SQCharacter && window.SQCharacter.get && window.SQCharacter.get();
    if (chr && chr.name) return chr.name;
    return 'Adventurer';
  }

  /* ---------- banner picker ---------- */
  var CDNB = 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/';
  /* [id, label, cdn-fallback]. Local files are preferred at every size:
     assets/banners/<id>.webp for the banner itself and
     assets/banners/thumbs/<id>.webp for the picker squares, falling back to
     the CDN original until download_assets.sh has been run. The thumbs are
     what keep the picker light: the CDN originals are full-resolution. */
  var BANNERS = [
    ['worldmap', 'The World', 'assets/worldmap.webp'],
    ['dusk', 'Dusk Sky', CDNB + 'hf_20260722_204121_0f39d345-6001-4220-b1c7-e3da085150e7.png'],
    ['night', 'Starry Night', CDNB + 'hf_20260722_204127_d9e239f0-4004-4abe-8d0e-7a81ed7423bb.png'],
    ['ocean', 'Twilight Ocean', CDNB + 'hf_20260722_204133_76a5ffcb-fb6f-40c5-a29a-93018d62e154.png'],
    ['meadow', 'Firefly Meadow', CDNB + 'hf_20260722_204139_5cb8fbc1-b765-4a35-9dcd-092fa891ace2.png'],
    ['mountains', 'Misty Mountains', CDNB + 'hf_20260722_204146_c66d4507-5f5d-4e50-a9bd-f86d2cd95062.png']
  ];
  function bannerSources(id, thumb) {
    var b = BANNERS[0];
    for (var i = 0; i < BANNERS.length; i++) if (BANNERS[i][0] === id) { b = BANNERS[i]; break; }
    if (b[0] === 'worldmap') return [b[2]];   // already local and small
    var list = [];
    if (thumb) list.push('assets/banners/thumbs/' + b[0] + '.webp');
    list.push('assets/banners/' + b[0] + '.webp');
    list.push(b[2]);   // CDN original, last resort
    return list;
  }
  /* Walk an img through candidate sources; each 404 advances to the next. */
  function imgFallback(img, sources) {
    var i = 0;
    img.onerror = function () { i += 1; if (i < sources.length) img.src = sources[i]; };
    img.src = sources[0];
  }
  function setupBanner() {
    var wrap = document.querySelector('.pf-banner');
    if (!wrap) return;
    var img = wrap.querySelector('img');
    var saved = null;
    try { saved = window.localStorage.getItem('sq_banner'); } catch (e) {}
    if (saved) imgFallback(img, bannerSources(saved, false));

    var btn = el('button', 'pf-banner-edit', 'Edit banner');
    btn.type = 'button';
    wrap.appendChild(btn);
    btn.addEventListener('click', function () {
      wrap.classList.add('is-editing');   // the banner dims while the picker is up
      var ov = el('div', 'un-overlay');
      var close = function () { ov.remove(); wrap.classList.remove('is-editing'); };
      var box = el('div', 'un-panel pixel-frame pf-bpick');
      box.appendChild(el('h3', 'pf-h3', 'Choose your banner'));
      var grid = el('div', 'pf-bgrid');
      var current = saved || 'worldmap';
      BANNERS.forEach(function (b) {
        var opt = el('button', 'pf-bopt' + (b[0] === current ? ' is-current' : ''));
        opt.type = 'button';
        var th = el('img', 'pf-bthumb');
        th.alt = b[1]; th.loading = 'lazy';
        imgFallback(th, bannerSources(b[0], true));
        opt.appendChild(th);
        opt.appendChild(el('span', 'pf-blabel type-utility', b[1]));
        opt.addEventListener('click', function () {
          try { window.localStorage.setItem('sq_banner', b[0]); } catch (e) {}
          saved = b[0];
          imgFallback(img, bannerSources(b[0], false));
          close();
        });
        grid.appendChild(opt);
      });
      box.appendChild(grid);
      var x = el('button', 'un-close', '\u00d7');
      x.type = 'button';
      x.setAttribute('aria-label', 'Close');
      x.addEventListener('click', close);
      box.appendChild(x);
      ov.appendChild(box);
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      document.body.appendChild(ov);
    });
  }

  /* ---------- skills: accuracy per domain and skill from the attempts ----------
     Every clash, practice and lair answer is recorded with its domain and skill
     (locally in sq_attempts, and in the Supabase attempts table when signed in).
     The panel folds them into one row per domain (realm) with the skills under it.
     Low-anxiety by design: no red, no "weak"; a skill is "Just started" until it has
     three answers, then it simply shows its hit rate and the last 10 as a strip. */
  var DOMAIN_REALM = { 'Information and Ideas': 'lorewood', 'Craft and Structure': 'storyforge', 'Standard English Conventions': 'syntaxcitadel',
    'Algebra': 'mirrormines', 'Expression of Ideas': 'inkreef', 'Problem-Solving and Data Analysis': 'datadocks',
    'Advanced Math': 'infinityisles', 'Geometry and Trigonometry': 'prismpeaks' };
  function localAttempts() {
    try { return JSON.parse(window.localStorage.getItem('sq_attempts') || '[]'); } catch (e) { return []; }
  }
  /* remote rows win when they exist (they are the record of truth); local rows fill in
     signed-out play. Both are merged by question_id + minute so a row recorded twice counts once. */
  function mergeAttempts(remote, local) {
    var seen = {}, out = [];
    (remote || []).concat(local || []).forEach(function (a) {
      if (!a || !a.domain) return;
      var k = a.question_id + '|' + String(a.created_at || '').slice(0, 16);
      if (seen[k]) return; seen[k] = true; out.push(a);
    });
    return out.sort(function (a, b) { return String(a.created_at).localeCompare(String(b.created_at)); });
  }
  function foldSkills(rows) {
    var doms = {};
    rows.forEach(function (a) {
      var d = doms[a.domain] || (doms[a.domain] = { domain: a.domain, n: 0, right: 0, skills: {}, last: [] });
      d.n++; if (a.correct) d.right++;
      var sk = d.skills[a.skill || 'General'] || (d.skills[a.skill || 'General'] = { skill: a.skill || 'General', n: 0, right: 0, last: [] });
      sk.n++; if (a.correct) sk.right++;
      sk.last.push(!!a.correct); if (sk.last.length > 10) sk.last.shift();
      d.last.push(!!a.correct); if (d.last.length > 10) d.last.shift();
    });
    return REALMS.map(function (r) {
      var name = Object.keys(DOMAIN_REALM).filter(function (k) { return DOMAIN_REALM[k] === r[0]; })[0];
      var d = doms[name];
      return { realm: r[0], realmName: r[1], short: r[2], domain: name, n: d ? d.n : 0, right: d ? d.right : 0,
        skills: d ? Object.keys(d.skills).map(function (k) { return d.skills[k]; }).sort(function (a, b) { return b.n - a.n; }) : [], last: d ? d.last : [] };
    });
  }
  function pct(right, n) { return n ? Math.round(right / n * 100) : 0; }
  function strip(last) {
    var s = el('span', 'pf-sk-strip'); s.setAttribute('aria-hidden', 'true');
    last.forEach(function (ok) { s.appendChild(el('i', ok ? 'is-hit' : '')); });
    return s;
  }
  function renderSkills(rows) {
    var host = document.getElementById('pf-skills');
    if (!host) return;
    host.innerHTML = '';
    var folded = foldSkills(rows), total = rows.length;
    if (!total) {
      var empty = el('p', 'pf-sk-empty', 'Answer a few questions in any realm and your skills will show up here.');
      host.appendChild(empty); return;
    }
    folded.forEach(function (d) {
      var row = el('details', 'pf-sk' + (d.n ? '' : ' is-quiet'));
      var sum = el('summary', 'pf-sk-head');
      var id = el('span', 'pf-sk-id');
      id.appendChild(el('span', 'pf-sk-realm', d.realmName));
      id.appendChild(el('span', 'pf-sk-domain type-utility', d.short));
      sum.appendChild(id);
      var meter = el('span', 'pf-sk-meter');
      var bar = el('span', 'pf-jbar pf-sk-bar'); var fill = el('span', 'pf-jbar-fill'); fill.style.width = pct(d.right, d.n) + '%'; bar.appendChild(fill);
      meter.appendChild(bar);
      meter.appendChild(el('span', 'pf-sk-pct type-utility', d.n ? pct(d.right, d.n) + '%' : 'Not yet'));
      meter.appendChild(el('span', 'pf-sk-n type-utility', d.n ? d.n + (d.n === 1 ? ' answer' : ' answers') : ''));
      sum.appendChild(meter);
      row.appendChild(sum);
      if (d.n) {
        var list = el('ul', 'pf-sk-list');
        d.skills.forEach(function (sk) {
          var li = el('li', 'pf-sk-item');
          li.appendChild(el('span', 'pf-sk-name', sk.skill));
          var right = el('span', 'pf-sk-right');
          right.appendChild(strip(sk.last));
          right.appendChild(el('span', 'pf-sk-pct type-utility', sk.n < 3 ? 'Just started' : pct(sk.right, sk.n) + '% of ' + sk.n));
          li.appendChild(right);
          list.appendChild(li);
        });
        row.appendChild(list);
        if (!host.querySelector('details[open]')) row.open = true;
      }
      host.appendChild(row);
    });
    window.__SQ_SKILLS = folded;
  }
  function loadSkills() {
    var local = localAttempts();
    renderSkills(mergeAttempts(null, local));
    if (window.SQAuth.fetchAttempts) {
      window.SQAuth.fetchAttempts().then(function (remote) { if (remote && remote.length) renderSkills(mergeAttempts(remote, local)); });
    }
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

    var list = document.getElementById('pf-realms');
    if (list) {
      list.innerHTML = '';
      REALMS.forEach(function (r) {
        var s = realmState(r[0]);
        var frac = s.boss ? 1 : Math.min(s.waypoints / r[3], 0.95);
        var untouched = !s.visited && !s.waypoints && !s.boss;
        var card = el('a', 'pf-jcard' + (s.boss ? ' is-cleared' : (untouched ? ' is-unexplored' : '')));
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
    var mot = document.getElementById('st-motion');
    if (mot) {
      var MOTIONS = ['full', 'calm', 'off'];
      var getMotion = function () {
        var m = null;
        try { m = window.localStorage.getItem('sq_motion'); } catch (e) {}
        if (MOTIONS.indexOf(m) >= 0) return m;
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full';
      };
      var paintMotion = function () { mot.textContent = 'Animations: ' + getMotion(); };
      mot.addEventListener('click', function () {
        var next = MOTIONS[(MOTIONS.indexOf(getMotion()) + 1) % MOTIONS.length];
        try { window.localStorage.setItem('sq_motion', next); } catch (e) {}
        paintMotion();
      });
      paintMotion();
    }
    var reset = document.getElementById('st-reset');
    if (reset) reset.addEventListener('click', function () {
      if (!window.confirm('Clear this device\u2019s local progress? Your account keeps everything synced to it; this only resets what this browser remembers.')) return;
      try {
        Object.keys(window.localStorage).forEach(function (k) {
          if (k.indexOf('sq_visited_') === 0 || k.indexOf('sq_realm_prog_') === 0 || k.indexOf('sq_boss_') === 0 || k.indexOf('sq_clash_') === 0) {
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
      if (page === 'profile') { renderProfile(state.user); setupBanner(); loadSkills(); }
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
