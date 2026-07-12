/* ============================================================
   ScoreQuest — realm walkabout v2: paths, markers, editor
   ------------------------------------------------------------
   Movement is now a polyline: each realm may carry `path` — a
   list of [x, y] waypoints normalized to world width/height —
   and Pomelo walks ALONG it: down stairs, across terraces,
   up to the shrine. Taps project to the nearest point on the
   path; node markers sit on it and light up as he reaches them.
   Realms without a path fall back to a flat ground line (the
   same polyline machinery with two points).

   PATH EDITOR — realm.html?realm=<id>&edit=1
   The path in this file for Lorewood is an educated guess made
   without seeing the art; the editor exists so a human can trace
   the truth. In edit mode: click along the walkable path from
   left to right to drop waypoints (the line draws as you go),
   press N (or the Markers button) to switch to dropping node
   markers, Z undoes, C clears. "Save preview" stores the trace in
   localStorage so removing &edit=1 walks it immediately; "Copy
   JSON" yields the snippet to commit into REALMS below.

   If the art fails to load entirely (expired placeholder CDN),
   the realm stays functional on a dark stage with a synthetic
   world width — walkable, editable, just invisible.
   ============================================================ */
(function () {
  'use strict';
  if (!document.body.classList.contains('page-realm')) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01';

  var REALMS = [
    { id: 'lorewood', name: 'Lorewood', domain: 'Information & Ideas',
      boss: 'The shrine doors are sealed. Whatever twists the old texts is waiting behind them.',
      img: ['assets/realms/lorewood.png', CDN + '/hf_20260711_215833_948a0475-28db-41fa-94bf-14fca55664f1.png'],
      /* band-verified against the render: upper terrace (0.35) -> stairs -> terrace 2
         (0.51) -> stairs -> main torii walk (0.665) -> stairs up -> shrine steps */
      path: [[0.03, 0.345], [0.125, 0.352], [0.185, 0.358], [0.232, 0.368],
             [0.285, 0.50], [0.33, 0.512], [0.395, 0.52],
             [0.455, 0.652], [0.55, 0.665], [0.62, 0.675], [0.70, 0.665], [0.735, 0.66],
             [0.792, 0.55], [0.838, 0.545], [0.852, 0.515]],
      nodes: [[0.10, 0.35], [0.33, 0.51], [0.55, 0.663], [0.64, 0.673], [0.82, 0.545]] },
    { id: 'storyforge', name: 'Story Forge', domain: 'Craft & Structure', ground: 0.80,
      boss: 'The forge-hall doors are barred. Inside, something is bolting itself together in the wrong order.',
      img: ['assets/realms/storyforge.png', CDN + '/hf_20260711_230052_cd161907-7401-47e7-a33c-42b70abe3904.png'] },
    { id: 'inkreef', name: 'Ink Reef', domain: 'Expression of Ideas', ground: 0.82,
      boss: 'The grotto is dark with drifting ink. The water will not clear on its own.',
      img: ['assets/realms/inkreef.png', CDN + '/hf_20260711_230540_3f451865-ff4e-41ca-a71a-fe4aacf6705a.png'] },
    { id: 'syntaxcitadel', name: 'Syntax Citadel', domain: 'Conventions', ground: 0.80,
      boss: 'The keep gate opens only for a complete sentence. The one on the throne is in pieces.',
      img: ['assets/realms/syntaxcitadel.png', CDN + '/hf_20260711_232640_5add5ec2-516c-4675-b10c-7c7242441029.png'] },
    { id: 'mirrormines', name: 'Mirror Mines', domain: 'Algebra', ground: 0.81,
      boss: 'The mirror chamber. Whatever is done on one side happens on the other.',
      img: ['assets/realms/mirrormines.png', CDN + '/hf_20260711_233112_1b52ca12-d9d4-4d93-99c7-8ad6befb0545.png'] },
    { id: 'infinityisles', name: 'Infinity Isles', domain: 'Advanced Math', ground: 0.78,
      boss: 'The archway hums. Something on the far side keeps doubling.',
      img: ['assets/realms/infinityisles.png', CDN + '/hf_20260712_030318_cb25b618-de99-4606-abc4-0c021da75913.png'] },
    { id: 'datadocks', name: 'Data Docks', domain: 'Problem-Solving & Data', ground: 0.80,
      boss: 'The gangplank is up. The captain\u2019s charts never quite add up.',
      img: ['assets/realms/datadocks.png', CDN + '/hf_20260712_000405_578c3562-4fdd-4209-9609-3de599f599d3.png'] },
    { id: 'prismpeaks', name: 'Prism Peaks', domain: 'Geometry & Trigonometry', ground: 0.80, vertical: true,
      boss: 'The nest at the summit. You know who it belongs to \u2014 and who is waiting in it.',
      img: ['assets/realms/prismpeaks.png', CDN + '/hf_20260712_030734_4484dc45-3614-4e52-9af2-b4813c9f6499.png'] }
  ];

  var params = new URLSearchParams(window.location.search);
  var idx = Math.max(0, REALMS.findIndex(function (r) { return r.id === params.get('realm'); }));
  var realm = REALMS[idx];
  var editing = params.get('edit') === '1';
  var PREVIEW_KEY = 'sq_realm_trace_' + realm.id;

  // a human-saved trace beats the manifest — but say so, and offer a way back
  var traceOverride = false;
  try {
    var saved = JSON.parse(window.localStorage.getItem(PREVIEW_KEY));
    if (saved && (saved.path || saved.nodes)) {
      realm = Object.assign({}, realm);
      if (saved.path && saved.path.length >= 2) realm.path = saved.path;
      if (saved.nodes) realm.nodes = saved.nodes;
      traceOverride = true;
    }
  } catch (e) {}

  var stage = document.getElementById('rw-stage');
  var world = document.getElementById('rw-world');
  var bg = document.getElementById('rw-bg');
  var door = document.getElementById('rw-door');
  var capy = document.getElementById('rw-capy');
  var veil = document.getElementById('rw-veil');
  var hint = document.getElementById('rw-hint');
  var popup = document.getElementById('rw-popup');
  var trace = document.getElementById('rw-trace');

  /* ---------- HUD ---------- */
  document.title = realm.name + ', ScoreQuest';
  document.getElementById('rw-title').textContent = realm.name;
  document.getElementById('rw-meta').textContent =
    'Realm ' + (idx + 1) + ' of ' + REALMS.length + ' \u00B7 ' + realm.domain;
  if (traceOverride) {
    var metaEl = document.getElementById('rw-meta');
    metaEl.appendChild(document.createTextNode(' \u00B7 custom trace '));
    var clearLink = document.createElement('a');
    clearLink.href = '#';
    clearLink.className = 'rw-trace-clear';
    clearLink.textContent = '(clear)';
    clearLink.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      try { window.localStorage.removeItem(PREVIEW_KEY); } catch (err) {}
      window.location.reload();
    });
    metaEl.appendChild(clearLink);
  }
  var prev = document.getElementById('rw-prev');
  var next = document.getElementById('rw-next');
  if (idx > 0) prev.href = 'realm.html?realm=' + REALMS[idx - 1].id;
  else prev.classList.add('is-off');
  if (idx < REALMS.length - 1) next.href = 'realm.html?realm=' + REALMS[idx + 1].id;
  else next.classList.add('is-off');
  document.getElementById('rw-popup-text').textContent = realm.boss;
  var popupNext = document.getElementById('rw-popup-next');
  if (idx < REALMS.length - 1) {
    popupNext.href = 'realm.html?realm=' + REALMS[idx + 1].id;
    popupNext.textContent = 'Onward to ' + REALMS[idx + 1].name + ' \u2192';
  } else {
    popupNext.hidden = true;
  }

  /* ---------- world & path state ---------- */
  var stageW = 0, stageH = 0, worldW = 0, worldH = 0;
  var capyW = 0, capyH = 0;
  var ready = false, bossShown = false, prefetched = false;
  var facing = 1, walking = false, keyDir = 0;

  // the path as normalized points -> pixel polyline with cumulative arc length
  var norm = realm.path && realm.path.length >= 2
    ? realm.path.slice()
    : [[0.02, realm.ground || 0.8], [0.98, realm.ground || 0.8]];
  var pts = [], cum = [], totalLen = 0;
  var sPos = 0, sTarget = 0;
  var nodeEls = [];

  function buildPolyline() {
    pts = norm.map(function (p) { return [p[0] * worldW, p[1] * worldH]; });
    cum = [0];
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    totalLen = cum[cum.length - 1] || 1;
  }
  function pointAt(s) {
    s = Math.min(Math.max(s, 0), totalLen);
    for (var i = 1; i < pts.length; i++) {
      if (s <= cum[i]) {
        var t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
        return {
          x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
          y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
          dx: pts[i][0] - pts[i - 1][0]
        };
      }
    }
    var last = pts[pts.length - 1];
    return { x: last[0], y: last[1], dx: 1 };
  }
  // nearest arc-length position on the polyline to a world-space point
  function nearestS(x, y) {
    var best = 0, bestD = Infinity;
    for (var i = 1; i < pts.length; i++) {
      var ax = pts[i - 1][0], ay = pts[i - 1][1];
      var bx = pts[i][0], by = pts[i][1];
      var vx = bx - ax, vy = by - ay;
      var L2 = vx * vx + vy * vy || 1;
      var t = Math.min(Math.max(((x - ax) * vx + (y - ay) * vy) / L2, 0), 1);
      var px = ax + vx * t, py = ay + vy * t;
      var d = (x - px) * (x - px) + (y - py) * (y - py);
      if (d < bestD) { bestD = d; best = cum[i - 1] + Math.sqrt(L2) * t; }
    }
    return best;
  }

  function placeCapy() {
    var p = pointAt(sPos);
    capy.style.left = Math.round(p.x - capyW / 2) + 'px';
    capy.style.top = Math.round(p.y - capyH * FEET) + 'px';
    return p;
  }

  function renderNodes() {
    nodeEls.forEach(function (el) { el.remove(); });
    nodeEls = [];
    (realm.nodes || []).forEach(function (n, i) {
      var el = document.createElement('div');
      el.className = 'rw-node';
      el.setAttribute('data-node', i + 1);
      world.appendChild(el);
      nodeEls.push(el);
    });
  }
  function layoutNodes() {
    (realm.nodes || []).forEach(function (n, i) {
      var el = nodeEls[i];
      if (!el) return;
      el.style.left = Math.round(n[0] * worldW) + 'px';
      el.style.top = Math.round(n[1] * worldH) + 'px';
    });
  }
  function visitNodes() {
    var p = pointAt(sPos);
    (realm.nodes || []).forEach(function (n, i) {
      var el = nodeEls[i];
      if (!el || el.classList.contains('is-visited')) return;
      var dx = n[0] * worldW - p.x, dy = n[1] * worldH - p.y;
      if (dx * dx + dy * dy < (capyW * 0.6) * (capyW * 0.6)) {
        el.classList.add('is-visited');
        if (window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
      }
    });
  }


  var ctx = null;
  try { ctx = capy.getContext('2d'); } catch (e) {}
  var FEET = 44 / 45; // the drawn feet row within the padded canvas height
  function drawCapy(frame) {
    if (!ctx || !window.SQCompanion) return;
    // some tween frames paint outside the 43x39 box, so clear the WHOLE
    // canvas under identity first — otherwise slivers persist as stray lines
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, capy.width, capy.height);
    if (facing === 1) ctx.setTransform(1, 0, 0, 1, 3, 6);
    else ctx.setTransform(-1, 0, 0, 1, 54, 6);   // mirror within the padded canvas
    window.SQCompanion.draw(ctx, frame);
  }

  /* ---------- click-to-flop: tap him, he naps ----------
     Frames 9-12 tween relaxed sit -> recline -> lying -> fully flat.
     Tap him again (or ask him to walk) and he gets back up first. */
  var flop = null; // null | 'down' | 'flat' | 'up'
  var flopTimers = [];
  function setFlop(v) { flop = v; window.__SQ_REALM_FLOP = v; }
  function clearFlopTimers() { flopTimers.forEach(clearTimeout); flopTimers = []; }
  function playSeq(frames, ms, done) {
    var i = 0;
    (function step() {
      if (i >= frames.length) { if (done) done(); return; }
      drawCapy(frames[i]);
      i += 1;
      flopTimers.push(setTimeout(step, ms));
    })();
  }
  function flopDown() {
    clearFlopTimers();
    setFlop('down');
    sTarget = sPos;                       // he is going nowhere
    if (window.SQSfx && window.SQSfx.step) window.SQSfx.step();
    if (reduceMotion) { drawCapy(12); setFlop('flat'); return; }
    playSeq([9, 10, 11, 12], 140, function () { setFlop('flat'); });
  }
  function flopUp(then) {
    clearFlopTimers();
    setFlop('up');
    if (reduceMotion) { drawCapy(0); setFlop(null); idleT = 0; idleStep = 0; if (then) then(); return; }
    playSeq([11, 10, 9, 0], 120, function () {
      setFlop(null);
      idleT = 0; idleStep = 0;
      if (then) then();
    });
  }
  function capyHit(wx, wy) {
    var p = pointAt(sPos);
    var left = p.x - capyW / 2 - 8;
    var top = p.y - capyH * FEET - 8;
    return wx >= left && wx <= left + capyW + 16 && wy >= top && wy <= top + capyH + 16;
  }

  function layout() {
    stageW = stage.clientWidth || 960;
    stageH = stage.clientHeight || 540;
    worldH = stageH;
    worldW = bg.naturalWidth
      ? Math.round(bg.naturalWidth / bg.naturalHeight * worldH)
      : Math.round(stageH * 21 / 9);          // synthetic width when art is missing
    world.style.width = worldW + 'px';
    capyW = capy.clientWidth || 120;
    capyH = capy.clientHeight || Math.round(capyW * 45 / 57);
    buildPolyline();
    var end = pts[pts.length - 1];
    door.style.left = Math.round(Math.min(end[0], worldW - stageW * 0.16)) + 'px';
    door.style.top = Math.round(end[1] - stageH * 0.30) + 'px';
    layoutNodes();
    drawTrace();
  }

  function camera() {
    var p = pointAt(sPos);
    var camX = Math.min(Math.max(p.x - stageW * 0.42, 0), Math.max(0, worldW - stageW));
    world.style.transform = 'translate3d(' + (-camX) + 'px,0,0)';
    return camX;
  }

  function begin() {
    renderNodes();
    layout();
    sPos = nearestS(worldW * 0.05, pointAt(0).y);
    sTarget = sPos;
    placeCapy();
    drawCapy(0);
    camera();
    ready = true;
    veil.classList.add('is-gone');
    if (editing) enterEditor();
  }

  (function loadArt() {
    var srcs = realm.img.slice();
    var i = 0;
    bg.onerror = function () {
      if (i < srcs.length) { bg.src = srcs[i++]; return; }
      bg.remove();                              // dark stage, still walkable
      begin();
    };
    bg.onload = begin;
    bg.src = srcs[i++];
  })();

  function prefetchNext() {
    if (prefetched || idx >= REALMS.length - 1) return;
    prefetched = true;
    var srcs = REALMS[idx + 1].img.slice();
    var im = new Image();
    var i = 0;
    im.onerror = function () { if (i < srcs.length) im.src = srcs[i++]; };
    im.src = srcs[i++];
  }

  /* ---------- input ---------- */
  function worldPoint(e) {
    var p = pointAt(sPos);
    var camX = Math.min(Math.max(p.x - stageW * 0.42, 0), Math.max(0, worldW - stageW));
    return { x: e.clientX + camX, y: e.clientY };
  }
  stage.addEventListener('click', function (e) {
    if (e.target.closest('.rw-hud') || e.target.closest('.rw-popup') || e.target.closest('.rw-editor')) return;
    if (!ready) return;
    var w = worldPoint(e);
    if (editing) { editorClick(w); return; }
    if (!popup.hidden) { popup.hidden = true; return; }
    if (capyHit(w.x, w.y)) {                       // tapping him toggles the flop
      if (flop === 'flat') flopUp();
      else if (!flop) flopDown();
      return;
    }
    if (flop) {                                    // asked to walk while napping: up first
      var wakeTarget = nearestS(w.x, w.y);
      if (flop === 'flat') flopUp(function () { sTarget = wakeTarget; });
      return;
    }
    sTarget = nearestS(w.x, w.y);
    hint.classList.add('is-gone');
  });
  document.addEventListener('keydown', function (e) {
    if (editing) { editorKey(e); return; }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyDir = 1;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyDir = -1;
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || /^[adAD]$/.test(e.key)) keyDir = 0;
  });
  window.addEventListener('resize', function () { if (ready) { layout(); placeCapy(); camera(); } });

  /* ---------- the walk (arc-length along the polyline) ---------- */
  var lastT = 0, stepT = 0, walkFrame = 1, idleT = 0, idleStep = 0;
  // stand, blink, and every so often settle in for a proper graze:
  // sit -> crouch -> graze -> chew, chew, a little more grass, back up
  // one-shot idle: stand and blink, settle in, ONE dip for grass, then chew
  // for a very long time (42 slow jaws, ~23s), and finally sit — and stay
  // sitting until asked to move. No second dip: chewing ends in rest.
  var IDLE = [
    [0, 1900], [3, 150], [0, 1250], [3, 150], [0, 900],
    [4, 700], [5, 220], [6, 900],
    [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560],
    [4, 999999]
  ];
  function tick(t) {
    window.requestAnimationFrame(tick);
    if (!ready || editing) return;
    var dt = Math.min(50, t - lastT || 16);
    lastT = t;
    if (flop) {                                    // napping: no walking, no idle
      if (keyDir !== 0 && flop === 'flat') flopUp();
      camera();
      return;
    }
    if (keyDir !== 0) sTarget = Math.min(Math.max(sPos + keyDir * 60, 0), totalLen);
    var ds = sTarget - sPos;
    var speed = stageH * 0.38 * (dt / 1000); // an unhurried capybara pace
    if (Math.abs(ds) > 2 && !reduceMotion) {
      walking = true;
      sPos += Math.sign(ds) * Math.min(Math.abs(ds), speed);
      var p = placeCapy();
      facing = Math.sign(ds) >= 0 ? (p.dx >= 0 ? 1 : -1) : (p.dx >= 0 ? -1 : 1);
      stepT += dt;
      if (stepT > 90) {    // busier still: a proper capybara scurry
        stepT = 0;
        walkFrame = walkFrame === 1 ? 2 : 1;
        drawCapy(walkFrame);
        if (window.SQSfx && window.SQSfx.step) window.SQSfx.step();
      }
    } else {
      if (reduceMotion && Math.abs(ds) > 2) { sPos = sTarget; placeCapy(); }
      if (walking) { walking = false; idleT = 0; idleStep = 0; drawCapy(0); }
      idleT += dt;
      var fr = IDLE[Math.min(idleStep, IDLE.length - 1)];
      if (idleT > fr[1] && idleStep < IDLE.length - 1) {
        idleT = 0;
        idleStep += 1;
        drawCapy(IDLE[Math.min(idleStep, IDLE.length - 1)][0]);
      }
    }
    camera();
    visitNodes();
    if (sPos > totalLen * 0.55) prefetchNext();
    if (!bossShown && sPos > totalLen - stageW * 0.22) {
      bossShown = true;
      door.classList.add('is-near');
      popup.hidden = false;
    }
  }
  window.requestAnimationFrame(tick);

  /* ============================================================
     PATH EDITOR — trace the truth, in layers
     Layers: path (gold — Pomelo's walk line) and markers (mint,
     snapped onto the path). N or the mode button switches layers;
     Z undoes in the active layer; C clears the active layer.
     Copy JSON yields a realm-tagged snippet to paste back for
     committing.
     ============================================================ */
  var edPath = [], edNodes = [], edMode = 'path';
  var ED_MODES = ['path', 'nodes'];
  var ED_LABEL = { path: 'Tracing: Pomelo\u2019s path', nodes: 'Placing: markers' };
  var edBar = null;

  function drawTrace() {
    if (!trace) return;
    trace.width = worldW; trace.height = worldH;
    var tc = null;
    try { tc = trace.getContext('2d'); } catch (e) {}
    if (!tc) return;
    tc.clearRect(0, 0, worldW, worldH);
    if (!editing) return;
    function line(pointsList, color) {
      if (!pointsList.length) return;
      tc.lineWidth = 3;
      tc.strokeStyle = color;
      tc.beginPath();
      pointsList.forEach(function (p, i) {
        var x = p[0] * worldW, y = p[1] * worldH;
        if (i === 0) tc.moveTo(x, y); else tc.lineTo(x, y);
      });
      tc.stroke();
      pointsList.forEach(function (p) {
        tc.fillStyle = color;
        tc.fillRect(p[0] * worldW - 4, p[1] * worldH - 4, 8, 8);
      });
    }
    line(edPath.length ? edPath : norm, 'rgba(242,182,60,0.9)');
    (edNodes.length ? edNodes : (realm.nodes || [])).forEach(function (p) {
      tc.fillStyle = '#7FE3C0';
      tc.beginPath();
      tc.arc(p[0] * worldW, p[1] * worldH, 7, 0, Math.PI * 2);
      tc.fill();
    });
  }

  function edJSON() {
    var r3 = function (v) { return Math.round(v * 1000) / 1000; };
    var rr = function (list) { return list.map(function (p) { return [r3(p[0]), r3(p[1])]; }); };
    return JSON.stringify({
      realm: realm.id,
      path: rr(edPath.length ? edPath : norm),
      nodes: rr(edNodes.length ? edNodes : (realm.nodes || []))
    });
  }

  function edLayer() {
    return edMode === 'path' ? edPath : edNodes;
  }
  function editorClick(w) {
    var p = [w.x / worldW, w.y / worldH];
    if (edMode === 'nodes') {
      // snap markers onto the traced (or committed) player line
      var save = norm;
      if (edPath.length >= 2) { norm = edPath; buildPolyline(); }
      var s = nearestS(w.x, w.y);
      var q = pointAt(s);
      edNodes.push([q.x / worldW, q.y / worldH]);
      norm = save; buildPolyline();
    } else {
      edLayer().push(p);
    }
    if (window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
    drawTrace();
    syncEditorBar();
  }
  function cycleMode() {
    edMode = ED_MODES[(ED_MODES.indexOf(edMode) + 1) % ED_MODES.length];
    syncEditorBar();
  }
  function editorKey(e) {
    if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
      edLayer().pop();
      drawTrace(); syncEditorBar();
    }
    if (e.key === 'c' || e.key === 'C') { edLayer().length = 0; drawTrace(); syncEditorBar(); }
    if (e.key === 'n' || e.key === 'N') cycleMode();
  }
  function syncEditorBar() {
    if (!edBar) return;
    edBar.querySelector('#rw-ed-mode').textContent = ED_LABEL[edMode];
    edBar.querySelector('#rw-ed-count').textContent =
      edPath.length + ' path \u00B7 ' + edNodes.length + ' markers';
    edBar.querySelector('#rw-ed-json').value = edJSON();
    edBar.querySelector('#rw-ed-toggle').textContent =
      edMode === 'path' ? 'Switch to markers (N)' : 'Switch to path (N)';
  }
  function enterEditor() {
    document.body.classList.add('is-editing');
    edBar = document.createElement('div');
    edBar.className = 'rw-editor pixel-frame';
    edBar.innerHTML =
      '<p class="rw-ed-head type-utility">PATH EDITOR \u00B7 <span id="rw-ed-mode"></span> \u00B7 <span id="rw-ed-count"></span></p>' +
      '<p class="rw-ed-help">Click along Pomelo\u2019s walkable path, left to right (stairs: one click at the top, one at the bottom). N switches to marker placing; Z undoes, C clears the active layer. Paste the JSON back to Claude to commit it for everyone.</p>' +
      '<textarea id="rw-ed-json" class="type-utility" readonly rows="2"></textarea>' +
      '<div class="rw-ed-row">' +
        '<button class="btn btn-outline" id="rw-ed-toggle" type="button">Switch to markers (N)</button>' +
        '<button class="btn btn-outline" id="rw-ed-copy" type="button">Copy JSON</button>' +
        '<button class="btn btn-gold" id="rw-ed-save" type="button">Save preview &amp; walk it</button>' +
      '</div>';
    stage.appendChild(edBar);
    edBar.querySelector('#rw-ed-toggle').addEventListener('click', function (e) {
      e.stopPropagation();
      cycleMode();
    });
    edBar.querySelector('#rw-ed-copy').addEventListener('click', function (e) {
      e.stopPropagation();
      var ta = edBar.querySelector('#rw-ed-json');
      ta.select();
      try { navigator.clipboard.writeText(ta.value); } catch (err) { document.execCommand('copy'); }
      this.textContent = 'Copied!';
    });
    edBar.querySelector('#rw-ed-save').addEventListener('click', function (e) {
      e.stopPropagation();
      if (edPath.length < 2 && !edNodes.length) {
        this.textContent = 'Trace something first';
        return;
      }
      try {
        window.localStorage.setItem(PREVIEW_KEY, edJSON());
      } catch (err) {}
      window.location.href = 'realm.html?realm=' + realm.id;
    });
    drawTrace();
    syncEditorBar();
  }
})();
