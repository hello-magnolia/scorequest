/* ============================================================
   ScoreQuest: Critter Clash ambient layer (clash.html)
   ------------------------------------------------------------
   A quiet pixel backdrop behind the page, one mood per biome.
   It lives on a fixed canvas under the cards, so it only shows in
   the margins and gaps: few particles, low opacity, slow.

     lorewood       maple leaves falling
     storyforge     embers rising, flickering
     inkreef        bubbles rising
     syntaxcitadel  punctuation marks drifting down
     mirrormines    crystal sparkles twinkling
     infinityisles  little infinity loops floating up
     datadocks      gulls gliding across
     prismpeaks     snowflakes falling

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
  var biomeId = null, motion = 'full', parts = [], raf = 0, last = 0;

  /* sprites: one character per pixel; 'a' main color, 'b' second color, '.' empty.
     A sprite with two poses flips between them (leaf flutter, gull wings). */
  var LEAF = [['...a...', '.a.a.a.', '.aabaa.', 'aaabaaa', '.aabaa.', '...b...', '...b...'],
              ['..a....', '..aa.a.', 'aaabaa.', '.aabaaa', '.aabaa.', '..b....', '.b.....']];
  var EMBER_BIG = [['ab', 'bb']], EMBER_SMALL = [['a']];
  var BUBBLE = [['.aaa.', 'a..ba', 'a...a', 'a...a', '.aaa.']], BUBBLE_SMALL = [['.a.', 'a.a', '.a.']];
  var COMMA = [['aa', 'aa', '.a', 'a.']], PERIOD = [['aa', 'aa']], SEMI = [['aa', 'aa', '..', 'aa', 'aa', '.a', 'a.']], QUOTE = [['a.a', 'a.a', '...']];
  var SPARK = [['..a..', '..a..', 'aabaa', '..a..', '..a..']], GLINT = [['.a.', 'aba', '.a.']];
  var LOOP = [['.aa...aa.', 'a..a.a..a', 'a...b...a', 'a..a.a..a', '.aa...aa.']];
  var GULL = [['a.....a', '.a...a.', '..aba..'], ['.......', 'aaa.aaa', '...b...']];
  var FLAKE = [['.a.a.', 'a.b.a', '.bbb.', 'a.b.a', '.a.a.']], DOT = [['ab', 'ba']];

  /* per biome: sprite sets, color pairs, how many, how they move.
     vy > 0 falls, vy < 0 rises; vx drifts sideways; twinkle pulses opacity */
  var MOODS = {
    lorewood: { sprites: [LEAF], pal: [['#b5473a', '#7e2f27'], ['#c97a3d', '#8a4f25'], ['#d6a24a', '#8d6a2a'], ['#9c3d4a', '#6a2833']],
      n: 16, vy: [8, 18], vx: [-2, 2], sway: [10, 28], alpha: [.32, .54], flutter: 700 },
    storyforge: { sprites: [EMBER_BIG, EMBER_BIG, EMBER_SMALL], pal: [['#f3b25a', '#d9642e'], ['#e98a3a', '#b34a22'], ['#f6cf7a', '#e08a3a']],
      n: 24, vy: [-22, -10], vx: [-3, 3], sway: [4, 12], alpha: [.5, .8], twinkle: true, scale2: .55 },
    inkreef: { sprites: [BUBBLE, BUBBLE_SMALL, BUBBLE_SMALL], pal: [['#6fa9bd', '#d9eef4'], ['#5c93b0', '#cfe6ee'], ['#7bbcb4', '#e1f3ef']],
      n: 16, vy: [-14, -6], vx: [-1, 1], sway: [4, 10], alpha: [.3, .5] },
    syntaxcitadel: { sprites: [COMMA, PERIOD, SEMI, QUOTE], pal: [['#8f8a7a', '#8f8a7a'], ['#a39468', '#a39468'], ['#7d8596', '#7d8596']],
      n: 16, vy: [6, 12], vx: [-1, 1], sway: [6, 14], alpha: [.35, .55], scale2: .6 },
    mirrormines: { sprites: [SPARK, GLINT, GLINT], pal: [['#a88bd9', '#efe6ff'], ['#8f7ac9', '#e2d9ff'], ['#c59ae0', '#f6ecff']],
      n: 18, vy: [-4, -1], vx: [-1, 1], sway: [2, 6], alpha: [.3, .6], twinkle: true },
    infinityisles: { sprites: [LOOP, DOT], pal: [['#d98ab5', '#f6d4e6'], ['#b49ad9', '#e9defa'], ['#e5a3a3', '#f9dede']],
      n: 12, vy: [-8, -3], vx: [1, 4], sway: [6, 14], alpha: [.28, .48], twinkle: true },
    datadocks: { sprites: [GULL], pal: [['#6f8496', '#c9d3db'], ['#5d7183', '#b9c6d1']],
      n: 6, vy: [-1, 1], vx: [10, 20], sway: [4, 10], alpha: [.35, .55], flutter: 420, scale2: .5 },
    prismpeaks: { sprites: [FLAKE, DOT, DOT], pal: [['#8fb4cf', '#c9dcea'], ['#a3bfd9', '#dbe7f2'], ['#9fc7d6', '#d8edf3']],
      n: 22, vy: [6, 14], vx: [-2, 1], sway: [8, 20], alpha: [.35, .6] }
  };
  function rnd(r) { return r[0] + Math.random() * (r[1] - r[0]); }

  function size() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  function spawn(m, anywhere) {
    var p = {
      spr: m.sprites[Math.floor(Math.random() * m.sprites.length)],
      c: m.pal[Math.floor(Math.random() * m.pal.length)],
      vx: rnd(m.vx), vy: rnd(m.vy), sway: rnd(m.sway), ph: Math.random() * 6.28, sp: .4 + Math.random() * .5,
      a: rnd(m.alpha), flip: Math.random() < .5, pose: Math.random() < .5 ? 0 : 1,
      scale: Math.random() < (m.scale2 != null ? m.scale2 : .3) ? 2 : 1
    };
    if (anywhere) { p.x = Math.random() * W; p.y = Math.random() * H; }
    else if (Math.abs(p.vx) > Math.abs(p.vy)) { p.x = p.vx > 0 ? -40 : W + 40; p.y = Math.random() * H * .8; }
    else { p.x = Math.random() * W; p.y = p.vy > 0 ? -30 : H + 30; }
    return p;
  }
  function count(m) { return motion === 'calm' ? Math.ceil(m.n * .45) : m.n; }
  function seed() {
    parts = [];
    var m = MOODS[biomeId];
    if (!m) return;
    for (var i = 0; i < count(m); i++) parts.push(spawn(m, true));
  }
  function draw(p, m, t) {
    var poses = p.spr, rows = poses[0];
    if (poses.length > 1) rows = motion === 'off' ? poses[p.pose] : poses[Math.floor(t / (m.flutter || 600) + p.ph) % 2];
    var s = S * p.scale, w = rows[0].length;
    var x0 = Math.round(p.x + Math.sin(t / 1000 * p.sp + p.ph) * p.sway), y0 = Math.round(p.y);
    var a = p.a;
    if (m.twinkle && motion !== 'off') a *= .55 + .45 * Math.sin(t / 380 * p.sp + p.ph * 3);
    ctx.globalAlpha = Math.max(0, a);
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < w; x++) {
      var ch = rows[y][p.flip ? w - 1 - x : x];
      if (ch === '.') continue;
      ctx.fillStyle = ch === 'a' ? p.c[0] : p.c[1];
      ctx.fillRect(x0 + x * s, y0 + y * s, s, s);
    }
    ctx.globalAlpha = 1;
  }
  function frame(t) {
    raf = 0;
    var m = MOODS[biomeId];
    var dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
    ctx.clearRect(0, 0, W, H);
    if (!m) return;
    var k = motion === 'calm' ? .55 : 1;
    parts.forEach(function (p, i) {
      if (motion !== 'off') { p.y += p.vy * k * dt; p.x += p.vx * k * dt; }
      if (p.y > H + 40 || p.y < -50 || p.x > W + 60 || p.x < -60) parts[i] = p = spawn(m, false);
      draw(p, m, motion === 'off' ? 0 : t * k);
    });
    if (motion !== 'off' && parts.length && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function restart() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0;
    ctx.clearRect(0, 0, W, H);
    if (parts.length) raf = requestAnimationFrame(frame);
  }

  size();
  window.addEventListener('resize', function () { size(); seed(); restart(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) restart(); });
  window.SQAmbient = {
    biome: function (id) { biomeId = id; seed(); restart(); },
    setMotion: function (m) { motion = m === 'calm' || m === 'off' ? m : 'full'; seed(); restart(); }
  };
})();
