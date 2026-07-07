/* ============================================================
   PixelWorld — procedural pixel-art scenes for ScoreQuest
   Works in the browser (window.PixelWorld) and in Node (module.exports)
   Every scene draws into a low-res canvas; the page scales it up
   with image-smoothing off for crisp pixels.
   ============================================================ */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.PixelWorld = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- utilities ---------- */
  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function px(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  /* Quantised sky: vertical bands, pixel-style (no smooth gradient) */
  function skyBands(ctx, W, H, colors, toY) {
    const bandH = (toY === undefined ? H : toY) / colors.length;
    colors.forEach((c, i) => px(ctx, 0, Math.floor(i * bandH), W, Math.ceil(bandH) + 1, c));
  }

  /* Dither the seam between two bands so it reads soft */
  function dither(ctx, W, y, above, below, seed, density) {
    const r = makeRng(seed);
    for (let x = 0; x < W; x += 2) {
      if (r() < (density || 0.5)) px(ctx, x, y - 1, 2, 1, below);
      if (r() < (density || 0.5)) px(ctx, x, y, 2, 1, above);
    }
  }

  /* Mountain ridge as a random-walk silhouette filled to the bottom */
  function ridge(ctx, W, H, baseY, amp, step, color, seed) {
    const r = makeRng(seed);
    let y = baseY + (r() - 0.5) * amp;
    for (let x = 0; x < W; x += step) {
      y += (r() - 0.5) * amp * 0.6;
      y = Math.max(baseY - amp, Math.min(baseY + amp * 0.4, y));
      px(ctx, x, y, step, H - y, color);
    }
  }

  function pine(ctx, x, baseY, h, color, trunk) {
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
      const tw = Math.round(h * 0.9) - i * Math.round(h * 0.24);
      const ty = baseY - Math.round((i + 1) * h * 0.3);
      px(ctx, x - tw / 2, ty, tw, Math.round(h * 0.3) + 1, color);
    }
    px(ctx, x - 1, baseY - 2, 2, 3, trunk || '#3B2A20');
  }

  function roundTree(ctx, x, baseY, rHalf, leaf, leafLight, trunk) {
    px(ctx, x - 1, baseY - rHalf, 3, rHalf, trunk || '#4A332A');
    px(ctx, x - rHalf, baseY - rHalf * 2.2, rHalf * 2, rHalf * 1.6, leaf);
    px(ctx, x - rHalf + 2, baseY - rHalf * 2.2 - 2, rHalf * 2 - 4, 2, leaf);
    px(ctx, x - rHalf + 2, baseY - rHalf * 2.0, rHalf * 0.8, 2, leafLight);
  }

  function cloud(ctx, x, y, w, c) {
    px(ctx, x, y, w, 3, c);
    px(ctx, x + w * 0.15, y - 2, w * 0.55, 2, c);
    px(ctx, x + w * 0.3, y + 3, w * 0.5, 2, c);
  }

  function starfield(ctx, W, H, count, seed, t, color, twinkleColor) {
    const r = makeRng(seed);
    for (let i = 0; i < count; i++) {
      const x = r() * W, y = r() * H, phase = r() * 6.28, speed = 0.6 + r();
      const tw = Math.sin((t || 0) * speed + phase);
      if (tw > -0.2) px(ctx, x, y, 1, 1, tw > 0.75 ? (twinkleColor || '#FFF7DF') : color);
    }
  }

  function glowPlus(ctx, x, y, c) {
    px(ctx, x, y, 1, 1, c);
    px(ctx, x - 1, y, 1, 1, c); px(ctx, x + 1, y, 1, 1, c);
    px(ctx, x, y - 1, 1, 1, c); px(ctx, x, y + 1, 1, 1, c);
  }

  function flowers(ctx, W, yMin, yMax, count, seed, petal, heart) {
    const r = makeRng(seed);
    for (let i = 0; i < count; i++) {
      const x = 4 + r() * (W - 8), y = yMin + r() * (yMax - yMin);
      glowPlus(ctx, x, y, petal);
      px(ctx, x, y, 1, 1, heart);
    }
  }

  function grassTufts(ctx, W, yMin, yMax, count, seed, color, t, sway) {
    const r = makeRng(seed);
    for (let i = 0; i < count; i++) {
      const x = r() * W, y = yMin + r() * (yMax - yMin), ph = r() * 6.28;
      const lean = sway ? Math.round(Math.sin((t || 0) * 1.1 + ph)) : 0;
      px(ctx, x, y - 2, 1, 3, color);
      px(ctx, x + lean, y - 3, 1, 1, color);
    }
  }

  /* ============================================================
     HERO — "Duskmeadow": calm valley at golden hour, winding path
     to the distant Academy tower. Logical size 480 x 270.
     ============================================================ */
  function drawHero(ctx, W, H, t) {
    t = t || 0;
    // dusk sky
    skyBands(ctx, W, H, ['#241B4D', '#332566', '#4A3378', '#6E4680', '#A05E7E', '#D08267', '#EFA96E'], H * 0.62);
    for (let i = 1; i < 7; i++) {
      const y = Math.round((H * 0.62 / 7) * i);
      dither(ctx, W, y, '#00000000', '#00000000', 90 + i, 0); // seams stay crisp; stars soften instead
    }
    starfield(ctx, W, H * 0.34, 70, 7, t, '#CDB9E8', '#FFF3D6');

    // slow-drifting clouds (two parallax speeds, wrap around)
    const drift1 = (t * 3) % (W + 120) - 120;
    const drift2 = (t * 1.4) % (W + 160) - 160;
    cloud(ctx, drift1, 34, 64, '#8A6FA8'); cloud(ctx, drift1 + 190, 58, 44, '#7B5F9C');
    cloud(ctx, drift2 + 60, 88, 88, '#B07A88'); cloud(ctx, drift2 + 320, 104, 56, '#C08A7C');

    // sun low on horizon with banded halo
    const sx = W * 0.66, sy = H * 0.56;
    px(ctx, sx - 14, sy - 4, 28, 8, '#FFDFA0');
    px(ctx, sx - 10, sy - 7, 20, 14, '#FFDFA0');
    px(ctx, sx - 6, sy - 10, 12, 20, '#FFF2CE');

    // far + near mountain ridges
    ridge(ctx, W, H, H * 0.50, 26, 4, '#3B2C66', 11);
    ridge(ctx, W, H, H * 0.56, 34, 4, '#2E2354', 23);
    // snow caps on near ridge (sparse)
    starfield(ctx, W, H * 0.5, 26, 5, 0, '#8E7CC3', '#8E7CC3');

    // treeline
    const rTree = makeRng(41);
    for (let x = 6; x < W; x += 14 + rTree() * 10) {
      pine(ctx, x, H * 0.66, 14 + rTree() * 8, '#1F3A46');
    }

    // meadow: three banded slopes
    px(ctx, 0, H * 0.64, W, H, '#2E5E48');
    px(ctx, 0, H * 0.72, W, H, '#3B7351');
    px(ctx, 0, H * 0.84, W, H, '#4C8A5B');
    dither(ctx, W, H * 0.72, '#2E5E48', '#3B7351', 61, 0.5);
    dither(ctx, W, H * 0.84, '#3B7351', '#4C8A5B', 62, 0.5);

    // winding path to the tower
    const pathPts = [[W * 0.52, H * 0.66], [W * 0.44, H * 0.74], [W * 0.56, H * 0.82], [W * 0.42, H * 0.92], [W * 0.5, H + 4]];
    for (let i = 0; i < pathPts.length - 1; i++) {
      const [x1, y1] = pathPts[i], [x2, y2] = pathPts[i + 1];
      const steps = 14;
      for (let s = 0; s <= steps; s++) {
        const xx = x1 + (x2 - x1) * (s / steps), yy = y1 + (y2 - y1) * (s / steps);
        const wdt = 3 + (yy / H) * 14;
        px(ctx, xx - wdt / 2, yy, wdt, 2, '#C9A36B');
        if (s % 3 === 0) px(ctx, xx - wdt / 2 + 1, yy, 2, 1, '#E0BE85');
      }
    }

    // the Academy tower on the hill (goal of the quest)
    const tx = W * 0.53, ty = H * 0.66;
    px(ctx, tx - 7, ty - 34, 14, 34, '#4A3A5E');           // body
    px(ctx, tx - 9, ty - 38, 18, 5, '#3A2D4C');            // parapet
    px(ctx, tx - 5, ty - 50, 10, 13, '#4A3A5E');           // upper turret
    px(ctx, tx - 7, ty - 54, 14, 5, '#6E4680');            // roof band
    px(ctx, tx - 1, ty - 60, 2, 7, '#3A2D4C');             // spire
    px(ctx, tx - 1, ty - 62, 2, 2, '#F2B63C');             // beacon
    // lit windows (two flicker slowly)
    const winOn = Math.sin(t * 0.8) > -0.4;
    px(ctx, tx - 4, ty - 28, 3, 4, '#F2B63C');
    px(ctx, tx + 2, ty - 20, 3, 4, winOn ? '#F2B63C' : '#8A6A3A');
    px(ctx, tx - 2, ty - 46, 3, 3, '#FFD974');

    // meadow dressing
    const rP = makeRng(77);
    for (let i = 0; i < 9; i++) {
      const fx = rP() * W;
      if (Math.abs(fx - tx) > 40) pine(ctx, fx, H * (0.78 + rP() * 0.14), 16 + rP() * 12, '#20452F');
    }
    roundTree(ctx, W * 0.12, H * 0.9, 10, '#2E6B3F', '#4C8A5B');
    roundTree(ctx, W * 0.87, H * 0.86, 8, '#2E6B3F', '#4C8A5B');
    flowers(ctx, W, H * 0.74, H * 0.98, 26, 31, '#E58BA5', '#F2B63C');
    flowers(ctx, W, H * 0.7, H * 0.9, 14, 32, '#C9CFF2', '#FFFFFF');
    grassTufts(ctx, W, H * 0.7, H * 0.99, 60, 33, '#63A768', t, true);

    // fireflies wandering near the treeline
    const rF = makeRng(99);
    for (let i = 0; i < 10; i++) {
      const bx = rF() * W, by = H * (0.6 + rF() * 0.3), ph = rF() * 6.28;
      const fx = bx + Math.sin(t * 0.5 + ph) * 6, fy = by + Math.cos(t * 0.4 + ph) * 3;
      const on = Math.sin(t * 1.6 + ph) > 0.1;
      if (on) glowPlus(ctx, fx, fy, '#FFE79A');
    }
  }

  /* ============================================================
     BIOME CARD SCENES — logical size 240 x 104 each
     ============================================================ */

  /* Reading & Vocabulary — Gloamwood: lantern-lit library forest */
  function drawGloamwood(ctx, W, H, t) {
    skyBands(ctx, W, H, ['#14281E', '#1B3527', '#234230', '#2C5039'], H * 0.7);
    starfield(ctx, W, H * 0.4, 24, 3, t, '#7FB58C', '#D9F2C9');
    ridge(ctx, W, H, H * 0.52, 18, 4, '#1B3527', 5);
    px(ctx, 0, H * 0.72, W, H, '#254B32');
    px(ctx, 0, H * 0.86, W, H, '#2F5C3B');
    // giant trees with hanging lanterns
    const r = makeRng(8);
    for (let i = 0; i < 6; i++) {
      const x = 16 + i * (W / 6) + r() * 10;
      const h = 34 + r() * 18;
      px(ctx, x - 2, H * 0.72 - h, 5, h, '#2A1E17');
      px(ctx, x - 12, H * 0.72 - h - 10, 25, 14, '#1E4230');
      px(ctx, x - 8, H * 0.72 - h - 16, 17, 8, '#265239');
      // lantern
      const ly = H * 0.72 - h + 8 + Math.sin((t || 0) + i) * 1;
      px(ctx, x + 4, ly, 3, 4, '#F2B63C');
      glowPlus(ctx, x + 5, ly + 1, '#FFE79A');
    }
    // open books resting on stones
    for (let i = 0; i < 3; i++) {
      const bx = 30 + i * 80, by = H * 0.88;
      px(ctx, bx, by, 12, 4, '#7A6248');
      px(ctx, bx + 1, by - 3, 10, 3, '#F4E9D0');
      px(ctx, bx + 5, by - 3, 1, 3, '#B7A27E');
    }
    grassTufts(ctx, W, H * 0.76, H * 0.98, 30, 12, '#3E7A4C', t, true);
    flowers(ctx, W, H * 0.78, H * 0.96, 8, 13, '#9AD9B0', '#F4E9D0');
  }

  /* Grammar & Writing — Inkmarsh: teal wetland with glowing ink pools */
  function drawInkmarsh(ctx, W, H, t) {
    skyBands(ctx, W, H, ['#0E2830', '#12333C', '#174049', '#1D4E57'], H * 0.55);
    starfield(ctx, W, H * 0.3, 18, 4, t, '#6FB5B8', '#D6F5F0');
    ridge(ctx, W, H, H * 0.42, 14, 4, '#123039', 6);
    // water
    px(ctx, 0, H * 0.55, W, H, '#0F3A44');
    // glowing ripples
    const r = makeRng(9);
    for (let i = 0; i < 8; i++) {
      const y = H * (0.6 + r() * 0.34), x = r() * W, w = 12 + r() * 20;
      const shimmer = Math.sin((t || 0) * 1.2 + i) * 3;
      px(ctx, x + shimmer, y, w, 1, i % 2 ? '#57C7CE' : '#2E7D86');
    }
    // reed islands with quill-like reeds
    for (let i = 0; i < 4; i++) {
      const ix = 20 + i * (W / 4) + r() * 12, iy = H * (0.72 + r() * 0.16);
      px(ctx, ix - 10, iy, 22, 4, '#1D4A38');
      for (let q = 0; q < 4; q++) {
        const qx = ix - 7 + q * 5;
        px(ctx, qx, iy - 12, 1, 12, '#2E6B55');
        px(ctx, qx - 1, iy - 15, 3, 4, '#CFEFE3'); // feather tip = quill
      }
    }
    // floating rune-letters glowing above the water
    const glyphs = makeRng(21);
    for (let i = 0; i < 5; i++) {
      const gx = glyphs() * W, gy = H * 0.5 + Math.sin((t || 0) * 0.8 + i * 1.7) * 3;
      glowPlus(ctx, gx, gy, '#8DE8E0');
    }
  }

  /* Algebra — Copperpeak: warm canyon mines with number crystals */
  function drawCopperpeak(ctx, W, H, t) {
    skyBands(ctx, W, H, ['#3A1F1B', '#5C2E22', '#8A452B', '#C96A3D'], H * 0.5);
    // sun disc
    px(ctx, W * 0.7 - 8, H * 0.3, 16, 10, '#F2B63C');
    px(ctx, W * 0.7 - 5, H * 0.27, 10, 16, '#F2B63C');
    ridge(ctx, W, H, H * 0.42, 22, 4, '#6E3520', 7);
    ridge(ctx, W, H, H * 0.55, 26, 5, '#552817', 8);
    px(ctx, 0, H * 0.74, W, H, '#40200F');
    px(ctx, 0, H * 0.88, W, H, '#331A0C');
    // mine entrance
    px(ctx, W * 0.42, H * 0.6, 26, 16, '#1E0F08');
    px(ctx, W * 0.4, H * 0.58, 30, 3, '#7A4A2A');
    px(ctx, W * 0.41, H * 0.6, 2, 16, '#7A4A2A');
    px(ctx, W * 0.67, H * 0.6, 2, 16, '#7A4A2A');
    // glowing amber crystals, pulsing softly
    const r = makeRng(14);
    for (let i = 0; i < 7; i++) {
      const cx = r() * W, cy = H * (0.76 + r() * 0.2), h = 6 + r() * 8;
      const bright = Math.sin((t || 0) * 1.4 + i) > 0 ? '#FFD974' : '#F2B63C';
      px(ctx, cx, cy - h, 3, h, bright);
      px(ctx, cx + 3, cy - h * 0.6, 2, h * 0.6, '#C98A2E');
      glowPlus(ctx, cx + 1, cy - h - 2, '#FFF0C2');
    }
    // cart tracks
    px(ctx, 0, H * 0.8, W, 1, '#5C3A22');
    for (let x = 0; x < W; x += 8) px(ctx, x, H * 0.79, 1, 3, '#5C3A22');
  }

  /* Advanced Math — Starfall Summit: aurora over night peaks */
  function drawStarfall(ctx, W, H, t) {
    skyBands(ctx, W, H, ['#0B0D28', '#101336', '#161A44', '#1D2148'], H);
    starfield(ctx, W, H * 0.8, 60, 15, t, '#9BA6E8', '#FFFFFF');
    // aurora ribbons that slowly breathe
    const r = makeRng(16);
    for (let band = 0; band < 3; band++) {
      const baseY = 14 + band * 12;
      for (let x = 0; x < W; x += 3) {
        const y = baseY + Math.sin(x * 0.05 + (t || 0) * 0.6 + band * 2) * 6;
        px(ctx, x, y, 3, 2, band === 1 ? '#57C7A0' : '#8E7CC3');
      }
    }
    // comet streaks
    for (let i = 0; i < 2; i++) {
      const cx = ((t || 0) * (18 + i * 9) + i * 140) % (W + 60) - 30;
      const cy = 18 + i * 26 + cx * 0.14;
      px(ctx, cx, cy, 8, 1, '#FFFFFF');
      px(ctx, cx + 8, cy, 3, 1, '#FFE79A');
    }
    ridge(ctx, W, H, H * 0.6, 30, 4, '#232858', 17);
    ridge(ctx, W, H, H * 0.74, 26, 5, '#181C44', 18);
    // snow caps
    const rs = makeRng(19);
    for (let i = 0; i < 20; i++) px(ctx, rs() * W, H * (0.5 + rs() * 0.16), 2, 1, '#C9CFF2');
    // observatory dome on the summit
    const ox = W * 0.62, oy = H * 0.56;
    px(ctx, ox - 8, oy - 8, 16, 8, '#3A3F6E');
    px(ctx, ox - 5, oy - 12, 10, 4, '#4A4F80');
    px(ctx, ox - 1, oy - 14, 2, 3, '#C9CFF2');
    px(ctx, ox - 2, oy - 6, 4, 3, '#FFD974');
  }

  /* Geometry & Trig — Prism Tidepools: dawn beach of crystal shapes */
  function drawPrism(ctx, W, H, t) {
    skyBands(ctx, W, H, ['#6E4680', '#A05E7E', '#D08267', '#EFA96E', '#F5C98E'], H * 0.45);
    // sea with sparkles
    px(ctx, 0, H * 0.45, W, H * 0.3, '#3E8CA3');
    px(ctx, 0, H * 0.45, W, 2, '#7FC4D4');
    const r = makeRng(22);
    for (let i = 0; i < 16; i++) {
      const y = H * (0.47 + r() * 0.24), x = (r() * W + (t || 0) * 6) % W;
      px(ctx, x, y, 3, 1, '#8FD4E0');
    }
    // sand
    px(ctx, 0, H * 0.72, W, H, '#E3C48F');
    px(ctx, 0, H * 0.72, W, 2, '#F2DCA8');
    px(ctx, 0, H * 0.9, W, H, '#D2B078');
    // crystal prisms in pure geometric shapes (triangle, square, hex-ish)
    const shapes = [
      { x: W * 0.16, c: '#8E7CC3', hl: '#C9CFF2' },
      { x: W * 0.4, c: '#57C7A0', hl: '#B7F0DC' },
      { x: W * 0.63, c: '#E58BA5', hl: '#FFD1DE' },
      { x: W * 0.84, c: '#F2B63C', hl: '#FFE79A' },
    ];
    shapes.forEach((s, i) => {
      const baseY = H * 0.82, hgt = 16 + (i % 2) * 8;
      // stepped pyramid = pixel triangle
      for (let step = 0; step < hgt; step += 2) {
        const w = 2 + ((hgt - step) * 0.9);
        px(ctx, s.x - w / 2, baseY - step - 2, w, 2, s.c);
      }
      const gleam = Math.sin((t || 0) * 1.1 + i * 1.5) > 0.3;
      px(ctx, s.x - 1, baseY - hgt, 2, 3, gleam ? '#FFFFFF' : s.hl);
      // reflection in wet sand
      px(ctx, s.x - 3, baseY + 2, 6, 1, s.hl);
    });
    // compass rose etched in sand
    glowPlus(ctx, W * 0.52, H * 0.9, '#B78A4E');
  }

  /* Science (ACT) — Lumen Glade: bioluminescent research grove */
  function drawLumen(ctx, W, H, t) {
    skyBands(ctx, W, H, ['#170F2E', '#1E1440', '#261A4E', '#2E2058'], H * 0.62);
    starfield(ctx, W, H * 0.4, 26, 25, t, '#8E7CC3', '#E8DEFF');
    ridge(ctx, W, H, H * 0.5, 16, 4, '#221949', 26);
    px(ctx, 0, H * 0.66, W, H, '#241A4A');
    px(ctx, 0, H * 0.82, W, H, '#2C2156');
    // giant glowing mushrooms
    const r = makeRng(27);
    for (let i = 0; i < 5; i++) {
      const mx = 22 + i * (W / 5) + r() * 8, my = H * (0.78 + r() * 0.12);
      const mh = 12 + r() * 12;
      px(ctx, mx - 1, my - mh, 3, mh, '#CBB8E8');
      const capW = 10 + r() * 8;
      const pulse = Math.sin((t || 0) * 0.9 + i) * 0.5 + 0.5;
      px(ctx, mx - capW / 2, my - mh - 4, capW, 5, pulse > 0.5 ? '#B369D9' : '#9B54C4');
      px(ctx, mx - capW / 2 + 1, my - mh - 5, capW - 2, 1, '#D9A7F0');
      // glowing spots on the cap
      px(ctx, mx - 2, my - mh - 3, 1, 1, '#7FE3C0');
      px(ctx, mx + 2, my - mh - 2, 1, 1, '#7FE3C0');
    }
    // drifting spores
    const rs = makeRng(28);
    for (let i = 0; i < 14; i++) {
      const sx = (rs() * W + (t || 0) * 3.5 + i * 5) % W;
      const sy = H * (0.3 + rs() * 0.6) + Math.sin((t || 0) + i) * 2;
      px(ctx, sx, sy, 1, 1, '#7FE3C0');
    }
    // tiny field-station tent with a lamp
    px(ctx, W * 0.5 - 8, H * 0.9 - 8, 16, 8, '#3E8CA3');
    px(ctx, W * 0.5 - 10, H * 0.9 - 9, 20, 2, '#57C7CE');
    px(ctx, W * 0.5 - 1, H * 0.9 - 5, 3, 5, '#12333C');
    glowPlus(ctx, W * 0.5 + 11, H * 0.9 - 10, '#FFE79A');
  }

  /* Craft & Structure — Echo Vale: dawn canyon with glowing carved runes */
  function drawEchoVale(ctx, W, H, t) {
    skyBands(ctx, W, H, ['#6E4680', '#9A5E7E', '#C97F6E', '#E5A28F'], H * 0.4);
    // far canyon wall
    px(ctx, 0, H * 0.4, W, H, '#B07A50');
    ridge(ctx, W, H, H * 0.36, 14, 5, '#C98A5A', 35);
    // canyon shadow walls left/right
    px(ctx, 0, H * 0.3, W * 0.2, H, '#8A5A3A');
    px(ctx, W * 0.8, H * 0.26, W * 0.2, H, '#8A5A3A');
    px(ctx, W * 0.06, H * 0.44, W * 0.1, H, '#6E4630');
    px(ctx, W * 0.84, H * 0.4, W * 0.1, H, '#6E4630');
    // river below
    px(ctx, W * 0.3, H * 0.82, W * 0.4, H * 0.18, '#3E8CA3');
    const r = makeRng(36);
    for (let i = 0; i < 6; i++) px(ctx, W * 0.32 + r() * W * 0.34, H * (0.84 + r() * 0.12), 6, 1, '#7FC4D4');
    // carved glowing runes on the walls, pulsing in sequence like an echo
    const runes = [[0.1, 0.5], [0.14, 0.62], [0.88, 0.46], [0.9, 0.6], [0.86, 0.72], [0.12, 0.74]];
    runes.forEach(function (p, i) {
      const on = Math.sin((t || 0) * 1.2 - i * 0.7) > 0;
      const c = on ? '#57C7CE' : '#3E8A94';
      px(ctx, p[0] * W, p[1] * H, 3, 1, c);
      px(ctx, p[0] * W + 1, p[1] * H - 2, 1, 5, c);
    });
    // light ripples echoing between walls
    for (let i = 0; i < 3; i++) {
      const phase = ((t || 0) * 10 + i * 26) % 80;
      px(ctx, W * 0.2 + phase * ((W * 0.6) / 80), H * 0.55, 2, 8, 'rgba(87,199,206,0.5)');
    }
    // shrubs
    for (let i = 0; i < 5; i++) px(ctx, r() * W * 0.6 + W * 0.2, H * (0.76 + r() * 0.06), 4, 3, '#5C7A46');
  }

  /* Standard English Conventions — Syntax Citadel: orderly keep at golden hour */
  function drawCitadel(ctx, W, H, t) {
    skyBands(ctx, W, H, ['#8A5C8E', '#C97F6E', '#EFA96E', '#F5C98E'], H * 0.5);
    starfield(ctx, W, H * 0.24, 10, 44, t, '#F4E9D0', '#FFFFFF');
    ridge(ctx, W, H, H * 0.46, 12, 5, '#6E4680', 45);
    // green hill
    px(ctx, 0, H * 0.62, W, H, '#4C8A5B');
    px(ctx, 0, H * 0.8, W, H, '#3E7A4C');
    // the keep — deliberately symmetrical (grammar likes order)
    const cx = W * 0.5, base = H * 0.62;
    px(ctx, cx - 26, base - 26, 52, 26, '#4A3A5E');            // main hall
    px(ctx, cx - 30, base - 30, 60, 5, '#3A2D4C');             // parapet
    for (let i = -28; i <= 24; i += 8) px(ctx, cx + i, base - 33, 4, 3, '#3A2D4C'); // crenellations
    [-38, 34].forEach(function (off) {                          // twin towers
      px(ctx, cx + off - 5, base - 44, 12, 44, '#4A3A5E');
      px(ctx, cx + off - 7, base - 50, 16, 6, '#6E4680');
      px(ctx, cx + off, base - 56, 2, 6, '#3A2D4C');
      const wave = Math.round(Math.sin((t || 0) * 1.4 + off) * 1);
      px(ctx, cx + off + 2, base - 54 + wave, 6, 3, '#F2B63C'); // banners
    });
    px(ctx, cx - 4, base - 14, 8, 14, '#2A1E2E');              // gate
    px(ctx, cx - 12, base - 20, 5, 6, '#FFD974');              // lit windows
    px(ctx, cx + 8, base - 20, 5, 6, '#FFD974');
    // straight cobble road with lantern posts
    for (let y = base; y < H; y += 3) {
      const wdt = 10 + (y - base) * 0.9;
      px(ctx, cx - wdt / 2, y, wdt, 2, '#C9A36B');
    }
    [-1, 1].forEach(function (side) {
      for (let i = 0; i < 3; i++) {
        const ly = base + 8 + i * 10, lx = cx + side * (14 + i * 9);
        px(ctx, lx, ly - 8, 1, 8, '#3A2D4C');
        glowPlus(ctx, lx, ly - 10, '#FFE79A');
      }
    });
    // trimmed hedges — identical, evenly spaced
    for (let i = 0; i < 4; i++) {
      px(ctx, W * 0.08 + i * 14, H * 0.72, 10, 6, '#2E6B3F');
      px(ctx, W * (0.92 - 0.06 * i) - 10, H * 0.72, 10, 6, '#2E6B3F');
    }
    flowers(ctx, W, H * 0.68, H * 0.94, 12, 46, '#E58BA5', '#F4E9D0');
  }

  /* Problem-Solving & Data Analysis — Chartwater Bay: dusk harbor + star charts */
  function drawHarbor(ctx, W, H, t) {
    skyBands(ctx, W, H, ['#332566', '#6E4680', '#C97F6E', '#EFA96E'], H * 0.5);
    starfield(ctx, W, H * 0.36, 22, 55, t, '#C9CFF2', '#FFFFFF');
    // constellation chart lines in the sky
    const pts = [[0.14, 0.12], [0.24, 0.2], [0.35, 0.1], [0.62, 0.16], [0.74, 0.08], [0.85, 0.2]];
    ctx.fillStyle = '#8E7CC3';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], steps = 10;
      for (let s = 0; s <= steps; s += 2) {
        px(ctx, (a[0] + (b[0] - a[0]) * s / steps) * W, (a[1] + (b[1] - a[1]) * s / steps) * H, 1, 1, '#8E7CC3');
      }
      glowPlus(ctx, a[0] * W, a[1] * H, '#FFF3D6');
    }
    // sea
    px(ctx, 0, H * 0.5, W, H, '#2E6E85');
    px(ctx, 0, H * 0.5, W, 2, '#7FC4D4');
    const r = makeRng(56);
    for (let i = 0; i < 14; i++) {
      const wx = (r() * W + (t || 0) * 5) % W;
      px(ctx, wx, H * (0.55 + r() * 0.3), 4, 1, i % 2 ? '#3E8CA3' : '#7FC4D4');
    }
    // lighthouse on a rock, sweeping beacon
    const lx = W * 0.76, ly = H * 0.5;
    px(ctx, lx - 12, ly - 4, 24, 8, '#5C4A3A');               // rock
    px(ctx, lx - 4, ly - 26, 8, 22, '#F4E9D0');               // tower
    px(ctx, lx - 4, ly - 20, 8, 4, '#E2695A');                // stripe
    px(ctx, lx - 4, ly - 10, 8, 4, '#E2695A');
    px(ctx, lx - 5, ly - 30, 10, 4, '#3A2D4C');               // lamp room
    const sweep = Math.sin((t || 0) * 0.8);
    px(ctx, lx - 1 + sweep * 2, ly - 29, 3, 2, '#FFD974');    // beacon
    if (sweep > 0.3) px(ctx, lx + 2, ly - 29, 10, 1, 'rgba(255,231,154,0.6)');
    if (sweep < -0.3) px(ctx, lx - 12, ly - 29, 10, 1, 'rgba(255,231,154,0.6)');
    // pier + sailboat
    px(ctx, 0, H * 0.78, W * 0.34, 3, '#5C4A3A');
    for (let x = 4; x < W * 0.34; x += 8) px(ctx, x, H * 0.78, 1, 6, '#4A3A2E');
    const bob = Math.sin((t || 0) * 1.1) * 1;
    px(ctx, W * 0.42, H * 0.74 + bob, 16, 4, '#7A4A2A');      // hull
    px(ctx, W * 0.49, H * 0.6 + bob, 1, 14, '#4A3A2E');       // mast
    px(ctx, W * 0.5, H * 0.62 + bob, 7, 9, '#F4E9D0');        // sail
  }

  const scenes = {
    hero: { w: 480, h: 270, draw: drawHero },
    info: { w: 240, h: 104, draw: drawGloamwood },
    craft: { w: 240, h: 104, draw: drawEchoVale },
    expression: { w: 240, h: 104, draw: drawInkmarsh },
    conventions: { w: 240, h: 104, draw: drawCitadel },
    algebra: { w: 240, h: 104, draw: drawCopperpeak },
    advmath: { w: 240, h: 104, draw: drawStarfall },
    data: { w: 240, h: 104, draw: drawHarbor },
    geometry: { w: 240, h: 104, draw: drawPrism },
    science: { w: 240, h: 104, draw: drawLumen },
  };

  return { scenes, makeRng };
});
