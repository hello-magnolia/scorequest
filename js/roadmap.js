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

  var NODE_GAP = 118;      // vertical distance between node centers
  var HEADER_H = 96;       // segment banner space
  var PAD_BOTTOM = 46;
  var PATTERN = [0, 0.7, 1, 0.7, 0]; // serpentine offsets (x amplitude fraction)
  var AMP = 130;           // max horizontal offset at full width

  /* ---------- build segments ---------- */
  var segments = [];
  G.REALMS.forEach(function (r, idx) {
    var seg = document.createElement('section');
    seg.className = 'seg';
    seg.setAttribute('data-realm', r.id);
    seg.setAttribute('data-section', r.section);
    var height = HEADER_H + NODE_GAP * 5 + PAD_BOTTOM;
    seg.style.height = height + 'px';

    seg.innerHTML =
      '<canvas class="seg-bg" width="240" height="104" data-scene="' + r.scene + '" aria-hidden="true"></canvas>' +
      '<div class="seg-shade" aria-hidden="true"></div>' +
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

  /* ---------- serpentine layout + dotted connector ---------- */
  function layout() {
    var w = host.clientWidth || 640;
    var scale = Math.max(0.35, Math.min(1, (w - 150) / (AMP * 2)));
    segments.forEach(function (seg, sIdx) {
      var dir = sIdx % 2 === 0 ? 1 : -1; // alternate the snake direction per realm
      var cx = w / 2;
      var pts = [];
      seg.querySelectorAll('.rnode').forEach(function (node, i) {
        var x = cx + dir * PATTERN[i] * AMP * scale;
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
    var half = node.classList.contains('rnode-boss') ? 42 : 34;
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
    if (!spriteCtx || !PW || !PW.sprite) return;
    var pal = window.SQCharacter ? window.SQCharacter.palette() : null;
    PW.sprite.draw(spriteCtx, frame, pal);
  }
  window.addEventListener('sq-character', function () { drawSpriteFrame(0); });

  function buildSprite() {
    if (!PW || !PW.sprite) return;
    spriteEl = document.createElement('div');
    spriteEl.className = 'hero-sprite';
    spriteEl.innerHTML = '<canvas width="16" height="20"></canvas>';
    host.appendChild(spriteEl);
    spriteCtx = spriteEl.querySelector('canvas').getContext('2d');
    drawSpriteFrame(0);
    host.classList.add('has-sprite');

    var start = frontierNode();
    var p = nodeGlobalPos(start);
    spriteState = { node: start, x: p.x, y: p.y, walking: false, queue: [] };
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

  function walkTo(targetNode) {
    var fromIdx = allNodes.indexOf(spriteState.node);
    var toIdx = allNodes.indexOf(targetNode);
    if (toIdx === fromIdx) return;
    if (reduceMotion || toIdx < fromIdx) { // never moon-walk backwards; just appear
      var p = nodeGlobalPos(targetNode);
      spriteState.node = targetNode; spriteState.x = p.x; spriteState.y = p.y;
      placeSprite(p.x, p.y, 1);
      return;
    }
    // path through every node between here and there
    var pts = [{ x: spriteState.x, y: spriteState.y }];
    for (var i = fromIdx + 1; i <= toIdx; i++) {
      samplePath(pts[pts.length - 1], nodeGlobalPos(allNodes[i]), pts);
    }
    spriteState.node = targetNode;
    spriteState.walking = true;
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
      drawSpriteFrame(Math.floor(now / 130) % 2 + 1);
      if (t >= 1) {
        seg++;
        segStart = now;
        if (seg >= pts.length - 1) {
          spriteState.walking = false;
          drawSpriteFrame(0);
          return;
        }
      }
      requestAnimationFrame(step);
    })(performance.now());
  }

  function idleLoop(now) {
    if (spriteEl && !spriteState.walking) {
      var bob = Math.sin(now / 480) > 0 ? 0 : -2; // two-step pixel bob
      spriteEl.style.setProperty('--bob', bob + 'px');
    }
    requestAnimationFrame(idleLoop);
  }

  function updateSprite() {
    if (!spriteEl) return;
    var target = frontierNode();
    if (target !== spriteState.node && !spriteState.walking) walkTo(target);
  }

  // who's playing
  if (window.SQAuth) {
    window.SQAuth.onChange(function (st) {
      var line = document.getElementById('mappage-player');
      if (!line) return;
      var chr = window.SQCharacter && window.SQCharacter.get();
      var name = (chr && chr.name) || (st.user ? ((st.profile && st.profile.hero_name) || 'Hero') : null);
      line.hidden = !name;
      if (name) document.getElementById('mappage-player-name').textContent = name;
    });
  }

  layout();
  refresh();
  buildSprite();
  window.addEventListener('resize', function () {
    layout();
    if (spriteEl && !spriteState.walking) {
      var p = nodeGlobalPos(spriteState.node);
      spriteState.x = p.x; spriteState.y = p.y;
      placeSprite(p.x, p.y, 1);
    }
  });
  G.onChange(function () { refresh(); updateSprite(); });
})();
