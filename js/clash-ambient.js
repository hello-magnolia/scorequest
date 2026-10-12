/* ============================================================
   ScoreQuest: Critter Clash ambient layer (clash.html)
   ------------------------------------------------------------
   A quiet pixel backdrop behind the page, one mood per biome.
   Lorewood: a few maple leaves drifting down in muted reds and
   ambers, low opacity, slow. It lives on a fixed canvas under the
   cards, so it only shows in the margins and gaps.
   Follows the Motion setting: full = drifting, calm = fewer and
   slower, off = a still scatter. Pauses while the tab is hidden.
   API: SQAmbient.biome(id), SQAmbient.setMotion(m)
   ============================================================ */
(function () {
  'use strict';
  var cv = document.getElementById('ambient');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var S = 3;                       /* one art pixel = 3 css pixels */
  var W = 0, H = 0, dpr = 1;
  var biomeId = null, motion = 'full', leaves = [], raf = 0, last = 0;

  /* 7x7 maple leaf, two poses for a pixel "flutter" */
  var LEAF = [
    ['...a...', '.a.a.a.', '.aabaa.', 'aaabaaa', '.aabaa.', '...b...', '...b...'],
    ['..a....', '..aa.a.', 'aaabaa.', '.aabaaa', '.aabaa.', '..b....', '.b.....']
  ];
  var PALETTES = {
    lorewood: [['#b5473a', '#7e2f27'], ['#c97a3d', '#8a4f25'], ['#d6a24a', '#8d6a2a'], ['#9c3d4a', '#6a2833']]
  };

  function size() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  function spawn(anyY) {
    var pal = PALETTES[biomeId];
    var c = pal[Math.floor(Math.random() * pal.length)];
    return {
      x: Math.random() * W, y: anyY ? Math.random() * H : -30,
      vy: 8 + Math.random() * 10, sway: 10 + Math.random() * 18, ph: Math.random() * 6.28,
      sp: .4 + Math.random() * .5, c: c, f: Math.random() < .5 ? 0 : 1, flip: Math.random() < .5,
      a: .32 + Math.random() * .22, scale: Math.random() < .3 ? 2 : 1
    };
  }
  function count() { return motion === 'calm' ? 7 : 16; }
  function seed() {
    leaves = [];
    if (!PALETTES[biomeId]) return;
    for (var i = 0; i < count(); i++) leaves.push(spawn(true));
  }
  function drawLeaf(l, t) {
    var rows = LEAF[motion === 'off' ? l.f : (Math.floor(t / 700 + l.ph) % 2 ? 1 : 0)];
    var s = S * l.scale, x0 = Math.round(l.x + Math.sin(t / 1000 * l.sp + l.ph) * l.sway), y0 = Math.round(l.y);
    ctx.globalAlpha = l.a;
    for (var y = 0; y < 7; y++) for (var x = 0; x < 7; x++) {
      var ch = rows[y][l.flip ? 6 - x : x];
      if (ch === '.') continue;
      ctx.fillStyle = ch === 'a' ? l.c[0] : l.c[1];
      ctx.fillRect(x0 + x * s, y0 + y * s, s, s);
    }
    ctx.globalAlpha = 1;
  }
  function frame(t) {
    raf = 0;
    var dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
    ctx.clearRect(0, 0, W, H);
    var k = motion === 'calm' ? .55 : 1;
    leaves.forEach(function (l, i) {
      if (motion !== 'off') l.y += l.vy * k * dt;
      if (l.y > H + 30) leaves[i] = spawn(false);
      drawLeaf(l, motion === 'off' ? 0 : t * k);
    });
    if (motion !== 'off' && leaves.length && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function restart() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0;
    ctx.clearRect(0, 0, W, H);
    if (!leaves.length) return;
    raf = requestAnimationFrame(frame);
  }

  size();
  window.addEventListener('resize', function () { size(); seed(); restart(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) restart(); });
  window.SQAmbient = {
    biome: function (id) { biomeId = id; seed(); restart(); },
    setMotion: function (m) { motion = m === 'calm' || m === 'off' ? m : 'full'; seed(); restart(); }
  };
})();
