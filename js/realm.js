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
      img: ['assets/realms/storyforge.png', CDN + '/hf_20260711_215841_068ad0e5-1c08-4d92-beb5-7f038637027d.png'] },
    { id: 'inkreef', name: 'Ink Reef', domain: 'Expression of Ideas', ground: 0.82,
      boss: 'The grotto is dark with drifting ink. The water will not clear on its own.',
      img: ['assets/realms/inkreef.png', CDN + '/hf_20260711_215850_bf770aa9-d4bb-463c-83fd-d4a2fdf89591.png'] },
    { id: 'syntaxcitadel', name: 'Syntax Citadel', domain: 'Conventions', ground: 0.80,
      boss: 'The keep gate opens only for a complete sentence. The one on the throne is in pieces.',
      img: ['assets/realms/syntaxcitadel.png', CDN + '/hf_20260711_215858_1813c097-6ef9-4d3a-a80f-3b3bd4951f49.png'] },
    { id: 'mirrormines', name: 'Mirror Mines', domain: 'Algebra', ground: 0.81,
      boss: 'The mirror chamber. Whatever is done on one side happens on the other.',
      img: ['assets/realms/mirrormines.png', CDN + '/hf_20260711_215907_1207e44a-7be5-4ce7-a7c7-4ecb611cfd92.png'] },
    { id: 'infinityisles', name: 'Infinity Isles', domain: 'Advanced Math', ground: 0.78,
      boss: 'The archway hums. Something on the far side keeps doubling.',
      img: ['assets/realms/infinityisles.png', CDN + '/hf_20260711_215917_16d5dfbf-cd4e-4539-a965-f5f89ad37a06.png'] },
    { id: 'datadocks', name: 'Data Docks', domain: 'Problem-Solving & Data', ground: 0.80,
      boss: 'The gangplank is up. The captain\u2019s charts never quite add up.',
      img: ['assets/realms/datadocks.png', CDN + '/hf_20260711_215928_64b58b73-a2bc-45ad-a8f8-9528e0d1ca18.png'] },
    { id: 'prismpeaks', name: 'Prism Peaks', domain: 'Geometry & Trigonometry', ground: 0.80, vertical: true,
      boss: 'The nest at the summit. You know who it belongs to \u2014 and who is waiting in it.',
      img: ['assets/realms/prismpeaks.png', CDN + '/hf_20260711_215940_56575c68-08a5-4a44-a5c8-91faa81f0ad3.png'] }
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
    if (saved && (saved.path || saved.tracks || saved.nodes)) {
      realm = Object.assign({}, realm);
      if (saved.path && saved.path.length >= 2) realm.path = saved.path;
      if (saved.nodes) realm.nodes = saved.nodes;
      if (saved.tracks) realm.tracks = Object.assign({}, realm.tracks || {}, saved.tracks);
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
    capy.style.top = Math.round(p.y - capyH) + 'px';
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

  /* Mango, waiting at the end of her traced track (if the realm has one) */
  function renderMangoTrack() {
    var mc = document.getElementById('rw-mango');
    if (!mc) return;
    var track = realm.tracks && realm.tracks.mango;
    if (!track || !track.length || !window.SQMango) { mc.hidden = true; return; }
    mc.width = window.SQMango.w;
    mc.height = window.SQMango.h;
    var mctx = null;
    try { mctx = mc.getContext('2d'); } catch (e) {}
    if (!mctx) { mc.hidden = true; return; }
    window.SQMango.draw(mctx, 0);
    mc.hidden = false;
    var mw = mc.clientWidth || 120;
    var mh = mc.clientHeight || Math.round(mw * 40 / 49);
    var end = track[track.length - 1];
    mc.style.left = Math.round(end[0] * worldW - mw / 2) + 'px';
    mc.style.top = Math.round(end[1] * worldH - mh) + 'px';
  }

  var ctx = null;
  try { ctx = capy.getContext('2d'); } catch (e) {}
  function drawCapy(frame) {
    if (!ctx || !window.SQCompanion) return;
    if (facing === 1) ctx.setTransform(1, 0, 0, 1, 3, 2);
    else ctx.setTransform(-1, 0, 0, 1, 46, 2);
    window.SQCompanion.draw(ctx, frame);
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
    capyH = capy.clientHeight || Math.round(capyW * 43 / 49);
    buildPolyline();
    var end = pts[pts.length - 1];
    door.style.left = Math.round(Math.min(end[0], worldW - stageW * 0.16)) + 'px';
    door.style.top = Math.round(end[1] - stageH * 0.30) + 'px';
    layoutNodes();
    renderMangoTrack();
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
  var IDLE = [[0, 1900], [3, 150], [0, 1250], [3, 150]];
  function tick(t) {
    window.requestAnimationFrame(tick);
    if (!ready || editing) return;
    var dt = Math.min(50, t - lastT || 16);
    lastT = t;
    if (keyDir !== 0) sTarget = Math.min(Math.max(sPos + keyDir * 60, 0), totalLen);
    var ds = sTarget - sPos;
    var speed = stageH * 0.55 * (dt / 1000);
    if (Math.abs(ds) > 2 && !reduceMotion) {
      walking = true;
      sPos += Math.sign(ds) * Math.min(Math.abs(ds), speed);
      var p = placeCapy();
      facing = Math.sign(ds) >= 0 ? (p.dx >= 0 ? 1 : -1) : (p.dx >= 0 ? -1 : 1);
      stepT += dt;
      if (stepT > 165) {
        stepT = 0;
        walkFrame = walkFrame === 1 ? 2 : 1;
        drawCapy(walkFrame);
        if (window.SQSfx && window.SQSfx.step) window.SQSfx.step();
      }
    } else {
      if (reduceMotion && Math.abs(ds) > 2) { sPos = sTarget; placeCapy(); }
      if (walking) { walking = false; idleT = 0; idleStep = 0; drawCapy(0); }
      idleT += dt;
      var fr = IDLE[idleStep % IDLE.length];
      if (idleT > fr[1]) { idleT = 0; idleStep += 1; drawCapy(IDLE[idleStep % IDLE.length][0]); }
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
     Layers: path (gold, the player's walk line) -> markers (mint,
     snapped onto the path) -> mango (pink, her own track). N or
     the mode button cycles layers; Z undoes in the active layer;
     C clears the active layer. Copy JSON yields a realm-tagged
     snippet to paste back for committing.
     ============================================================ */
  var edPath = [], edNodes = [], edMango = [], edMode = 'path';
  var ED_MODES = ['path', 'nodes', 'mango'];
  var ED_LABEL = { path: 'Tracing: path', nodes: 'Placing: markers', mango: 'Tracing: Mango' };
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
    line(edMango.length ? edMango : ((realm.tracks && realm.tracks.mango) || []), 'rgba(229,139,165,0.95)');
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
    var out = {
      realm: realm.id,
      path: rr(edPath.length ? edPath : norm),
      nodes: rr(edNodes.length ? edNodes : (realm.nodes || []))
    };
    var mango = edMango.length ? edMango : ((realm.tracks && realm.tracks.mango) || []);
    if (mango.length) out.tracks = { mango: rr(mango) };
    return JSON.stringify(out);
  }

  function edLayer() {
    return edMode === 'path' ? edPath : edMode === 'nodes' ? edNodes : edMango;
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
      edPath.length + ' path \u00B7 ' + edNodes.length + ' markers \u00B7 ' + edMango.length + ' mango';
    edBar.querySelector('#rw-ed-json').value = edJSON();
    var nextMode = ED_MODES[(ED_MODES.indexOf(edMode) + 1) % ED_MODES.length];
    edBar.querySelector('#rw-ed-toggle').textContent =
      'Next: ' + (nextMode === 'path' ? 'path' : nextMode === 'nodes' ? 'markers' : 'Mango') + ' (N)';
  }
  function enterEditor() {
    document.body.classList.add('is-editing');
    edBar = document.createElement('div');
    edBar.className = 'rw-editor pixel-frame';
    edBar.innerHTML =
      '<p class="rw-ed-head type-utility">PATH EDITOR \u00B7 <span id="rw-ed-mode"></span> \u00B7 <span id="rw-ed-count"></span></p>' +
      '<p class="rw-ed-help">Click along the walkable path, left to right. N cycles path \u2192 markers \u2192 Mango\u2019s track; Z undoes, C clears the active layer. Paste the JSON back to Claude to commit it for everyone.</p>' +
      '<textarea id="rw-ed-json" class="type-utility" readonly rows="2"></textarea>' +
      '<div class="rw-ed-row">' +
        '<button class="btn btn-outline" id="rw-ed-toggle" type="button">Next: markers (N)</button>' +
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
      if (edPath.length < 2 && !edNodes.length && !edMango.length) {
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
