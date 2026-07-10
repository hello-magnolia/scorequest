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
    info: function () {          // Gloamwood: wooden knock + forest chime
      voice(392, { type: 'triangle', dur: 0.14, peak: 0.12 });
      voice(660, { type: 'sine', dur: 0.3, peak: 0.07, delay: 0.07 });
    },
    craft: function () {         // Echo Vale: a note and its canyon echo
      voice(587.33, { type: 'triangle', dur: 0.18, peak: 0.13 });
      voice(587.33, { type: 'triangle', dur: 0.22, peak: 0.055, delay: 0.16 });
      voice(587.33, { type: 'triangle', dur: 0.26, peak: 0.025, delay: 0.32 });
    },
    expression: function () {    // Inkmarsh: a watery bloop
      voice(880, { type: 'sine', dur: 0.16, peak: 0.11, glideTo: 320 });
      voice(520, { type: 'sine', dur: 0.1, peak: 0.06, glideTo: 780, delay: 0.1 });
    },
    conventions: function () {   // Syntax Citadel: a tidy two-note fanfare
      voice(523.25, { type: 'square', dur: 0.12, peak: 0.05 });
      voice(698.46, { type: 'square', dur: 0.2, peak: 0.055, delay: 0.1 });
    },
    algebra: function () {       // Copperpeak: pickaxe clink (inharmonic metal)
      voice(1190, { type: 'square', dur: 0.07, peak: 0.05 });
      voice(1870, { type: 'square', dur: 0.05, peak: 0.03 });
      voice(2640, { type: 'sine', dur: 0.12, peak: 0.04, delay: 0.01 });
    },
    advmath: function () {       // Starfall Summit: rising star shimmer
      voice(1046.5, { type: 'sine', dur: 0.12, peak: 0.06 });
      voice(1318.5, { type: 'sine', dur: 0.12, peak: 0.06, delay: 0.07 });
      voice(1568, { type: 'sine', dur: 0.22, peak: 0.06, delay: 0.14 });
    },
    data: function () {          // Chartwater Bay: harbor bell
      voice(659.25, { type: 'sine', dur: 0.55, peak: 0.11 });
      voice(989, { type: 'sine', dur: 0.45, peak: 0.045 });
    },
    geometry: function () {      // Prism Tidepools: glassy crystal ping
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
    /* the orange's light swelling to fill the room */
    flare: function () {
      voice(220, { type: 'sine', dur: 1.05, peak: 0.13, glideTo: 1180 });
      voice(440, { type: 'triangle', dur: 0.9, peak: 0.05, glideTo: 1760, delay: 0.12 });
      voice(1568, { type: 'sine', dur: 0.3, peak: 0.05, delay: 0.55 });
      voice(2093, { type: 'sine', dur: 0.35, peak: 0.045, delay: 0.75 });
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
