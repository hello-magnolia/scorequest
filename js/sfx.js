/* ============================================================
   ScoreQuest — sound effects (original, fully synthesized)
   ------------------------------------------------------------
   No audio files: every sound is generated with the Web Audio API.
   - tap(i): soft pentatonic pluck for map nodes (pitch varies by step)
   - correct(): rising two-note chime
   - wrong(): gentle low thump (never punishing)
   - levelup(): four-note ascending arpeggio
   - uiTick(): tiny click for advancing scenes / flips
   Respects a persisted mute preference (sq_sound). The AudioContext
   is created lazily on the first user gesture, per autoplay policy.
   ============================================================ */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var KEY = 'sq_sound';

  function enabled() {
    try { return window.localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; }
  }
  function setEnabled(on) {
    try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
  }
  function ac() {
    if (!AC) return null;
    if (!ctx) { try { ctx = new AC(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* one enveloped voice */
  function voice(freq, opts) {
    var a = ac();
    if (!a || !enabled()) return;
    opts = opts || {};
    var t0 = a.currentTime + (opts.delay || 0);
    var osc = a.createOscillator();
    var gain = a.createGain();
    osc.type = opts.type || 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + (opts.dur || 0.2));
    var peak = (opts.peak || 0.14);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + (opts.dur || 0.22));
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + (opts.dur || 0.22) + 0.05);
  }

  /* one enveloped noise burst through a filter */
  function noiseBurst(t0abs, dur, freq, type, peak, q, glideTo) {
    var a = ac();
    if (!a) return;
    var n = Math.max(1, Math.floor(a.sampleRate * dur));
    var buf = a.createBuffer(1, n, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = a.createBufferSource(); src.buffer = buf;
    var f = a.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.setValueAtTime(freq, t0abs);
    if (glideTo) f.frequency.exponentialRampToValueAtTime(glideTo, t0abs + dur);
    f.Q.value = q || 0.9;
    var g = a.createGain();
    g.gain.setValueAtTime(0, t0abs);
    g.gain.linearRampToValueAtTime(peak, t0abs + dur * 0.18);
    g.gain.exponentialRampToValueAtTime(0.0008, t0abs + dur);
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(t0abs); src.stop(t0abs + dur + 0.02);
  }

  /* ---------- recorded voices ----------
     A small sample rack beside the synthesized voices: files are fetched
     and decoded once, cached, and played through the same context and
     mute preference. warm() preloads so a fight's first cry never lags. */
  var SAMPLES = {
    talonCry: 'assets/sfx/talon_cry.mp3',
    aristotleHiyah: 'assets/sfx/aristotle_hiyah.mp3',
    aristotleHuu: 'assets/sfx/aristotle_huu.mp3',
    aristotleHurt: 'assets/sfx/aristotle_hurt.mp3',
    aristotleDefeat: 'assets/sfx/aristotle_defeat.mp3',
    hareHurt: 'assets/sfx/hare_hurt.mp3',
    hareDefeat: 'assets/sfx/hare_defeat.mp3'
  };
  /* voices that stand for a set of samples, all warmed together */
  var SAMPLE_GROUPS = { aristotleAttack: ['aristotleHiyah', 'aristotleHuu'] };
  var sampleBufs = {};
  function warmSample(name) {
    if (SAMPLE_GROUPS[name]) { SAMPLE_GROUPS[name].forEach(warmSample); return; }
    var a = ac();
    if (!a || !SAMPLES[name] || sampleBufs[name]) return;
    sampleBufs[name] = 'loading';
    fetch(SAMPLES[name])
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) { return a.decodeAudioData(ab); })
      .then(function (buf) { sampleBufs[name] = buf; })
      .catch(function () { sampleBufs[name] = null; });
  }
  function playSample(name, peak) {
    var a = ac();
    if (!a || !enabled()) return;
    var buf = sampleBufs[name];
    if (!buf || buf === 'loading') { warmSample(name); return; }
    var src = a.createBufferSource();
    src.buffer = buf;
    var g = a.createGain();
    g.gain.value = peak || 0.55;
    src.connect(g); g.connect(a.destination);
    src.start();
  }

  var PENTA = [523.25, 587.33, 659.25, 783.99, 880.0]; // C5 pentatonic

  /* ============================================================
     BACKGROUND MUSIC — an original composition, written for this
     game: a gentle 3/4 lullaby-waltz in A minor (76 bpm), soft
     detuned-triangle arpeggios over a warm bass, with a sparse
     singing melody. Nostalgic and cozy by design; entirely our own.
     ============================================================ */
  var MKEY = 'sq_music';
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var BARS = [
    { chord: [69, 72, 76], bass: 45, mel: 76 },   // Am
    { chord: [65, 69, 72], bass: 41, mel: 72 },   // F
    { chord: [72, 76, 79], bass: 48, mel: null }, // C
    { chord: [67, 71, 74], bass: 43, mel: 74 },   // G
    { chord: [69, 72, 76], bass: 45, mel: 77 },   // Am
    { chord: [65, 69, 72], bass: 41, mel: 76 },   // F
    { chord: [62, 65, 69], bass: 38, mel: 69 },   // Dm
    { chord: [64, 68, 71], bass: 40, mel: 71 },   // E
  ];
  var ARP = [0, 1, 2, 1, 2, 1];                   // eighth-note pattern per bar
  var STEP = (60 / 76) / 2;                       // eighth at 76 bpm
  var music = { on: null, timer: null, step: 0, next: 0 };

  function musicEnabled() {
    try { return window.localStorage.getItem(MKEY) !== 'off'; } catch (e) { return true; }
  }
  function mvoice(freq, when, dur, peak, type, detune) {
    var a = ac(); if (!a) return;
    [0, detune || 0].forEach(function (dt, layer) {
      var osc = a.createOscillator(), g = a.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(freq * (1 + dt), when);
      var p = peak * (layer ? 0.5 : 1);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(p, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0006, when + dur);
      osc.connect(g).connect(a.destination);
      osc.start(when); osc.stop(when + dur + 0.05);
      if (!(detune)) return;
    });
  }
  function schedule() {
    var a = ac(); if (!a || !music.on) return;
    while (music.next < a.currentTime + 0.18) {
      var bar = BARS[Math.floor(music.step / 6) % BARS.length];
      var sub = music.step % 6;
      var t = music.next;
      mvoice(midi(bar.chord[ARP[sub]]), t, 0.5, 0.028, 'triangle', 0.0022); // arp
      if (sub === 0) {
        mvoice(midi(bar.bass), t, STEP * 6, 0.045, 'sine');                 // bass
        if (bar.mel) mvoice(midi(bar.mel), t + STEP, STEP * 4.6, 0.03, 'sine', 0.0016); // melody
      }
      music.step++;
      music.next += STEP;
    }
  }
  function startMusic() {
    var a = ac(); if (!a || music.on || !musicEnabled()) return;
    music.on = true;
    music.step = 0;
    music.next = a.currentTime + 0.1;
    music.timer = setInterval(schedule, 60);
  }
  function stopMusic() {
    music.on = false;
    if (music.timer) { clearInterval(music.timer); music.timer = null; }
  }

  window.SQMusic = {
    enabled: musicEnabled,
    playing: function () { return !!music.on; },
    ensure: function () { if (musicEnabled() && !music.on) startMusic(); },
    /* scene-scoped start/stop that never flips the saved preference —
       the intro cues the lullaby for the capybara scenes */
    cue: function (on) {
      if (on) { if (musicEnabled() && !music.on) startMusic(); }
      else if (music.on) stopMusic();
    },
    toggle: function () {
      var on = !musicEnabled();
      try { window.localStorage.setItem(MKEY, on ? 'on' : 'off'); } catch (e) {}
      if (on) startMusic(); else stopMusic();
      return on;
    },
  };

  /* eight original one-shot motifs, one per realm's theme */
  var REALM_SOUNDS = {
    info: function () {          // Lorewood: wooden knock + forest chime
      voice(392, { type: 'triangle', dur: 0.14, peak: 0.12 });
      voice(660, { type: 'sine', dur: 0.3, peak: 0.07, delay: 0.07 });
    },
    craft: function () {         // Story Forge: a note and its canyon echo
      voice(587.33, { type: 'triangle', dur: 0.18, peak: 0.13 });
      voice(587.33, { type: 'triangle', dur: 0.22, peak: 0.055, delay: 0.16 });
      voice(587.33, { type: 'triangle', dur: 0.26, peak: 0.025, delay: 0.32 });
    },
    expression: function () {    // Ink Reef: a watery bloop
      voice(880, { type: 'sine', dur: 0.16, peak: 0.11, glideTo: 320 });
      voice(520, { type: 'sine', dur: 0.1, peak: 0.06, glideTo: 780, delay: 0.1 });
    },
    conventions: function () {   // Syntax Citadel: a tidy two-note fanfare
      voice(523.25, { type: 'square', dur: 0.12, peak: 0.05 });
      voice(698.46, { type: 'square', dur: 0.2, peak: 0.055, delay: 0.1 });
    },
    algebra: function () {       // Mirror Mines: pickaxe clink (inharmonic metal)
      voice(1190, { type: 'square', dur: 0.07, peak: 0.05 });
      voice(1870, { type: 'square', dur: 0.05, peak: 0.03 });
      voice(2640, { type: 'sine', dur: 0.12, peak: 0.04, delay: 0.01 });
    },
    advmath: function () {       // Infinity Isles: rising star shimmer
      voice(1046.5, { type: 'sine', dur: 0.12, peak: 0.06 });
      voice(1318.5, { type: 'sine', dur: 0.12, peak: 0.06, delay: 0.07 });
      voice(1568, { type: 'sine', dur: 0.22, peak: 0.06, delay: 0.14 });
    },
    data: function () {          // Data Docks: harbor bell
      voice(659.25, { type: 'sine', dur: 0.55, peak: 0.11 });
      voice(989, { type: 'sine', dur: 0.45, peak: 0.045 });
    },
    geometry: function () {      // Prism Peaks: glassy crystal ping
      voice(1760, { type: 'sine', dur: 0.2, peak: 0.07 });
      voice(2637, { type: 'sine', dur: 0.14, peak: 0.04, delay: 0.02 });
    },
  };

  window.SQSfx = {
    /* the realm's themed voice, falling back to the pentatonic tap */
    realmTap: function (realmId) {
      var fn = REALM_SOUNDS[realmId];
      if (fn) fn(); else window.SQSfx.tap(0);
    },
    /* a soft contented thump for the flop */
    flop: function () {
      voice(150, { type: 'sine', dur: 0.3, peak: 0.1, glideTo: 82 });
      voice(300, { type: 'triangle', dur: 0.12, peak: 0.04, delay: 0.02 });
    },
    /* soft press for anything clickable */
    click: function () {
      voice(1500, { type: 'sine', dur: 0.05, peak: 0.045, glideTo: 950 });
    },
    /* Pomelo's battle voice: a capybara trill that winds up through ten
       quick chirps, then breaks into one rising squeak as the orange flies */
    capyTrill: function () {
      if (!enabled()) return;
      for (var k = 0; k < 10; k++) {
        var t = k * 0.042 + Math.random() * 0.006;
        var swell = Math.pow(Math.sin(Math.PI * Math.min(Math.max(t / 0.42, 0.02), 0.98)), 0.7);
        voice(517, { type: 'triangle', dur: 0.03, peak: 0.085 * swell, glideTo: 450, delay: t });
        voice(1034, { type: 'sine', dur: 0.03, peak: 0.014 * swell, glideTo: 900, delay: t });
      }
      voice(520, { type: 'triangle', dur: 0.2, peak: 0.12, glideTo: 1040, delay: 0.46 });
      voice(1040, { type: 'sine', dur: 0.2, peak: 0.025, glideTo: 2080, delay: 0.46 });
    },
    /* the Archivist's roar, thunder-maw cut: sub-heavy dread. Three
       detuned saws through a tanh throat, a deep 360Hz formant, a slow
       14Hz tremble, and an octave-down sine rolling underneath */
    roar: function () {
      var a = ac();
      if (!a || !enabled()) return;
      var t0 = a.currentTime, dur = 0.95;
      var P = [[0, 56], [0.22, 88], [0.6, 74], [1.0, 42]];
      function ramp(param, scale) {
        param.setValueAtTime(P[0][1] * scale, t0);
        for (var i = 1; i < P.length; i++)
          param.exponentialRampToValueAtTime(P[i][1] * scale, t0 + P[i][0] * dur);
      }
      var shaper = a.createWaveShaper();
      var curve = new Float32Array(1024);
      for (var i = 0; i < 1024; i++) curve[i] = Math.tanh(2.6 * ((i / 511.5) - 1));
      shaper.curve = curve;
      var pre = a.createGain(); pre.gain.value = 1 / 3;
      [0, 7, -5].forEach(function (det) {
        var o = a.createOscillator();
        o.type = 'sawtooth';
        ramp(o.frequency, 1);
        o.detune.value = det * 8;
        o.connect(pre);
        o.start(t0); o.stop(t0 + dur + 0.05);
      });
      pre.connect(shaper);
      var sum = a.createGain();
      var lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      var lpg = a.createGain(); lpg.gain.value = 0.5;
      shaper.connect(lp); lp.connect(lpg); lpg.connect(sum);
      var fm = a.createBiquadFilter(); fm.type = 'bandpass'; fm.frequency.value = 360; fm.Q.value = 3;
      var fmg = a.createGain(); fmg.gain.value = 0.9;
      shaper.connect(fm); fm.connect(fmg); fmg.connect(sum);
      var sub = a.createOscillator(); sub.type = 'sine';
      ramp(sub.frequency, 0.5);
      var subg = a.createGain(); subg.gain.value = 0.5;
      sub.connect(subg); subg.connect(sum);
      sub.start(t0); sub.stop(t0 + dur + 0.05);
      var n = Math.floor(a.sampleRate * dur);
      var buf = a.createBuffer(1, n, a.sampleRate);
      var d = buf.getChannelData(0);
      for (var j = 0; j < n; j++) d[j] = Math.random() * 2 - 1;
      var nz = a.createBufferSource(); nz.buffer = buf;
      var nb = a.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 850; nb.Q.value = 1.1;
      var ng = a.createGain(); ng.gain.value = 0.2;
      nz.connect(nb); nb.connect(ng); ng.connect(sum);
      nz.start(t0); nz.stop(t0 + dur);
      var env = a.createGain();
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(0.16, t0 + 0.06 * dur);
      env.gain.linearRampToValueAtTime(0.14, t0 + 0.6 * dur);
      env.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
      var roughG = a.createGain(); roughG.gain.value = 0.83;
      var lfo = a.createOscillator(); lfo.frequency.value = 14;
      var lfoG = a.createGain(); lfoG.gain.value = 0.17;
      lfo.connect(lfoG); lfoG.connect(roughG.gain);
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
      sum.connect(env); env.connect(roughG); roughG.connect(a.destination);
    },
    /* the Weaver winds its legs: six piston chuffs, then a clank */
    weaverPistons: function () {
      var a = ac();
      if (!a || !enabled()) return;
      var t0 = a.currentTime;
      for (var k = 0; k < 6; k++) {
        var t = k * 0.085;
        voice(120, { type: 'sine', dur: 0.06, peak: 0.13, glideTo: 58, delay: t });
        noiseBurst(t0 + t + 0.02, 0.04, 3200, 'highpass', 0.03);
      }
      voice(740, { type: 'triangle', dur: 0.09, peak: 0.09, delay: 0.55 });
      voice(1180, { type: 'triangle', dur: 0.06, peak: 0.055, delay: 0.56 });
      voice(1372, { type: 'sine', dur: 0.05, peak: 0.035, delay: 0.56 });
    },
    /* the Pedant scrapes off its perch: granite on granite */
    pedantScreech: function () {
      var a = ac();
      if (!a || !enabled()) return;
      var t0 = a.currentTime;
      noiseBurst(t0 + 0.04, 0.68, 950, 'bandpass', 0.22, 2.6, 730);
      noiseBurst(t0, 0.85, 300, 'lowpass', 0.1, 0.7);
    },
    /* one hiss for two serpents */
    twinsHiss: function () {
      var a = ac();
      if (!a || !enabled()) return;
      noiseBurst(a.currentTime, 0.5, 3400, 'bandpass', 0.16, 0.6, 2500);
    },
    /* the hare's beam: a gathering shimmer timed to land its zap
       exactly as the beam fires (attack start + 880ms) */
    hareZap: function () {
      var a = ac();
      if (!a || !enabled()) return;
      var t0 = a.currentTime + 0.38;
      [0, 9].forEach(function (det) {
        var o = a.createOscillator(), g = a.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(300, t0);
        o.frequency.exponentialRampToValueAtTime(1400, t0 + 0.5);
        o.detune.value = det;
        g.gain.setValueAtTime(0.004, t0);
        g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.5);
        g.gain.setValueAtTime(0.07, t0 + 0.5);
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.56);
        o.connect(g); g.connect(a.destination);
        o.start(t0); o.stop(t0 + 0.6);
      });
      voice(1600, { type: 'square', dur: 0.45, peak: 0.075, glideTo: 1150, delay: 0.88 });
      noiseBurst(t0 + 0.5, 0.45, 4200, 'bandpass', 0.09, 0.7, 2600);
    },
    /* the Kraken bellows from beneath: a drowned roar, bubbles rising */
    krakenBellow: function () {
      var a = ac();
      if (!a || !enabled()) return;
      var t0 = a.currentTime, dur = 1.0;
      var P = [[0, 62], [0.25, 105], [0.65, 88], [1, 46]];
      var shaper = a.createWaveShaper();
      var curve = new Float32Array(1024);
      for (var i = 0; i < 1024; i++) curve[i] = Math.tanh(2.4 * ((i / 511.5) - 1));
      shaper.curve = curve;
      var pre = a.createGain(); pre.gain.value = 0.34;
      [0, 6, -5].forEach(function (det) {
        var o = a.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(P[0][1], t0);
        for (var i2 = 1; i2 < P.length; i2++)
          o.frequency.exponentialRampToValueAtTime(P[i2][1], t0 + P[i2][0] * dur);
        o.detune.value = det * 7;
        o.connect(pre); o.start(t0); o.stop(t0 + dur + 0.05);
      });
      var lp2 = a.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 420;
      var env = a.createGain();
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(0.24, t0 + 0.12 * dur);
      env.gain.linearRampToValueAtTime(0.2, t0 + 0.7 * dur);
      env.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
      var am = a.createGain(); am.gain.value = 0.65;
      var lfo = a.createOscillator(); lfo.frequency.value = 9;
      var lg = a.createGain(); lg.gain.value = 0.35;
      lfo.connect(lg); lg.connect(am.gain);
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
      pre.connect(shaper); shaper.connect(lp2); lp2.connect(env); env.connect(am); am.connect(a.destination);
      for (var b = 0; b < 5; b++) {
        var fb = 200 + Math.random() * 300;
        voice(fb, { type: 'sine', dur: 0.07, peak: 0.05, glideTo: fb * 1.8, delay: 0.15 + b * 0.16 });
      }
    },
    /* the Tangent Talon's cry: a real eagle, courtesy of the aerie */
    talonCry: function () { playSample('talonCry', 0.6); },
    /* Aristotle strikes, alternating between his two war cries */
    aristotleAttack: (function () {
      var turn = 0;
      return function () {
        playSample(turn ? 'aristotleHuu' : 'aristotleHiyah', 0.6);
        turn = 1 - turn;
      };
    })(),
    aristotleHurt: function () { playSample('aristotleHurt', 0.6); },
    aristotleDefeat: function () { playSample('aristotleDefeat', 0.6); },
    hareHurt: function () { playSample('hareHurt', 0.6); },
    hareDefeat: function () { playSample('hareDefeat', 0.6); },
    warm: warmSample,
    enabled: enabled,
    /* create/resume the AudioContext as early as the browser allows,
       so the very first typewriter line is audible */
    wake: function () { ac(); },
    toggle: function () { setEnabled(!enabled()); return enabled(); },
    tap: function (i) {
      var f = PENTA[Math.abs(i || 0) % PENTA.length];
      voice(f, { type: 'triangle', dur: 0.2, peak: 0.13 });
      voice(f * 2, { type: 'sine', dur: 0.14, peak: 0.05 }); // sparkle overtone
    },
    uiTick: function () {
      voice(880, { type: 'sine', dur: 0.08, peak: 0.06 });
    },
    /* one soft click per typed character (Undertale-style, low and woody) */
    textBlip: function () {
      voice(215 + Math.random() * 45, { type: 'square', dur: 0.03, peak: 0.05 });
      voice(1300, { type: 'sine', dur: 0.015, peak: 0.012 }); // tick transient
    },
    /* the eagle announces itself */
    caw: function () {
      voice(1500, { type: 'sawtooth', dur: 0.09, peak: 0.05, glideTo: 1750 });
      voice(1750, { type: 'sawtooth', dur: 0.55, peak: 0.075, glideTo: 620, delay: 0.08 });
      voice(880, { type: 'square', dur: 0.4, peak: 0.02, glideTo: 330, delay: 0.12 });
    },
    /* one soft capybara footstep */
    step: function () {
      voice(120, { type: 'sine', dur: 0.08, peak: 0.045, glideTo: 70 });
    },
    /* the orange's light swelling to fill the room — slow, then everywhere */
    flare: function () {
      voice(196, { type: 'sine', dur: 1.9, peak: 0.13, glideTo: 1320 });
      voice(392, { type: 'triangle', dur: 1.6, peak: 0.05, glideTo: 2093, delay: 0.2 });
      voice(1568, { type: 'sine', dur: 0.4, peak: 0.05, delay: 1.0 });
      voice(2093, { type: 'sine', dur: 0.5, peak: 0.045, delay: 1.35 });
    },
    correct: function () {
      voice(659.25, { type: 'triangle', dur: 0.16, peak: 0.12 });
      voice(987.77, { type: 'triangle', dur: 0.3, peak: 0.12, delay: 0.09 });
    },
    wrong: function () {
      voice(196, { type: 'sine', dur: 0.24, peak: 0.11, glideTo: 130 });
    },
    levelup: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        voice(f, { type: 'triangle', dur: 0.24, peak: 0.12, delay: i * 0.09 });
      });
    },
  };

  /* every clickable thing gives a soft press; the first gesture also starts
     the background music on the map (autoplay policy requires a gesture) */
  document.addEventListener('click', function (e) {
    var hit = e.target.closest && e.target.closest(
      'button, .btn, .rnode, .quest-answer, .swatch, .lang-pill, .pdeck-dot, .pill, .pdeck-dot, .intro-overlay');
    if (hit) window.SQSfx.click();
    if (document.body.classList.contains('page-map') && !window.__SQ_INTRO_OPEN) window.SQMusic.ensure();
  }, true);
})();
