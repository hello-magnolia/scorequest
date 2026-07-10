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

  window.SQSfx = {
    enabled: enabled,
    toggle: function () { setEnabled(!enabled()); return enabled(); },
    tap: function (i) {
      var f = PENTA[Math.abs(i || 0) % PENTA.length];
      voice(f, { type: 'triangle', dur: 0.2, peak: 0.13 });
      voice(f * 2, { type: 'sine', dur: 0.14, peak: 0.05 }); // sparkle overtone
    },
    uiTick: function () {
      voice(880, { type: 'sine', dur: 0.08, peak: 0.06 });
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
})();
