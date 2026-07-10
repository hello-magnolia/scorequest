/* ============================================================
   ScoreQuest - the World Map roadmap (student-facing)
   ------------------------------------------------------------
   A winding path of quest nodes descending through all 8 biomes.
   Original pixel-RPG treatment of the classic lesson-path pattern:
   - Each realm is a segment: biome canvas backdrop, banner header,
     five nodes (levels 1-4 + a boss node) on a serpentine path.
   - Node states come straight from SQGame.realmState:
       completed  -> gold, check
       current    -> biome accent, pulsing START tag, clickable
       locked     -> dimmed with lock
       boss       -> larger node at the segment's end
   - Clicking a playable node opens the shared quest drawer
     (window.SQQuest from map.js); XP advances the path live.
   ============================================================ */
(function () {
  'use strict';
  var host = document.getElementById('roadmap');
  if (!host || !window.SQGame) return;
  var G = window.SQGame;
  var PW = window.PixelWorld;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var NODE_GAP = 132;      // vertical distance between node centers
  var HEADER_H = 108;      // segment banner space
  var PAD_BOTTOM = 60;
  var PATTERN = [0, 0.7, 1, 0.7, 0]; // serpentine offsets (x amplitude fraction)

  /* ---------- build segments ---------- */
  var segments = [];
  G.REALMS.forEach(function (r, idx) {
    var seg = document.createElement('section');
    seg.className = 'seg';
    seg.setAttribute('data-realm', r.id);
    seg.setAttribute('data-section', r.section);
    var height = HEADER_H + NODE_GAP * 5 + PAD_BOTTOM;
    seg.style.height = height + 'px';

    var sparks = '';
    for (var sp = 0; sp < 7; sp++) {
      sparks += '<span class="spark' + (sp % 3 === 2 ? ' spark-mint' : '') + '" style="left:' +
        (6 + Math.random() * 88) + '%;top:' + (12 + Math.random() * 80) + '%;animation-delay:' +
        (Math.random() * 6).toFixed(2) + 's;animation-duration:' + (5 + Math.random() * 5).toFixed(2) + 's"></span>';
    }
    seg.innerHTML =
      '<div class="seg-media" aria-hidden="true">' +
        '<canvas class="seg-bg" width="240" height="104" data-scene="' + r.scene + '"></canvas>' +
        '<img class="seg-art" hidden alt="" />' +
      '</div>' +
      '<div class="seg-shade" aria-hidden="true"></div>' +
      '<div class="seg-sparks" aria-hidden="true">' + sparks + '</div>' +
      '<svg class="seg-trail" aria-hidden="true"></svg>' +
      '<header class="seg-head">' +
        '<span class="seg-index type-utility">Realm ' + String(idx + 1).padStart(2, '0') + '</span>' +
        '<h2 class="seg-name">' + r.name + '</h2>' +
        '<span class="seg-domain type-utility">' + r.domain + '</span>' +
        '<span class="seg-level type-utility"></span>' +
        '<span class="seg-flag" aria-hidden="true"></span>' +
      '</header>';

    // five nodes: levels 1-4 plus the boss
    for (var i = 0; i < 5; i++) {
      var boss = i === 4;
      var node = document.createElement('button');
      node.className = 'rnode' + (boss ? ' rnode-boss' : '');
      node.setAttribute('data-realm', r.id);
      node.setAttribute('data-step', String(i));
      node.innerHTML =
        '<span class="rnode-icon" data-biome="' + r.id + '" aria-hidden="true"></span>' +
        '<span class="rnode-tag type-utility">' + (boss ? 'BOSS' : String(i + 1)) + '</span>' +
        '<span class="rnode-start type-utility" aria-hidden="true">START</span>';
      node.addEventListener('click', (function (id) {
        return function () {
          if (this.classList.contains('is-locked')) return;
          if (window.SQSfx) window.SQSfx.realmTap(id);
          if (window.SQQuest) window.SQQuest.open(id);
        };
      })(r.id));
      seg.appendChild(node);
    }

    host.appendChild(seg);
    segments.push(seg);
  });

  /* ---------- biome backdrops (canvas, animated while visible) ---------- */
  segments.forEach(function (seg) {
    var cv = seg.querySelector('.seg-bg');
    var scene = PW && PW.scenes[cv.getAttribute('data-scene')];
    if (!scene) return;
    var ctx = cv.getContext('2d');
    scene.draw(ctx, scene.w, scene.h, 2);
    if (reduceMotion) return;
    var visible = true, start = performance.now();
    (function loop(now) {
      if (visible) scene.draw(ctx, scene.w, scene.h, (now - start) / 1000);
      requestAnimationFrame(loop);
    })(performance.now());
    if (typeof IntersectionObserver === 'function') {
      visible = false;
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { rootMargin: '120px' }).observe(seg);
    }
  });

  /* ---------- generated realm art: local -> CDN -> live canvas ---------- */
  segments.forEach(function (seg) {
    var r = G.byId(seg.getAttribute('data-realm'));
    var img = seg.querySelector('.seg-art');
    var sources = [r.art, r.cdn].filter(Boolean);
    if (!sources.length) return;
    var i = 0;
    img.onerror = function () { if (i < sources.length) img.src = sources[i++]; else img.hidden = true; };
    img.onload = function () { img.hidden = false; seg.classList.add('has-art'); };
    img.src = sources[i++];
  });

  /* ---------- parallax: backdrops drift slower than the path ---------- */
  var parallaxTick = false;
  function parallax() {
    parallaxTick = false;
    if (reduceMotion) return;
    var vh = window.innerHeight || 800;
    segments.forEach(function (seg) {
      var rect = seg.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80) return;
      var offset = ((rect.top + rect.height / 2) - vh / 2) * 0.07;
      seg.querySelector('.seg-media').style.transform = 'translateY(' + offset.toFixed(1) + 'px)';
    });
  }
  window.addEventListener('scroll', function () {
    if (!parallaxTick) { parallaxTick = true; requestAnimationFrame(parallax); }
  }, { passive: true });

  /* ---------- serpentine layout + dotted connector ---------- */
  function layout() {
    var w = host.clientWidth || 640;
    var amp = Math.max(90, Math.min(240, (w - 260) / 2)); // fill the frame
    segments.forEach(function (seg, sIdx) {
      var dir = sIdx % 2 === 0 ? 1 : -1; // alternate the snake direction per realm
      var cx = w / 2;
      var pts = [];
      seg.querySelectorAll('.rnode').forEach(function (node, i) {
        var x = cx + dir * PATTERN[i] * amp;
        var y = HEADER_H + 30 + i * NODE_GAP;
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        pts.push([x, y]);
      });
      // dotted trail through the node centers
      var svg = seg.querySelector('.seg-trail');
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + seg.clientHeight);
      var d = 'M ' + pts[0][0] + ' ' + pts[0][1];
      for (var i = 1; i < pts.length; i++) {
        var midY = (pts[i - 1][1] + pts[i][1]) / 2;
        d += ' C ' + pts[i - 1][0] + ' ' + midY + ', ' + pts[i][0] + ' ' + midY + ', ' + pts[i][0] + ' ' + pts[i][1];
      }
      svg.innerHTML = '<path d="' + d + '" class="seg-trail-path"/>';
    });
  }

  /* ---------- states from the progression engine ---------- */
  function refresh() {
    var s = G.getState();
    var rank = document.getElementById('world-rank');
    if (rank) rank.textContent = 'Lv ' + s.totalLevel;

    segments.forEach(function (seg) {
      var id = seg.getAttribute('data-realm');
      var st = s.realms[id];
      seg.classList.toggle('seg-locked', !st.unlocked);
      seg.classList.toggle('seg-cleared', st.cleared);
      seg.querySelector('.seg-level').textContent =
        st.cleared ? '\u2605 Conquered' : 'Lv ' + st.level + ' \u00b7 ' + st.pct + '%';

      seg.querySelectorAll('.rnode').forEach(function (node, i) {
        var step = i + 1; // node i represents reaching level i+1 -> boss completes Lv5
        var completed = st.cleared || st.level > step;
        var current = st.unlocked && !st.cleared && st.level === step;
        node.classList.toggle('is-done', completed);
        node.classList.toggle('is-current', current);
        node.classList.toggle('is-locked', !st.unlocked || (!completed && !current));
        node.disabled = !st.unlocked || (!completed && !current);
      });
    });
  }

  /* ============================================================
     THE ADVENTURER: your hero sprite stands at the frontier node
     and walks the trail when progress moves it forward.
     ============================================================ */
  var allNodes = [];
  segments.forEach(function (seg) {
    seg.querySelectorAll('.rnode').forEach(function (n) { allNodes.push(n); });
  });

  var spriteEl = null, spriteCtx = null, spriteState = null;

  function nodeGlobalPos(node) {
    var seg = node.closest('.seg');
    var half = node.classList.contains('rnode-boss') ? 48 : 38;
    return {
      x: parseFloat(node.style.left) || 0,
      y: seg.offsetTop + (parseFloat(node.style.top) || 0) - half + 4, // feet on the node's top edge
    };
  }

  function frontierNode() {
    for (var i = 0; i < allNodes.length; i++) {
      if (allNodes[i].classList.contains('is-current')) return allNodes[i];
    }
    return allNodes[allNodes.length - 1]; // everything conquered: rest at the final boss
  }

  function drawSpriteFrame(frame) {
    if (!spriteCtx || !window.SQCompanion) return;
    window.SQCompanion.draw(spriteCtx, frame);
  }

  function buildSprite() {
    if (!window.SQCompanion) return;
    spriteEl = document.createElement('div');
    spriteEl.className = 'companion-sprite';
    spriteEl.innerHTML = '<canvas width="' + window.SQCompanion.w + '" height="' + window.SQCompanion.h + '"></canvas>';
    spriteEl.style.width = (window.SQCompanion.w * 3) + 'px';
    spriteEl.style.height = (window.SQCompanion.h * 3) + 'px';
    host.appendChild(spriteEl);
    spriteCtx = spriteEl.querySelector('canvas').getContext('2d');
    drawSpriteFrame(0);
    spriteEl.addEventListener('click', function () {
      if (spriteState.walking) return;
      if (!spriteState.flop) {
        spriteState.flop = 'down';
        spriteState.flopStart = performance.now();
        if (window.SQSfx) window.SQSfx.flop();
      } else if (spriteState.flop === 'flat') {
        spriteState.flop = 'up';
        spriteState.flopStart = performance.now();
        if (window.SQSfx) window.SQSfx.uiTick();
      }
    });
    host.classList.add('has-sprite');

    var start = frontierNode();
    var p = nodeGlobalPos(start);
    spriteState = { node: start, x: p.x, y: p.y, walking: false, sitting: false,
      idleSince: performance.now(), nextBlink: performance.now() + 2600 };
    window.__SQ_SPRITE = spriteState;
    placeSprite(p.x, p.y, 1);
    if (!reduceMotion) requestAnimationFrame(idleLoop);
  }

  function placeSprite(x, y, facing) {
    spriteEl.style.left = x + 'px';
    spriteEl.style.top = y + 'px';
    spriteEl.style.setProperty('--facing', facing);
  }

  /* sample the same curve the trail uses between two points */
  function samplePath(a, b, out) {
    var steps = 14, midY = (a.y + b.y) / 2;
    for (var s = 1; s <= steps; s++) {
      var t = s / steps, mt = 1 - t;
      var x = mt*mt*mt*a.x + 3*mt*mt*t*a.x + 3*mt*t*t*b.x + t*t*t*b.x;
      var y = mt*mt*mt*a.y + 3*mt*mt*t*midY + 3*mt*t*t*midY + t*t*t*b.y;
      out.push({ x: x, y: y });
    }
  }

  function walkTo(targetNode, onArrive) {
    var fromIdx = allNodes.indexOf(spriteState.node);
    var toIdx = allNodes.indexOf(targetNode);
    if (toIdx === fromIdx) { if (onArrive) onArrive(); return; }
    if (reduceMotion || toIdx < fromIdx) { // never moon-walk backwards; just appear
      var p = nodeGlobalPos(targetNode);
      spriteState.node = targetNode; spriteState.x = p.x; spriteState.y = p.y;
      placeSprite(p.x, p.y, 1);
      if (onArrive) onArrive();
      return;
    }
    // path through every node between here and there
    var pts = [{ x: spriteState.x, y: spriteState.y }];
    for (var i = fromIdx + 1; i <= toIdx; i++) {
      samplePath(pts[pts.length - 1], nodeGlobalPos(allNodes[i]), pts);
    }
    spriteState.node = targetNode;
    spriteState.walking = true;
    spriteState.sitting = false;
    spriteState.flop = null;
    var seg = 0, segStart = performance.now();
    var SPEED = 170; // px per second

    (function step(now) {
      if (!spriteState.walking) return;
      var a = pts[seg], b = pts[seg + 1];
      var dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      var t = Math.min(1, (now - segStart) / (dist / SPEED * 1000));
      var x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      var facing = b.x >= a.x ? 1 : -1;
      spriteState.x = x; spriteState.y = y;
      placeSprite(x, y, facing);
      drawSpriteFrame(Math.floor(now / 140) % 2 + 1);
      if (t >= 1) {
        seg++;
        segStart = now;
        if (seg >= pts.length - 1) {
          spriteState.walking = false;
          spriteState.idleSince = performance.now();
          drawSpriteFrame(0);
          if (onArrive) onArrive();
          return;
        }
      }
      requestAnimationFrame(step);
    })(performance.now());
  }

  var SIT_AFTER = 3200;
  function flopFrames(now) {
    var ft = now - spriteState.flopStart;
    if (spriteState.flop === 'down') {
      if (ft >= 720) { spriteState.flop = 'flat'; return 12; }
      return ft < 240 ? 9 : ft < 480 ? 10 : 11;
    }
    if (spriteState.flop === 'up') {
      if (ft >= 660) {
        spriteState.flop = null;
        spriteState.idleSince = now - SIT_AFTER; // resume seated, grazing soon
        return 4;
      }
      return ft < 220 ? 11 : ft < 440 ? 10 : 9;
    }
    // flat: naps with slow breathing
    spriteEl.style.setProperty('--cbob', (Math.sin(now / 950) > 0 ? 0 : -1) + 'px');
    return 12;
  }
  function idleLoop(now) {
    if (spriteEl && !spriteState.walking) {
      if (spriteState.flop) {
        drawSpriteFrame(flopFrames(now));
      } else if (now - spriteState.idleSince > SIT_AFTER) {
        // the graze sequence: sit upright, bend down for a mouthful,
        // come up chewing, and bend again when the mouthful runs out
        if (!spriteState.sitting) spriteState.sitting = true;
        spriteEl.style.setProperty('--cbob', '0px');
        var e = now - spriteState.idleSince - SIT_AFTER;
        var f;
        if (e < 800) f = 4;                       // sit upright, settle in
        else {
          // half-bend down -> graze at the ground -> half-bend up -> chew
          var t = (e - 800) % (320 + 700 + 280 + 6200);
          if (t < 320) f = 5;                     // dipping
          else if (t < 320 + 700) f = 6;          // grazing at the ground
          else if (t < 320 + 700 + 280) f = 5;    // coming back up
          else f = 7 + (Math.floor((t - 1300) / 420) % 2); // chewing (savor it)
        }
        drawSpriteFrame(f);
      } else {
        var bob = Math.sin(now / 560) > 0 ? 0 : -1.5; // slow capybara bob
        spriteEl.style.setProperty('--cbob', bob + 'px');
        if (now >= spriteState.nextBlink) {
          drawSpriteFrame(3);
          spriteState.nextBlink = now + 2400 + Math.random() * 2200;
          setTimeout(function () { if (!spriteState.walking && !spriteState.sitting) drawSpriteFrame(0); }, 170);
        }
      }
    }
    requestAnimationFrame(idleLoop);
  }

  var lockedBefore = [];
  function updateSprite() {
    if (!spriteEl) return;
    var target = frontierNode();
    if (target === spriteState.node || spriteState.walking) return;
    // hold the destination in a locked look while the capybara makes the trip
    var forward = allNodes.indexOf(target) > allNodes.indexOf(spriteState.node);
    var seg = target.closest('.seg');
    if (forward && !reduceMotion) {
      target.classList.add('is-pending');
      if (lockedBefore.indexOf(seg) !== -1) seg.classList.add('seg-pending');
    }
    walkTo(target, function () {
      target.classList.remove('is-pending');
      seg.classList.remove('seg-pending');
      if (forward && !reduceMotion) {
        target.classList.add('node-wake');
        setTimeout(function () { target.classList.remove('node-wake'); }, 550);
        if (window.SQSfx) window.SQSfx.realmTap(seg.getAttribute('data-realm'));
      }
      setTimeout(updateSprite, 350); // catch up if the frontier moved again meanwhile
    });
  }

  // who's playing — from the name given to Pomelo, else the auth profile
  if (window.SQAuth) {
    var lastAuth = {};
    var refreshPlayer = function () {
      var line = document.getElementById('mappage-player');
      if (!line) return;
      var chr = window.SQCharacter && window.SQCharacter.get();
      var name = (chr && chr.name) || (lastAuth.user ? ((lastAuth.profile && lastAuth.profile.hero_name) || 'Hero') : null);
      line.hidden = !name;
      if (name) document.getElementById('mappage-player-name').textContent = name;
    };
    window.SQAuth.onChange(function (st) { lastAuth = st; refreshPlayer(); });
    window.addEventListener('sq-character', refreshPlayer);
  }

  // sound preference toggle
  var soundBtn = document.getElementById('sound-toggle');
  if (soundBtn && window.SQSfx) {
    function soundLabel() { soundBtn.textContent = 'Sound: ' + (window.SQSfx.enabled() ? 'on' : 'off'); }
    soundLabel();
    soundBtn.addEventListener('click', function () { window.SQSfx.toggle(); soundLabel(); if (window.SQSfx.enabled()) window.SQSfx.tap(2); });
  }

  var musicBtn = document.getElementById('music-toggle');
  if (musicBtn && window.SQMusic) {
    function musicLabel() { musicBtn.textContent = 'Music: ' + (window.SQMusic.enabled() ? 'on' : 'off'); }
    musicLabel();
    musicBtn.addEventListener('click', function () { window.SQMusic.toggle(); musicLabel(); });
  }

  /* ---------- Mango, waiting at the end of the path ---------- */
  var mangoEl = null, mangoCtx = null;
  var mango = { mode: 'sit', t0: 0, nextScratch: 0 };

  function buildMango() {
    if (!window.SQMango) return;
    mangoEl = document.createElement('div');
    mangoEl.className = 'mango-sprite';
    mangoEl.setAttribute('aria-label', 'A small capybara, waiting');
    mangoEl.innerHTML = '<canvas width="' + window.SQMango.w + '" height="' + window.SQMango.h + '"></canvas>';
    mangoEl.style.width = (window.SQMango.w * 2) + 'px';
    mangoEl.style.height = (window.SQMango.h * 2) + 'px';
    host.appendChild(mangoEl);
    mangoCtx = mangoEl.querySelector('canvas').getContext('2d');
    window.SQMango.draw(mangoCtx, 0);
    mango.nextScratch = performance.now() + 9000 + Math.random() * 6000;
    window.__SQ_MANGO = mango;
    placeMango();
    mangoEl.addEventListener('click', function () {
      if (mango.mode !== 'sit') return;
      mango.mode = 'turn';
      mango.t0 = performance.now();
      if (window.SQSfx) window.SQSfx.uiTick();
    });
    if (!reduceMotion) requestAnimationFrame(mangoLoop);
  }

  function placeMango() {
    if (!mangoEl) return;
    var lastSeg = segments[segments.length - 1];
    var nodes = lastSeg.querySelectorAll('.rnode');
    var boss = nodes[nodes.length - 1];
    mangoEl.style.left = ((parseFloat(boss.style.left) || 0) + 110) + 'px';
    mangoEl.style.top = (lastSeg.offsetTop + (parseFloat(boss.style.top) || 0) + 44) + 'px';
  }

  function mangoLoop(now) {
    if (mangoEl) {
      var f = 0;
      if (mango.mode === 'turn') {
        // turns its back on you, holds, then turns around again
        var e = now - mango.t0;
        if (e < 260) f = 1;
        else if (e < 2700) f = 2;
        else if (e < 2960) f = 1;
        else { mango.mode = 'sit'; mango.nextScratch = now + 6000 + Math.random() * 6000; }
      } else if (mango.mode === 'scratch') {
        var e2 = now - mango.t0;
        if (e2 < 180) f = 5;
        else if (e2 < 1280) f = Math.floor((e2 - 180) / 150) % 2 + 3; // scratch-scratch
        else if (e2 < 1460) f = 5;
        else { mango.mode = 'sit'; mango.nextScratch = now + 9000 + Math.random() * 8000; }
      } else if (now >= mango.nextScratch) {
        mango.mode = 'scratch';
        mango.t0 = now;
      }
      window.SQMango.draw(mangoCtx, f);
    }
    requestAnimationFrame(mangoLoop);
  }

  layout();
  refresh();
  buildSprite();
  buildMango();
  window.addEventListener('resize', function () {
    layout();
    placeMango();
    if (spriteEl && !spriteState.walking) {
      var p = nodeGlobalPos(spriteState.node);
      spriteState.x = p.x; spriteState.y = p.y;
      placeSprite(p.x, p.y, 1);
    }
  });
  // if the quest drawer is open, hold the journey until Return to map:
  // the destination keeps its locked look, and the walk begins on close
  var walkDeferred = false;
  function questDrawerOpen() {
    var d = document.querySelector('.quest-overlay');
    return !!(d && !d.hidden);
  }
  function stagePendingOnly() {
    if (!spriteEl || reduceMotion) return;
    var target = frontierNode();
    if (target === spriteState.node) return;
    if (allNodes.indexOf(target) <= allNodes.indexOf(spriteState.node)) return;
    target.classList.add('is-pending');
    var seg = target.closest('.seg');
    if (lockedBefore.indexOf(seg) !== -1) seg.classList.add('seg-pending');
  }
  G.onChange(function () {
    lockedBefore = segments.filter(function (sg) { return sg.classList.contains('seg-locked'); });
    refresh();
    if (questDrawerOpen()) {
      walkDeferred = true;
      stagePendingOnly();
    } else {
      updateSprite();
    }
  });
  window.addEventListener('sq-quest-closed', function () {
    if (walkDeferred) { walkDeferred = false; updateSprite(); }
  });
})();
