/* ============================================================
   ScoreQuest: battle Engine 2, the over-the-shoulder view (Nov 2026)
   ------------------------------------------------------------
   The player's creature stands NEAR (bottom left, seen from behind), the foe FAR (top right).
   One low-res canvas, drawn in scene pixels: tweens, squash and stretch, drawn pose frames,
   particles, hit-stop, after-images. Creatures are PROFILES from data/creatures.js; every
   size, contact point and launch point the moves use is worked out from the two profiles,
   so a new creature needs a profile and frames, not new move code.

   Used by lab.html (the Creature Lab). Not wired into the live fight yet: that still runs
   Engine 1 (js/clash-arena.js, side view).

   API: SQBattle2.mount(sceneEl, { near: id, far: id, say(text), onBusy(bool, actId), base, ver })
     -> { ready, acts, play(id), busy(), guides(on), fighter(side), setFighter(side, id), refresh(), stop() }
   Size on screen: --u on the scene is one scene pixel (css/battle2.css, 3px). The frame is as tall as
   Engine 1's strip, or 60 scene pixels if that is taller.
   ============================================================ */
(function () {
'use strict';
var FIELD = { near: 1.25, far: 1 };                     /* screen pixels per world unit at each end of the field */
var SPOTS = { near: { x: -45, ground: 66, dir: 1 }, far: { x: 46, ground: 31, dir: -1 } };   /* scene px from the centre line; dir = which way it faces */

function mount(scene, opts) {
  opts = opts || {};
  var CREATURES = window.SQ_CREATURES || {}, base = opts.base || '', ver = opts.ver || '';
  var say = opts.say || function () {};
  scene.classList.add('b2-scene');
  scene.innerHTML = '<canvas class="b2-fx" height="60"></canvas>' +
    '<div class="b2-plate p-foe"><div class="nm"></div><div class="row"><span class="lbl">WARD</span><div class="b2-bar ward"></div></div></div>' +
    '<div class="b2-plate p-me"><div class="nm"></div><div class="row"><span class="lbl">HP</span><div class="b2-bar hp"></div></div></div>';
  var fxc = scene.querySelector('canvas'), elWard = scene.querySelector('.ward'), elHp = scene.querySelector('.hp');
  var S = { ward: 3, hp: 5, shown: null }, busy = false;

  /* ----- plates: a lost pip pops and its plate jolts, a regained pip fills ----- */
  function pips(el, n, on, was) { el.innerHTML = ''; for (var k = 0; k < n; k++) { var i = document.createElement('i'); if (k < on) i.className = k >= was ? 'on fill' : 'on'; else if (k < was) i.className = 'pop'; el.appendChild(i); } }
  function status() {
    var was = S.shown || { ward: S.ward, hp: S.hp };
    pips(elWard, 3, S.ward, was.ward); pips(elHp, 5, S.hp, was.hp);
    [['ward', '.p-foe'], ['hp', '.p-me']].forEach(function (r) { if (S[r[0]] < was[r[0]]) { var pl = scene.querySelector(r[1]); pl.classList.remove('jolt'); void pl.offsetWidth; pl.classList.add('jolt'); } });
    elHp.classList.toggle('low', S.hp <= 2); elWard.classList.toggle('low', S.ward <= 1);
    S.shown = { ward: S.ward, hp: S.hp };
  }
  function loseWard() { S.ward--; status(); } function loseHp() { S.hp--; status(); }
  function nm(f, cap) { return (f.P.article ? (cap ? 'The ' : 'the ') : '') + f.P.name; }

  var bgc = document.createElement('canvas');
  /* ----- battle engine: one low-res canvas, tweens, squash and stretch, particles, hit-stop ----- */
  var ctx = fxc.getContext('2d'), W = 224, H = 60, cx = 112, T = 0;   /* the fight is laid out on H rows; T = extra rows of sky above it when the frame is taller */
  var parts = [], fxs = [], ghosts = [], shake = 0, frame = 0, ready = false, alive = true;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); }, easeIn = function (t) { return t * t * t; },
      easeIO = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function tween(ms, fn) { return new Promise(function (res) { var t0 = performance.now();
    (function step(now) { var t = Math.min(1, Math.max(0, (now - t0) / ms)); fn(t); if (t < 1) requestAnimationFrame(step); else res(); })(t0); }); }
  /* ----- fighters: a creature profile (data/creatures.js) standing at one end of the field -----
     Every size and contact point comes from the profile:
       size  = how tall the creature really is, in world units (ears and carrot included)
       art   = how tall its drawing is in pixels, so the engine knows the drawing's pixels per unit
       feet  = empty rows under the feet in the frame; front = centre to nose tip
       mid / head / launch = points measured from the feet, in the drawing's own pixels
     FIELD says how many screen pixels one world unit is at each end, so
     draw scale = FIELD[spot] * size / art. Pomelo: 1 near, 0.8 far. A rabbit: 1 far, 1.25 near. */
  function absScale(f, spot) { return FIELD[spot] * f.P.size / f.P.art; }
  function fighter(P, spot) {
    var sp = SPOTS[spot], f = { P: P, spot: spot, bx: sp.x, ground: sp.ground, dir: sp.dir, flip: sp.dir * (P.faces || 1),
      ox: 0, oy: 0, sx: 1, sy: 1, z: 1, rot: 0, flash: 0, alpha: 1, useAlt: 0, pose: 'idle', fr: {}, wh: {}, gh: {} };
    place(f);
    f.loaded = Promise.all(P.poses.map(function (k) { return new Promise(function (res) { var im = new Image(); im.onload = res; im.onerror = res; im.src = base + P.dir + k + '.png' + ver; f.fr[k] = im; }); }))
      .then(function () { Object.keys(f.fr).forEach(function (k) { if (!f.fr[k].naturalWidth) { delete f.fr[k]; return; } f.wh[k] = tinted(f.fr[k], '#ffffff'); f.gh[k] = tinted(f.fr[k], P.tint || '#ffffff'); }); });
    return f;
  }
  function place(f) { f.s0 = absScale(f, f.spot); f.by = f.ground + f.P.feet * f.s0; f.w = f.P.w * f.s0; }
  function at(f, q) { return { x: f.bx + f.dir * q.x * f.s0, y: f.ground - q.y * f.s0 }; }
  /* where the attacker stands nose to nose with the defender: on the line between their two spots, scaled for that depth */
  function meet(a, d, gap) {
    var sa = absScale(a, d.spot), x = d.bx + d.dir * d.P.front * d.s0 - a.dir * (a.P.front * sa + (gap || 0)), t = (x - a.bx) / (d.bx - a.bx);
    return { ox: Math.round(x - a.bx), oy: Math.round(lerp(a.ground, d.ground, t) - a.by + a.P.feet * sa), z: sa / a.s0 };
  }
  var me, foe, FC, FG, MH, ML, FL, MG, guides = false;
  function points() {   /* the scene points the moves aim at, from the two profiles */
    place(me); place(foe);
    FC = { x: foe.bx, y: foe.ground - foe.P.mid * foe.s0 }; FG = foe.ground - 1; MG = Math.min(H - 1, me.ground - 1);
    MH = at(me, me.P.head); ML = at(me, me.P.launch); FL = at(foe, foe.P.launch);
  }
  function tinted(img, color) { var c = document.createElement('canvas'); c.width = img.width; c.height = img.height; var x = c.getContext('2d');
    x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c; }
  function look(f) {   /* which drawn frame to show, and at what scale */
    var total = f.z * f.s0, far = f.P.farArt;
    if (far && total < (1 + far) / 2) { var fk = f.fr['far_' + f.pose] ? 'far_' + f.pose : f.fr.far_idle ? 'far_idle' : null; if (fk) return { k: fk, zz: total / far }; }   /* far away: the true small sprite */
    var k = f.pose;
    if (k === 'idle' || !f.fr[k]) {   /* a pose this creature lacks falls back to idle */
      var c = f.P.breath || [50, 9, 44, 9, 0], t = (frame + c[4]) % (c[0] + c[1] + c[2] + c[3]), still = k === 'idle' && f.sx === 1 && f.sy === 1 && f.z === 1 && !guides;
      var ph = !still || t < c[0] ? 0 : t < c[0] + c[1] ? 1 : t < c[0] + c[1] + c[2] ? 2 : 3;
      k = (f.useAlt > 0 && f.P.alt && f.fr[f.P.alt + ph] ? f.P.alt : 'idle') + ph; if (!f.fr[k]) k = 'idle'; }
    return { k: k, zz: total };
  }
  function X(x) { return Math.round(cx + x); }
  function drawF(f) {
    if (f.alpha <= 0) return;
    var L = look(f), img = f.flash > 0 ? f.wh[L.k] : f.fr[L.k];
    ctx.save(); ctx.globalAlpha = f.alpha; ctx.translate(X(f.bx + f.ox), Math.round(f.by + f.oy)); if (f.rot) ctx.rotate(f.rot);
    ctx.scale(f.flip * f.sx * L.zz, f.sy * L.zz); ctx.drawImage(img, -Math.round(img.width / 2), -img.height, img.width, img.height); ctx.restore();
  }
  function ghost(f) { if (frame - (f._g || 0) < 3) return; f._g = frame; var L = look(f); ghosts.push({ f: f, k: L.k, ox: f.ox, oy: f.oy, sx: f.sx, sy: f.sy, z: L.zz, rot: f.rot, flip: f.flip, life: 12 }); }
  function squash(f, sx, sy, ms) { var a = f.sx, b = f.sy; return tween(ms, function (t) { var e = easeOut(t); f.sx = lerp(a, sx, e); f.sy = lerp(b, sy, e); }); }
  function addFx(life, draw, behind) { var o = { age: 0, life: life, draw: draw, behind: !!behind }; fxs.push(o); return o; }
  function px(x, y, c, s) { ctx.fillStyle = c; s = s || 1; ctx.fillRect(X(x) - (s >> 1), Math.round(y) - (s >> 1), s, s); }
  function ellipse(x, y, rx, ry, c, gap) { var n = Math.max(8, Math.ceil(6.3 * Math.max(rx, ry))); for (var i = 0; i < n; i++) { if (gap && (i + gap) % 4 === 0) continue; var a = i / n * 6.283; px(x + Math.cos(a) * rx, y + Math.sin(a) * ry, c); } }
  function ring(x, y, r0, r1, c, life, flat, behind) { addFx(life || 20, function (p) { ctx.globalAlpha = 1 - p; var r = lerp(r0, r1, easeOut(p)); ellipse(x, y, r, r * (flat || 1), c); ctx.globalAlpha = 1; }, behind); }
  function star(x, y, c, size, life) { addFx(life || 12, function (p) { var s = Math.round(lerp(1, size || 5, easeOut(p))); ctx.globalAlpha = 1 - p * p;
    ctx.fillStyle = c || '#fff'; ctx.fillRect(X(x) - s, Math.round(y), s * 2 + 1, 1); ctx.fillRect(X(x), Math.round(y) - s, 1, s * 2 + 1);
    var d = Math.max(1, s >> 1); ctx.fillRect(X(x) - d, Math.round(y) - d, 1, 1); ctx.fillRect(X(x) + d, Math.round(y) - d, 1, 1); ctx.fillRect(X(x) - d, Math.round(y) + d, 1, 1); ctx.fillRect(X(x) + d, Math.round(y) + d, 1, 1); ctx.globalAlpha = 1; }); }
  function burst(x, y, cols, n, spread, g, big) { for (var i = 0; i < n; i++) parts.push({ x: x, y: y, vx: (Math.random() * 2 - 1) * spread, vy: -Math.random() * 1.5 - .2, g: g == null ? .07 : g, life: 16 + Math.random() * 16, c: cols[i % cols.length], s: big && i % 3 === 0 ? 2 : 1 }); }
  function dust(x, y, n, dir, big) { for (var i = 0; i < n; i++) parts.push({ x: x + Math.random() * 6 - 3, y: y, vx: (Math.random() - .5) * 1.1 + (dir || 0) * .5, vy: -Math.random() * .5, g: .012, life: 14 + Math.random() * 14, c: i % 2 ? '#c9a78c' : '#8f6f62', s: big ? 2 : 1 }); }
  function sparkle(x, y, c) { parts.push({ x: x, y: y, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, g: 0, life: 9 + Math.random() * 6, c: c, s: 1 }); }
  function orb(p, core, glow) { var s = Math.max(1, Math.round(p.s)), x = X(p.x) - (s >> 1), y = Math.round(p.y) - (s >> 1);
    ctx.fillStyle = glow; ctx.fillRect(x - 1, y, s + 2, s); ctx.fillRect(x, y - 1, s, s + 2); ctx.fillStyle = core; ctx.fillRect(x, y, s, s);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + (frame >> 2) % s, y, 1, 1); }
  function loop() {
    frame++;
    if (ready && alive && !document.hidden) {
      var ox = 0, oy = 0; if (shake > 0) { ox = Math.round((Math.random() * 2 - 1) * shake); oy = Math.round((Math.random() * 2 - 1) * shake); shake = Math.max(0, shake - .14); }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H + T); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bgc, 0, 0); ctx.translate(ox, oy + T);
      if (frame % 230 === 200 || frame % 230 === 214) foe.useAlt = 7;
      [foe, me].forEach(function (f) { if (f.flash > 0) f.flash--; if (f.useAlt > 0) f.useAlt--; });
      fxs.forEach(function (o) { if (o.behind) o.draw(Math.min(1, o.age / o.life)); });
      ghosts = ghosts.filter(function (g) { return --g.life > 0; });
      ghosts.forEach(function (g) { var f = g.f; ctx.save(); ctx.globalAlpha = g.life / 12 * .5; ctx.translate(X(f.bx + g.ox), Math.round(f.by + g.oy)); if (g.rot) ctx.rotate(g.rot); ctx.scale(g.flip * g.sx * g.z, g.sy * g.z); var gi = f.gh[g.k]; ctx.drawImage(gi, -Math.round(gi.width / 2), -gi.height, gi.width, gi.height); ctx.restore(); });
      if (me.z < .9) { drawF(foe); drawF(me); } else if (foe.z > 1.15) { drawF(me); drawF(foe); } else { drawF(foe); drawF(me); }
      if (guides) [foe, me].forEach(function (f) { var z = f.z * f.s0, gx = f.bx + f.ox, gy = f.by + f.oy - f.P.feet * z, pt = function (q, c) { ctx.fillStyle = c; ctx.fillRect(X(gx + f.dir * q.x * z) - 1, Math.round(gy - q.y * z) - 1, 3, 3); };
        ctx.fillStyle = '#5cf2ff'; ctx.fillRect(X(gx - f.P.w * z / 2), Math.round(gy), Math.round(f.P.w * z), 1);                        /* feet line */
        ctx.fillStyle = '#ffffff'; ctx.fillRect(X(gx - f.dir * f.P.front * z), Math.round(gy - f.P.art * z), 1, Math.round(f.P.art * z));   /* height */
        pt({ x: f.P.front, y: f.P.head.y }, '#ffe14a'); pt({ x: 0, y: f.P.mid }, '#ff5cd0'); pt(f.P.launch, '#7dff6a'); });   /* nose, centre, launch */
      parts = parts.filter(function (p) { return --p.life > 0; });
      parts.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += p.g; ctx.globalAlpha = Math.min(1, p.life / 8); px(p.x, p.y, p.c, p.s); }); ctx.globalAlpha = 1;
      fxs.forEach(function (o) { if (!o.behind) o.draw(Math.min(1, o.age / o.life)); o.age++; });
      fxs = fxs.filter(function (o) { return o.age <= o.life; });
    }
    if (alive) requestAnimationFrame(loop);
  }

  /* ----- what a hit does ----- */
  var WARD = ['#a48fcb', '#d9c8ff', '#ffffff'], GOLD = ['#ffe58a', '#ffb65e', '#ffffff'];
  async function hitFoe(onImpact, knock) {
    foe.pose = 'hurt'; foe.flash = 5; shake = 2.2; onImpact();
    ring(FC.x, FC.y, 15, 15, '#ffffff', 6, 1); star(FC.x, FC.y, '#fff', 7, 14);
    await sleep(80);   /* hit-stop */
    burst(FC.x, FC.y, WARD, 16, 1.5, .06, true); ring(FC.x, FC.y, 12, 26, '#d9c8ff', 22, 1); ring(FC.x, FG, 6, 22, '#c9a78c', 20, .22, true);
    knock = knock || 5; foe.sx = .86; foe.sy = 1.12;
    await tween(130, function (t) { foe.ox = Math.round(knock * easeOut(t)); foe.oy = -Math.round(3 * Math.sin(t * Math.PI)); });
    foe.sx = 1.15; foe.sy = .86; dust(foe.bx + knock, 30, 5, 1);
    await tween(300, function (t) { foe.ox = Math.round(knock * (1 - easeIO(t))); foe.sx = lerp(1.15, 1, t); foe.sy = lerp(.86, 1, t); });
    foe.ox = 0; foe.sx = 1; foe.sy = 1; await sleep(160); foe.pose = 'idle';
  }
  async function hitMe(onImpact) {
    me.pose = 'hurt'; me.flash = 5; shake = 2.6; onImpact(); star(MH.x, MH.y, '#fff', 8, 14);
    await sleep(80);
    burst(MH.x, MH.y, WARD, 14, 1.6, .07, true); ring(MH.x, MH.y + 2, 8, 26, '#d9c8ff', 20, 1);
    me.sx = 1.08; me.sy = .93;
    await tween(460, function (t) { me.ox = Math.round(Math.sin(t * Math.PI * 5) * 3 * (1 - t)); });
    me.ox = 0; await sleep(120); me.pose = 'rear'; await squash(me, .96, 1.05, 110);   /* he shakes it off, head up */
    for (var i = 0; i < 6; i++) sparkle(MH.x - 16 + Math.random() * 26, MH.y - 6 + Math.random() * 14, '#fff3b8');
    await squash(me, 1, 1, 160); await sleep(140); me.pose = 'idle';
  }
  function wardGlow() { addFx(34, function (p) { ctx.globalAlpha = Math.sin(p * Math.PI) * (.55 + .45 * Math.sin(p * 18)); ellipse(FC.x, FC.y, 18, 17, '#d9c8ff', (frame >> 2) % 4 + 1); ellipse(FC.x, FC.y, 16, 15, '#a48fcb', (frame >> 2) % 4 + 3); ctx.globalAlpha = 1; }); }

  /* ----- Pomelo's moves (a right answer) ----- */
  var MY_MOVES = [
    async function spark(hit) {   /* a zest spark, lobbed away from the viewer so it shrinks as it flies */
      me.pose = 'crouch'; await squash(me, 1.12, .88, 190); await sleep(60);
      me.pose = 'rear'; squash(me, .94, 1.08, 110); await tween(130, function (t) { me.oy = -Math.round(5 * easeOut(t)); });
      var p = { x: ML.x, y: ML.y, s: 5 }, o = addFx(1e6, function () { orb(p, '#ffe58a', '#ffb65e'); }); star(ML.x, ML.y, '#fff3b8', 4, 8);
      tween(170, function (t) { me.oy = -Math.round(5 * (1 - easeIn(t))); }).then(function () { me.sx = 1.08; me.sy = .93; return squash(me, 1, 1, 140); }).then(function () { me.pose = 'idle'; });
      await tween(440, function (t) { var e = t * .45 + easeIn(t) * .55; p.x = lerp(ML.x, FC.x - 1, e); p.y = lerp(ML.y, FC.y - 1, e) - Math.sin(t * Math.PI) * 9; p.s = lerp(5, 2, e); if (frame % 2) sparkle(p.x, p.y, t < .5 ? '#ffe58a' : '#fff3b8'); });
      o.life = 0; await hitFoe(hit);
    },
    async function charge(hit) {   /* head down, a dash up the field with after-images, a clean bonk that bounces him back, a hop home */
      var M = meet(me, foe, -1);
      me.pose = 'crouch'; await squash(me, 1.16, .84, 240); dust(me.bx + 15, MG, 6, -1, true); me.sx = 1; me.sy = 1;
      await tween(230, function (t) { var e = easeIn(t); me.ox = Math.round(M.ox * e); me.oy = Math.round(M.oy * e); me.z = lerp(1, M.z, e); ghost(me); });
      me.z = M.z; me.pose = 'rear'; ghosts.length = 0;
      var hitting = hitFoe(hit, 7);
      await tween(150, function (t) { me.ox = M.ox - Math.round(7 * easeOut(t)); me.oy = M.oy - Math.round(3 * Math.sin(t * Math.PI)); });   /* the bounce off */
      await hitting; me.pose = 'idle';
      await tween(430, function (t) { var e = easeIO(t); me.ox = Math.round((M.ox - 7) * (1 - e)); me.oy = Math.round(M.oy * (1 - e) - Math.sin(t * Math.PI) * 11); me.z = lerp(M.z, 1, e); });
      me.ox = 0; me.oy = 0; me.z = 1; me.pose = 'crouch'; me.sx = 1.14; me.sy = .88; shake = 1; dust(me.bx, MG, 6, 0, true); await squash(me, 1, 1, 160); me.pose = 'idle';
    },
    async function stomp(hit) {   /* jump, land, and a ripple rolls across the ground to the rabbit */
      me.pose = 'crouch'; await squash(me, 1.18, .8, 210);
      me.pose = 'rear'; me.sx = .93; me.sy = 1.1; await tween(230, function (t) { me.oy = -Math.round(15 * easeOut(t)); });
      await tween(130, function (t) { me.oy = -Math.round(15 * (1 - easeIn(t))); });
      me.pose = 'crouch'; me.oy = 0; me.sx = 1.24; me.sy = .78; shake = 2.6; dust(me.bx, MG, 12, 0, true);
      squash(me, 1, 1, 260).then(function () { me.pose = 'idle'; });
      var w = { x: me.bx + 15, y: MG - 5, r: 18 }, o = addFx(1e6, function () { ellipse(w.x, w.y, w.r, w.r * .26, '#fff3b8'); ellipse(w.x, w.y + 1, w.r, w.r * .26, '#b5957a'); }, true);
      await tween(400, function (t) { var e = easeIn(t) * .5 + t * .5; w.x = lerp(me.bx + 15, FC.x, e); w.y = lerp(MG - 5, FG, e); w.r = lerp(18, 8, e); if (frame % 3 === 0) dust(w.x, w.y, 1, 0); });
      o.life = 0; foe.pose = 'hurt'; foe.flash = 5; shake = 2; hit(); star(FC.x, FC.y + 7, '#fff', 6, 12); burst(FC.x, FC.y + 11, WARD, 14, 1.4, .06, true); ring(FC.x, FC.y, 12, 26, '#d9c8ff', 22, 1);
      await sleep(70);
      await tween(400, function (t) { foe.oy = -Math.round(Math.sin(t * Math.PI) * 11); foe.rot = Math.sin(t * Math.PI) * -.35; foe.sy = 1.08; foe.sx = .94; });
      foe.oy = 0; foe.rot = 0; foe.sx = 1.2; foe.sy = .8; dust(FC.x, FG, 6, 0); await squash(foe, 1, 1, 180); await sleep(160); foe.pose = 'idle';
    }
  ];
  /* ----- the Lantern Rabbit's moves (a miss): the ward holds, then it answers ----- */
  var FOE_MOVES = [
    async function lob(hit) {   /* a lantern light lobbed toward the viewer, growing as it comes */
      wardGlow(); await sleep(260);
      foe.pose = 'windup'; await squash(foe, 1.16, .82, 200); await sleep(60);
      foe.pose = 'leap'; squash(foe, .9, 1.12, 100); await tween(150, function (t) { foe.oy = -Math.round(6 * easeOut(t)); });
      var p = { x: FL.x, y: FL.y, s: 2 }, o = addFx(1e6, function () { orb(p, '#d9c8ff', '#a48fcb'); });
      tween(180, function (t) { foe.oy = -Math.round(6 * (1 - easeIn(t))); }).then(function () { foe.pose = 'idle'; foe.sx = 1.14; foe.sy = .88; dust(FC.x, FG, 3, 0); squash(foe, 1, 1, 150); });
      await tween(540, function (t) { var e = t * .5 + easeIn(t) * .5; p.x = lerp(FL.x, MH.x, e); p.y = lerp(FL.y, MH.y, e) - Math.sin(t * Math.PI) * 14; p.s = lerp(2, 6, e); if (frame % 2) sparkle(p.x, p.y, '#d9c8ff'); });
      o.life = 0; await hitMe(hit);
    },
    async function hop(hit) {   /* two hops down the field, a light bump that bounces off, two hops back */
      var M = meet(foe, me, 0);
      wardGlow(); await sleep(260);
      foe.pose = 'windup'; await squash(foe, 1.16, .82, 190);
      for (var k = 0; k < 2; k++) { foe.pose = 'leap'; await (function (k) { return tween(220, function (t) { var e = (k + t) / 2; foe.ox = Math.round(M.ox * e); foe.oy = Math.round(M.oy * e - Math.sin(t * Math.PI) * 9); foe.z = lerp(1, M.z, e); foe.sx = .94; foe.sy = 1.08; ghost(foe); }); })(k);
        if (k === 0) { foe.pose = 'windup'; foe.sx = 1.14; foe.sy = .88; dust(foe.bx + foe.ox, foe.ground + foe.oy, 4, 1); await sleep(60); } }
      foe.sx = 1; foe.sy = 1; ghosts.length = 0;   /* nose to nose, no squash into him */
      var hitting = hitMe(hit);
      await tween(190, function (t) { foe.ox = M.ox + Math.round(11 * easeOut(t)); foe.oy = M.oy - Math.round(5 * Math.sin(t * Math.PI)); });   /* and straight back off */
      foe.pose = 'windup'; foe.sx = 1.1; foe.sy = .9; dust(foe.bx + foe.ox, foe.ground + foe.oy, 3, 1); await squash(foe, 1, 1, 140);
      await hitting; foe.pose = 'leap';
      await tween(460, function (t) { var e = 1 - easeIO(t); foe.ox = Math.round((M.ox + 11) * e); foe.oy = Math.round(M.oy * e - Math.abs(Math.sin(t * Math.PI * 2)) * 8); foe.z = lerp(1, M.z, e); });
      foe.ox = 0; foe.oy = 0; foe.z = 1; foe.pose = 'idle'; foe.sx = 1.14; foe.sy = .88; dust(FC.x, FG, 4, 0); await squash(foe, 1, 1, 150);
    }
  ];
  var turnN = { me: 0, foe: 0 };
  function play(ok, hit) { var list = ok ? MY_MOVES : FOE_MOVES, k = ok ? 'me' : 'foe'; return list[turnN[k]++ % list.length](hit); }
  /* ----- extras for the big moments ----- */
  function screenFlash() { addFx(10, function (p) { ctx.globalAlpha = (1 - p) * .75; ctx.fillStyle = '#fff'; ctx.fillRect(-6, -T - 6, W + 12, H + T + 12); ctx.globalAlpha = 1; }); }
  function gather(x, y, life) { addFx(life, function (p) { for (var i = 0; i < 10; i++) { var a = i / 10 * 6.283 + p * 4, r = lerp(17, 1, easeIn(p)); px(x + Math.cos(a) * r, y + Math.sin(a) * r * .8, i % 2 ? '#ffe58a' : '#ffffff'); } }); }
  function dizzy(x, y, life) { addFx(life, function (p) { ctx.globalAlpha = p > .8 ? (1 - p) * 5 : 1; for (var i = 0; i < 3; i++) { var a = p * 11 + i * 2.094, sx = x + Math.cos(a) * 9, sy = y + Math.sin(a) * 2.5;
    px(sx, sy, '#ffe58a'); if (Math.sin(a) > 0) { px(sx - 1, sy, '#ffe58a'); px(sx + 1, sy, '#ffe58a'); px(sx, sy - 1, '#ffe58a'); px(sx, sy + 1, '#ffe58a'); } } ctx.globalAlpha = 1; }); }
  function confetti(life) { var cols = ['#ffe58a', '#ffb65e', '#b9e04a', '#d9c8ff', '#ffffff', '#ff9a7a'];
    addFx(life, function () { if (frame % 2 === 0) parts.push({ x: (Math.random() * 2 - 1) * (W / 2), y: -T - 2, vx: (Math.random() - .5) * .5, vy: .45 + Math.random() * .5, g: .004, life: 90, c: cols[(Math.random() * cols.length) | 0], s: Math.random() < .3 ? 2 : 1 }); }); }
  var ZED = ['1111', '0010', '0100', '1111'];
  function zed(x, y, s, a) { ctx.globalAlpha = a; ctx.fillStyle = '#f4ecff'; ZED.forEach(function (row, r) { for (var c = 0; c < 4; c++) if (row[c] === '1') ctx.fillRect(X(x) + c * s, Math.round(y) + r * s, s, s); }); ctx.globalAlpha = 1; }
  function snore(life) { addFx(life, function (p) { for (var k = 0; k < 3; k++) { var q = (p * 3.2 - k * .33) % 1; if (p * 3.2 - k * .33 < 0 || q < 0) continue; zed(MH.x + 14 + q * 16 + k * 2, MH.y - 6 - q * 22, q > .5 ? 2 : 1, q < .15 ? q / .15 : 1 - Math.max(0, (q - .7) / .3)); } }); }
  async function foeIn() { foe.alpha = 1; foe.flip = foe.dir * (foe.P.faces || 1); foe.oy = 0; foe.rot = 0; foe.z = 1; foe.ox = 120; foe.pose = 'leap';
    await tween(520, function (t) { foe.ox = Math.round(120 * (1 - easeOut(t))); if (frame % 4 === 0 && t < .8) dust(foe.bx + foe.ox, 30, 1, 1); });
    foe.pose = 'idle'; foe.sx = 1.12; foe.sy = .9; await squash(foe, 1, 1, 180); }
  async function meIn() { me.ox = -110; me.pose = 'idle'; await tween(560, function (t) { me.ox = Math.round(-110 * (1 - easeOut(t))); }); me.sx = 1.08; me.sy = .93; await squash(me, 1, 1, 200); }
  function enter() { return Promise.all([foeIn(), meIn()]); }
  async function cheer(n) {   /* happy jumps, head up */
    for (var k = 0; k < n; k++) {
      me.pose = 'crouch'; await squash(me, 1.12, .86, 120);
      me.pose = 'cheer'; me.sx = .94; me.sy = 1.08; await tween(320, function (t) { me.oy = -Math.round(Math.sin(t * Math.PI) * 10); });
      me.oy = 0; me.sx = 1.14; me.sy = .88; dust(me.bx, MG, 5, 0, true); for (var i = 0; i < 4; i++) sparkle(MH.x - 14 + Math.random() * 30, MH.y - 12 + Math.random() * 12, '#fff3b8'); await squash(me, 1, 1, 120);
    }
    me.pose = 'cheer'; await sleep(600); me.pose = 'idle';
  }
  async function bow() { foe.pose = 'bow'; await squash(foe, 1.12, .78, 280); await sleep(380); await squash(foe, 1, 1, 180); await sleep(140); }
  async function hopOff() { foe.flip = -foe.dir * (foe.P.faces || 1);
    for (var k = 0; k < 4; k++) { foe.pose = 'leap'; await (function (k) { return tween(230, function (t) { foe.ox = Math.round(22 * (k + t)); foe.oy = -Math.round(Math.sin(t * Math.PI) * 9); foe.sx = .94; foe.sy = 1.08; if (k === 3) foe.alpha = 1 - t; }); })(k); dust(foe.bx + foe.ox, 30, 4, -1); }
    foe.sx = 1; foe.sy = 1; }
  async function happyHops(n) { for (var k = 0; k < n; k++) { foe.pose = 'windup'; await squash(foe, 1.1, .88, 100); foe.pose = 'happy'; foe.sx = .95; foe.sy = 1.06;
    await tween(260, function (t) { foe.oy = -Math.round(Math.sin(t * Math.PI) * 7); }); foe.oy = 0; foe.sx = 1.12; foe.sy = .9; dust(FC.x, FG, 3, 0); await squash(foe, 1, 1, 110); } await sleep(300); foe.pose = 'idle'; }

  /* ----- victory: the last ward goes, the rabbit yields, Pomelo celebrates ----- */
  async function victory() {
    S.ward = 1; status(); say(nm(me, 1) + ' dispels the last ward!');
    me.pose = 'crouch'; squash(me, 1.16, .84, 320); gather(ML.x, ML.y + 1, 36); await sleep(640);
    me.pose = 'rear'; squash(me, .92, 1.1, 110); await tween(140, function (t) { me.oy = -Math.round(7 * easeOut(t)); });
    var p = { x: ML.x, y: ML.y - 2, s: 8 }, o = addFx(1e6, function () { orb(p, '#fff3b8', '#ffb65e'); }); star(ML.x, ML.y - 2, '#fff', 7, 10);
    tween(190, function (t) { me.oy = -Math.round(7 * (1 - easeIn(t))); }).then(function () { me.sx = 1.1; me.sy = .9; return squash(me, 1, 1, 160); }).then(function () { me.pose = 'idle'; });
    await tween(430, function (t) { var e = t * .45 + easeIn(t) * .55; p.x = lerp(ML.x, FC.x - 1, e); p.y = lerp(ML.y - 2, FC.y - 1, e) - Math.sin(t * Math.PI) * 10; p.s = lerp(8, 3, e); sparkle(p.x, p.y, '#ffe58a'); sparkle(p.x, p.y + 1, '#ffffff'); });
    o.life = 0; foe.pose = 'hurt'; foe.flash = 9; shake = 3.6; S.ward = 0; status(); screenFlash(); star(FC.x, FC.y, '#fff', 11, 18);
    await sleep(160);   /* a longer hit-stop for the last one */
    burst(FC.x, FC.y, WARD, 36, 2.3, .05, true); ring(FC.x, FC.y, 10, 30, '#ffffff', 26, 1); ring(FC.x, FC.y, 8, 42, '#d9c8ff', 34, 1); ring(FC.x, FC.y, 6, 54, '#a48fcb', 44, 1); ring(FC.x, FG, 6, 34, '#c9a78c', 26, .22, true);
    await tween(640, function (t) { foe.oy = -Math.round(Math.sin(t * Math.PI) * 17); foe.rot = -6.283 * easeIO(t); foe.ox = Math.round(6 * Math.sin(t * Math.PI)); });
    foe.oy = 0; foe.rot = 0; foe.ox = 0; foe.sx = 1.25; foe.sy = .75; shake = 1.4; dust(FC.x, FG, 9, 0); await squash(foe, 1, 1, 200);
    dizzy(FC.x, FC.y - 15, 52); await tween(860, function (t) { foe.ox = Math.round(Math.sin(t * Math.PI * 4) * 1.5); }); foe.ox = 0;
    say(nm(foe, 1) + ' bows and hops off. The path is open.'); confetti(150);
    var c = cheer(3); await bow(); await hopOff(); await c; await sleep(900);
    S.ward = 3; status(); await foeIn();
  }
  /* ----- defeat, the gentle way: Pomelo runs out of puff, naps, and is back with full HP. Nothing is lost. ----- */
  async function defeat() {
    S.hp = 1; S.ward = 2; status(); say('The ward holds. ' + nm(me, 1) + ' is worn out.');
    wardGlow(); await sleep(260);
    foe.pose = 'windup'; await squash(foe, 1.16, .82, 200); await sleep(60);
    foe.pose = 'leap'; squash(foe, .9, 1.12, 100); await tween(150, function (t) { foe.oy = -Math.round(6 * easeOut(t)); });
    var p = { x: FL.x, y: FL.y, s: 3 }, o = addFx(1e6, function () { orb(p, '#d9c8ff', '#a48fcb'); });
    tween(180, function (t) { foe.oy = -Math.round(6 * (1 - easeIn(t))); }).then(function () { foe.pose = 'idle'; foe.sx = 1.14; foe.sy = .88; dust(FC.x, FG, 3, 0); squash(foe, 1, 1, 150); });
    await tween(560, function (t) { var e = t * .5 + easeIn(t) * .5; p.x = lerp(FL.x, MH.x, e); p.y = lerp(FL.y, MH.y, e) - Math.sin(t * Math.PI) * 14; p.s = lerp(3, 8, e); sparkle(p.x, p.y, '#d9c8ff'); });
    o.life = 0; me.pose = 'hurt'; me.flash = 7; shake = 3; S.hp = 0; status(); star(MH.x, MH.y, '#fff', 9, 16);
    await sleep(130);
    burst(MH.x, MH.y, WARD, 18, 1.8, .07, true); ring(MH.x, MH.y + 2, 8, 30, '#d9c8ff', 24, 1);
    await tween(950, function (t) { me.ox = Math.round(Math.sin(t * Math.PI * 3) * 3 * (1 - t * .5)); me.rot = Math.sin(t * Math.PI * 3) * .05 * (1 - t * .4); });   /* a woozy sway */
    me.ox = 0; me.rot = 0; me.pose = 'sleep';
    await tween(400, function (t) { var e = easeIn(t); me.oy = Math.round(5 * e); me.sy = lerp(1, .9, e); me.sx = lerp(1, 1.06, e); });   /* and down he goes */
    dust(me.bx, MG, 9, 0, true); shake = .9;
    say(nm(me, 1) + ' takes a short rest. Nothing is lost.'); snore(170);
    var hops = sleep(500).then(function () { return happyHops(2); });
    await tween(2700, function (t) { me.sy = .9 + .035 * Math.sin(t * Math.PI * 4); });   /* slow sleeping breaths */
    await hops;
    for (var i = 0; i < 5; i++) { S.hp++; status(); sparkle(MH.x - 16 + Math.random() * 28, MH.y - 2 + Math.random() * 10, '#b9e04a'); await sleep(170); }
    me.pose = 'crouch'; await tween(220, function (t) { me.oy = Math.round(5 * (1 - easeOut(t))); me.sy = lerp(.9, 1, t); me.sx = lerp(1.06, 1, t); });
    say('Rested and ready. The wards stay cracked.');
    me.pose = 'cheer'; me.sx = .94; me.sy = 1.08; for (var j = 0; j < 8; j++) sparkle(MH.x - 20 + Math.random() * 34, MH.y - 12 + Math.random() * 16, '#fff3b8');
    await tween(300, function (t) { me.oy = -Math.round(Math.sin(t * Math.PI) * 9); });
    me.oy = 0; me.sx = 1.12; me.sy = .9; dust(me.bx, MG, 6, 0, true); await squash(me, 1, 1, 150); await sleep(350); me.pose = 'idle';
  }

  /* ----- backdrop: Lorewood dusk, painted one scene pixel at a time ----- */
  function paint() {
    var u = parseFloat(getComputedStyle(scene).getPropertyValue('--u')) || 5;
    W = 2 * Math.ceil(scene.clientWidth / u / 2) + 2; cx = W / 2;
    T = Math.max(0, Math.ceil(scene.clientHeight / u) - H);   /* the canvas sits on the frame's floor; a taller frame just shows more sky */
    fxc.width = W; fxc.height = H + T; fxc.style.width = (W * u) + 'px'; fxc.style.height = ((H + T) * u) + 'px'; fxc.style.marginLeft = (-W * u / 2) + 'px';
    bgc.width = W; bgc.height = H + T;
    var c = bgc.getContext('2d'), hy = 25;
    ['#3a2a4f', '#553657', '#7a4660', '#a2566a', '#c8707a'].forEach(function (col, k) { var bh = (hy + T) / 5; c.fillStyle = col; c.fillRect(0, Math.round(k * bh), W, Math.ceil(bh) + 1); });
    c.translate(0, T);
    for (var x = 0; x < W; x++) {   /* two rows of treetops along the horizon */
      var a = 5 + Math.round(2.5 * Math.sin(x * .37) + 1.8 * Math.sin(x * .11 + 2));
      c.fillStyle = '#4a2f45'; c.fillRect(x, hy - a, 1, a);
      var b = 2 + Math.round(1.6 * Math.sin(x * .29 + 1) + 1.2 * Math.sin(x * .07));
      c.fillStyle = '#2f2236'; c.fillRect(x, hy - b, 1, b);
    }
    for (var lx = 9; lx < W; lx += 23) {   /* paper lanterns in the trees */
      var ly = hy - 4 - (lx * 7 % 3);
      c.fillStyle = 'rgba(255,190,120,.35)'; c.fillRect(lx - 1, ly - 1, 3, 3);
      c.fillStyle = '#ffb65e'; c.fillRect(lx, ly, 1, 1);
    }
    c.fillStyle = '#5c3b3f'; c.fillRect(0, hy, W, H - hy);
    var y = hy, step = 2, k = 0;   /* ground bands widen toward the viewer */
    while (y < H) { if (k % 2) { c.fillStyle = '#684447'; c.fillRect(0, y, W, step); } y += step; step += 1; k++; }
    function oval(ox, oy, rx, ry) {
      for (var py = -ry - 2; py <= ry + 2; py++) for (var px = -rx; px <= rx; px++) {
        var d = (px * px) / (rx * rx) + (py * py) / (ry * ry), d2 = (px * px) / (rx * rx) + ((py - 2) * (py - 2)) / (ry * ry);
        if (d <= 1) { c.fillStyle = d > .72 ? '#b5957a' : '#a08268'; c.fillRect(cx + ox + px, oy + py, 1, 1); }
        else if (d2 <= 1) { c.fillStyle = '#3f2a30'; c.fillRect(cx + ox + px, oy + py, 1, 1); }
      }
    }
    oval(foe.bx, foe.ground - 2, 24, 4); oval(me.bx, 60, 38, 8);
  }



  /* ----- the actions a page can play ----- */
  var ACTS = {
    spark:   { side: 'near', label: 'Zest spark',   line: function () { return nm(me, 1) + ' flicks a zest spark!'; }, run: function () { return MY_MOVES[0](loseWard); } },
    charge:  { side: 'near', label: 'Charge',       line: function () { return nm(me, 1) + ' charges!'; }, run: function () { return MY_MOVES[1](loseWard); } },
    stomp:   { side: 'near', label: 'Stomp ripple', line: function () { return nm(me, 1) + ' stomps. The ground ripples!'; }, run: function () { return MY_MOVES[2](loseWard); } },
    mehit:   { side: 'near', label: 'Takes a hit',  line: function () { return nm(me, 1) + ' takes the bump and shakes it off.'; }, run: function () { return hitMe(loseHp); } },
    cheer:   { side: 'near', label: 'Cheer',        line: function () { return nm(me, 1) + ' is pleased.'; }, run: function () { return cheer(2); } },
    lob:     { side: 'far',  label: 'Lantern lob',  line: function () { return nm(foe, 1) + ' lobs a lantern light.'; }, run: function () { return FOE_MOVES[0](loseHp); } },
    hop:     { side: 'far',  label: 'Hop bump',     line: function () { return nm(foe, 1) + ' hops in for a bump.'; }, run: function () { return FOE_MOVES[1](loseHp); } },
    foehit:  { side: 'far',  label: 'Takes a hit',  line: function () { return 'A ward cracks!'; }, run: function () { return hitFoe(loseWard); } },
    holds:   { side: 'far',  label: 'Ward holds',   line: function () { return 'The ward holds.'; }, run: function () { wardGlow(); return sleep(260).then(function () { foe.pose = 'windup'; return squash(foe, 1.08, .92, 160); }).then(function () { return sleep(260); }).then(function () { foe.pose = 'idle'; return squash(foe, 1, 1, 160); }); } },
    bow:     { side: 'far',  label: 'Bow',          line: function () { return nm(foe, 1) + ' bows.'; }, run: function () { return bow().then(function () { foe.pose = 'idle'; }); } },
    enter:   { side: 'round', label: 'Entrance',    line: function () { return nm(foe, 1) + ' hops onto the path!'; }, run: function () { return enter(); } },
    victory: { side: 'round', label: 'Victory',     run: victory },
    defeat:  { side: 'round', label: 'Defeat',      run: defeat }
  };
  function settle() {   /* whatever a move left behind, both stand at home again */
    [me, foe].forEach(function (f) { f.ox = 0; f.oy = 0; f.sx = 1; f.sy = 1; f.z = 1; f.rot = 0; f.alpha = 1; f.pose = 'idle'; f.flip = f.dir * (f.P.faces || 1); });
  }
  function play(id) {
    var a = ACTS[id]; if (!a || busy || !ready) return Promise.resolve(false);
    busy = true; if (opts.onBusy) opts.onBusy(true, id);
    if (S.ward <= 1) { S.ward = 3; S.shown = null; } if (S.hp <= 1) { S.hp = 5; S.shown = null; } status();
    if (a.line) say(a.line());
    return Promise.resolve().then(a.run).catch(function (e) { if (window.console) console.error(e); settle(); }).then(function () { return sleep(250); })
      .then(function () { busy = false; if (opts.onBusy) opts.onBusy(false, id); return true; });
  }
  function names() { scene.querySelector('.p-foe .nm').textContent = foe.P.name; scene.querySelector('.p-me .nm').textContent = me.P.name; }
  function setFighter(side, id) {
    var P = CREATURES[id]; if (!P || busy) return Promise.resolve(false);
    var f = fighter(P, side); if (side === 'near') me = f; else foe = f;
    if (!me || !foe) return f.loaded;
    points(); names(); paint();
    return f.loaded.then(function () { return true; });
  }
  var rz; function onResize() { clearTimeout(rz); rz = setTimeout(paint, 80); }
  window.addEventListener('resize', onResize);
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(scene);

  me = fighter(CREATURES[opts.near || 'pomelo'], 'near'); foe = fighter(CREATURES[opts.far || 'lantern-rabbit'], 'far');
  points(); names(); paint(); status(); foe.ox = 120; me.ox = -110;
  var whenReady = Promise.all([me.loaded, foe.loaded]).then(function () {
    ready = true; busy = true; if (opts.onBusy) opts.onBusy(true, 'enter');
    return (opts.still ? Promise.resolve(settle()) : enter()).then(function () { busy = false; if (opts.onBusy) opts.onBusy(false, 'enter'); });
  });
  requestAnimationFrame(loop);

  return {
    ready: whenReady, acts: ACTS, play: play, busy: function () { return busy; },
    guides: function (on) { guides = !!on; },
    fighter: function (side) { return side === 'near' ? me : foe; },
    setFighter: setFighter,
    refresh: function () { points(); paint(); },                       /* after a profile's numbers change */
    scaleAt: function (side, spot) { return absScale(side === 'near' ? me : foe, spot); },
    stop: function () { alive = false; window.removeEventListener('resize', onResize); }
  };
}
window.SQBattle2 = { mount: mount, FIELD: FIELD, SPOTS: SPOTS };
})();
