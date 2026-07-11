/* ============================================================
   ScoreQuest — realm walkabout (architecture preview)
   ------------------------------------------------------------
   One template (realm.html), eight worlds: ?realm=<id> selects a
   manifest entry, so every biome is its own page load — only the
   current realm's art and sounds are ever in memory — while the
   code stays one file. Horizontal progression: tap ahead and
   Pomelo walks there, side-profile, with the camera following;
   the page itself never scrolls. At the far end, the realm's
   boss area waits, sealed. Crossing 55% of the world prefetches
   the NEXT realm's art so the handoff feels instant.

   The manifest's img chains are local-first (assets/realms/…)
   with the current Higgsfield renders as CDN placeholders — the
   real quantized art drops into assets/realms/ later without
   touching this file's logic. `ground` is the walk line as a
   fraction of world height; per-realm because every biome draws
   its path at a different height. Prism Peaks is flagged for the
   planned vertical-ascent treatment once tall finale art exists.
   ============================================================ */
(function () {
  'use strict';
  if (!document.body.classList.contains('page-realm')) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01';

  var REALMS = [
    { id: 'lorewood', name: 'Lorewood', domain: 'Information & Ideas', ground: 0.80,
      boss: 'The shrine doors are sealed. Whatever twists the old texts is waiting behind them.',
      img: ['assets/realms/lorewood.png', CDN + '/hf_20260711_215833_948a0475-28db-41fa-94bf-14fca55664f1.png'] },
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

  var stage = document.getElementById('rw-stage');
  var world = document.getElementById('rw-world');
  var bg = document.getElementById('rw-bg');
  var door = document.getElementById('rw-door');
  var capy = document.getElementById('rw-capy');
  var veil = document.getElementById('rw-veil');
  var hint = document.getElementById('rw-hint');
  var popup = document.getElementById('rw-popup');

  /* ---------- HUD ---------- */
  document.title = realm.name + ', ScoreQuest';
  document.getElementById('rw-title').textContent = realm.name;
  document.getElementById('rw-meta').textContent =
    'Realm ' + (idx + 1) + ' of ' + REALMS.length + ' \u00B7 ' + realm.domain;
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

  /* ---------- world state ---------- */
  var stageW = 0, stageH = 0, worldW = 0, worldH = 0;
  var capyW = 0, capyH = 0;
  var capyX = 0, targetX = 0, facing = 1;
  var walking = false, ready = false;
  var bossShown = false, prefetched = false;
  var keyDir = 0;

  var ctx = null;
  try { ctx = capy.getContext('2d'); } catch (e) {}
  function drawCapy(frame) {
    if (!ctx || !window.SQCompanion) return;
    if (facing === 1) ctx.setTransform(1, 0, 0, 1, 3, 2);
    else ctx.setTransform(-1, 0, 0, 1, 46, 2);   // mirror within the padded canvas
    window.SQCompanion.draw(ctx, frame);
  }

  function layout() {
    stageW = stage.clientWidth;
    stageH = stage.clientHeight;
    if (!bg.naturalWidth) return;
    worldH = stageH;
    worldW = Math.round(bg.naturalWidth / bg.naturalHeight * worldH);
    world.style.width = worldW + 'px';
    capyW = capy.clientWidth || 120;
    capyH = capy.clientHeight || Math.round(capyW * 43 / 49);
    var groundPx = Math.round(realm.ground * worldH);
    capy.style.top = (groundPx - capyH) + 'px';
    door.style.left = Math.round(worldW - stageW * 0.16) + 'px';
    door.style.top = (groundPx - stageH * 0.30) + 'px';
    capyX = Math.min(Math.max(capyX, 0), worldW - capyW);
    targetX = Math.min(Math.max(targetX, 0), worldW - capyW);
  }

  function camera() {
    var camX = Math.min(Math.max(capyX + capyW / 2 - stageW * 0.42, 0), Math.max(0, worldW - stageW));
    world.style.transform = 'translate3d(' + (-camX) + 'px,0,0)';
    return camX;
  }

  /* ---------- the art, local-first with CDN placeholder fallback ---------- */
  (function loadArt() {
    var srcs = realm.img.slice();
    var i = 0;
    bg.onerror = function () {
      if (i < srcs.length) bg.src = srcs[i++];
      else document.getElementById('rw-veil-text').textContent =
        'the placeholder art could not load \u2014 the realm is still here, just invisible';
    };
    bg.onload = function () {
      layout();
      capyX = Math.round(worldW * 0.05);
      targetX = capyX;
      drawCapy(0);
      camera();
      ready = true;
      veil.classList.add('is-gone');
    };
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

  /* ---------- input: tap ahead, or hold the arrows ---------- */
  stage.addEventListener('click', function (e) {
    if (e.target.closest('.rw-hud') || e.target.closest('.rw-popup')) return;
    if (!ready) return;
    if (!popup.hidden) { popup.hidden = true; return; }
    var camX = Math.min(Math.max(capyX + capyW / 2 - stageW * 0.42, 0), Math.max(0, worldW - stageW));
    targetX = Math.min(Math.max(e.clientX + camX - capyW / 2, 0), worldW - capyW);
    hint.classList.add('is-gone');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyDir = 1;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyDir = -1;
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || /^[adAD]$/.test(e.key)) keyDir = 0;
  });
  window.addEventListener('resize', function () { layout(); camera(); });

  /* ---------- the walk ---------- */
  var lastT = 0, stepT = 0, walkFrame = 1, idleT = 0, idleStep = 0;
  var IDLE = [[0, 1900], [3, 150], [0, 1250], [3, 150]];
  function tick(t) {
    window.requestAnimationFrame(tick);
    if (!ready) return;
    var dt = Math.min(50, t - lastT || 16);
    lastT = t;
    if (keyDir !== 0) targetX = Math.min(Math.max(capyX + keyDir * 60, 0), worldW - capyW);
    var dx = targetX - capyX;
    var speed = stageH * 0.55 * (dt / 1000); // ~0.55 stage-heights per second
    if (Math.abs(dx) > 2 && !reduceMotion) {
      walking = true;
      facing = dx > 0 ? 1 : -1;
      capyX += Math.sign(dx) * Math.min(Math.abs(dx), speed);
      capy.style.left = Math.round(capyX) + 'px';
      stepT += dt;
      if (stepT > 165) {
        stepT = 0;
        walkFrame = walkFrame === 1 ? 2 : 1;
        drawCapy(walkFrame);
        if (window.SQSfx && window.SQSfx.step) window.SQSfx.step();
      }
    } else {
      if (reduceMotion && Math.abs(dx) > 2) { capyX = targetX; capy.style.left = Math.round(capyX) + 'px'; }
      if (walking) { walking = false; idleT = 0; idleStep = 0; drawCapy(0); }
      idleT += dt;
      var fr = IDLE[idleStep % IDLE.length];
      if (idleT > fr[1]) { idleT = 0; idleStep += 1; drawCapy(IDLE[idleStep % IDLE.length][0]); }
    }
    camera();
    if (capyX > worldW * 0.55) prefetchNext();
    if (!bossShown && capyX > worldW - stageW * 0.28) {
      bossShown = true;
      door.classList.add('is-near');
      popup.hidden = false;
    }
  }
  window.requestAnimationFrame(tick);
})();
