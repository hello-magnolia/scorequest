/* ============================================================
   ScoreQuest — intro cinematic v2: Pomelo & the orange
   ------------------------------------------------------------
   Six scenes the player clicks through on their first visit to
   the World Map, before building their hero:
     1. Late night, practice-test misery        (media, loops)
     2. A glowing orange lands on the desk      (media, plays once)
     3. "You touch it."                         (black + centered text)
     4. Two capybaras in the onsen              (media, loops)
     5. The eagle. "And then, suddenly—"        (media, advances on end)
     6. Pomelo's ask                            (sprite + dialogue pages)
   All text renders Undertale/Pokemon typewriter style: first
   click finishes the line, second advances. Scene 6 draws the
   real companion sprite (SQCompanion) and ends on two deal
   buttons — both accept — which open the character builder.
   Seen-state persists per device (sq_intro_seen = 'v2', so
   players who saw v1 meet Pomelo exactly once).
   ============================================================ */
(function () {
  'use strict';
  if (!document.body.classList.contains('page-map')) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KEY = 'sq_intro_seen';
  var VERSION = 'v2';
  var CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01';

  var SCENES = [
    { id: 'bedroom', kind: 'media', loop: true,
      video: ['assets/intro/bedroom.mp4', CDN + '/hf_20260710_030436_8fa96d4e-b1e5-42d4-8f27-0ee298d74ee1.mp4'],
      image: ['assets/intro/bedroom.png', CDN + '/hf_20260710_022711_060638fc-4e28-4089-86a6-574270306697.png'],
      text: 'Somewhere past midnight, the practice test sits open and untouched. You have reorganized your desk twice and studied the ceiling extensively. Anything but question seven.' },
    { id: 'orange', kind: 'media',
      video: ['assets/intro/orange.mp4', CDN + '/hf_20260710_191040_75ffe146-5a89-48d9-9bfb-22c90a1c63a3.mp4'],
      image: ['assets/intro/bedroom.png', CDN + '/hf_20260710_022711_060638fc-4e28-4089-86a6-574270306697.png'],
      text: 'Then something streaks past the window and lands on your desk with a soft thunk. An orange. Glowing. Still warm.' },
    { id: 'touch', kind: 'black', flashAfter: true,
      text: 'You touch it.' },
    { id: 'onsen', kind: 'media', loop: true,
      video: ['assets/intro/onsen.mp4'],
      image: ['assets/intro/onsen.png'],
      text: 'Somewhere far away: two capybaras, one steaming spring, a pile of oranges. Every day the same. Perfect.' },
    { id: 'snatch', kind: 'media', advanceOnEnd: true,
      video: ['assets/intro/snatch.mp4'],
      image: ['assets/intro/onsen.png'],
      text: 'And then, suddenly\u2014' },
    { id: 'pomelo', kind: 'dialogue',
      pages: [
        '* hello.',
        '* u found my orange. good.',
        '* i am pomelo. the big bird took mango to the top of the big mountain.',
        '* i tried to climb it. i have very short legs. it did not go well.',
        '* the gates on the path only open if u answer questions. u are a student. u are basically made of answers.',
        '* so. deal \u2014 u get mango back, i help u study.',
        '* i am extremely good at sitting next to people while they work. best in the world maybe.',
        '* deal?'
      ],
      choices: ['deal.', 'deal, obviously.'] }
  ];

  var overlay = null, idx = 0;

  function seen() {
    try { return window.localStorage.getItem(KEY) === VERSION; } catch (e) { return false; }
  }
  function markSeen() {
    try { window.localStorage.setItem(KEY, VERSION); } catch (e) {}
  }

  /* ---------- typewriter (Undertale/Pokemon) ----------
     Types one character at a time with longer holds on sentence
     punctuation and a soft blip per letter. finish() completes
     the line instantly; the blinking cursor invites the next
     click. Full text always lives in data-full for a11y/tests. */
  var tw = null;
  function pauseFor(ch) {
    if ('.!?\u2014'.indexOf(ch) >= 0) return 210;
    if (',;:'.indexOf(ch) >= 0) return 90;
    return 26;
  }
  function typewrite(el, text, onDone) {
    el.textContent = '';
    el.setAttribute('data-full', text);
    setCursor(false);
    var i = 0, timer = null, done = false;
    function complete() {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      el.textContent = text;
      setCursor(true);
      if (onDone) onDone();
    }
    if (reduceMotion) { complete(); }
    else {
      (function step() {
        if (done) return;
        if (i >= text.length) { complete(); return; }
        var ch = text.charAt(i);
        el.textContent += ch;
        i += 1;
        if (ch !== ' ' && ch !== '*' && window.SQSfx && window.SQSfx.textBlip) window.SQSfx.textBlip();
        timer = setTimeout(step, pauseFor(ch));
      })();
    }
    tw = { finish: complete, isDone: function () { return done; } };
    return tw;
  }
  function setCursor(on) {
    var c = overlay && overlay.querySelector('.intro-cursor');
    if (c) c.classList.toggle('is-on', !!on);
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="intro-media" aria-hidden="true">' +
        '<img class="intro-img" hidden alt="" />' +
        '<video class="intro-video" hidden muted playsinline autoplay></video>' +
      '</div>' +
      '<div class="intro-vignette" aria-hidden="true"></div>' +
      '<p class="intro-center type-utility" aria-live="polite"></p>' +
      '<canvas class="intro-pomelo" width="43" height="39" aria-label="Pomelo the capybara"></canvas>' +
      '<button class="intro-skip type-utility">Skip intro</button>' +
      '<div class="intro-caption pixel-frame">' +
        '<p class="intro-text" aria-live="polite"></p>' +
        '<span class="intro-cursor" aria-hidden="true">\u25BC</span>' +
        '<div class="intro-choices" hidden></div>' +
        '<div class="intro-foot">' +
          '<div class="intro-dots">' + SCENES.map(function () { return '<span class="intro-dot"></span>'; }).join('') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="intro-flash" aria-hidden="true"></div>';
    document.body.appendChild(overlay);

    overlay.querySelector('.intro-skip').addEventListener('click', function (e) {
      e.stopPropagation();
      finish();
    });
    // clicking anywhere finishes the line, then advances — game muscle memory
    overlay.addEventListener('click', function (e) {
      if (e.target.closest('.intro-skip') || e.target.closest('.intro-choice')) return;
      advance();
    });
    document.addEventListener('keydown', function (e) {
      if (!overlay || overlay.hidden) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
        if (!overlay.querySelector('.intro-choices').hidden) return; // buttons own Enter
        e.preventDefault();
        advance();
      }
    });
  }

  /* ---------- preload: the cure for the low-fi flash ----------
     Resolve every still the moment the intro opens, and fetch each
     scene's video one step ahead, so by the time a scene shows its
     art is already in cache and appears within a frame. */
  var resolved = { image: {}, video: {} };
  var prefetching = {};

  function resolveChain(kind, idx, sources, makeEl, readyEvent) {
    if (!sources || resolved[kind][idx] || prefetching[kind + idx]) return;
    var srcs = sources.filter(function (u) { return u && u.indexOf('__') !== 0; });
    if (!srcs.length) return;
    prefetching[kind + idx] = true;
    var el = makeEl();
    var i = 0;
    el.onerror = function () { if (i < srcs.length) el.src = srcs[i++]; };
    el['on' + readyEvent] = function () { resolved[kind][idx] = el.currentSrc || el.src; };
    el.src = srcs[i++];
  }
  function prefetchVideo(i) {
    var st = SCENES[i];
    if (!st || !st.video) return;
    resolveChain('video', i, st.video, function () {
      var v = document.createElement('video');
      v.preload = 'auto'; v.muted = true;
      return v;
    }, 'canplaythrough');
  }

  var mediaGen = 0;
  var pendingAutoAdvance = false;

  function sceneReady() {
    overlay.querySelector('.intro-media').classList.remove('is-dark');
  }
  function setMedia(step, sceneIdx) {
    // Generation token: scene advances can outrun in-flight loads, and a stale
    // load event used to unhide an element still painting the PREVIOUS scene's
    // bitmap. Every swap bumps the generation; handlers from older swaps are
    // ignored, and stale sources are flushed before new ones are set.
    var gen = ++mediaGen;
    window.__SQ_MEDIA_GEN = mediaGen;
    var img = overlay.querySelector('.intro-img');
    var vid = overlay.querySelector('.intro-video');
    img.hidden = true; vid.hidden = true;
    vid.pause(); vid.removeAttribute('src'); try { vid.load(); } catch (e) {}
    img.removeAttribute('src');
    if (!step.video && !step.image) return;   // black / dialogue scenes stay dark
    vid.loop = !!step.loop;
    vid.onended = step.advanceOnEnd ? function () {
      if (gen !== mediaGen) return;
      if (tw && tw.isDone()) advance();
      else pendingAutoAdvance = true;
    } : null;                                  // non-loop scenes hold their last frame
    function chain(el, sources, showEvent, kind, idx, onExhausted) {
      var srcs = (sources || []).filter(function (u) { return u && u.indexOf('__') !== 0; });
      if (resolved[kind] && resolved[kind][idx]) srcs = [resolved[kind][idx]]; // cached winner first
      if (!srcs.length) { if (onExhausted) onExhausted(); return false; }
      var i = 0;
      function next() {
        if (gen !== mediaGen) return;
        if (i >= srcs.length) { el.hidden = true; if (onExhausted) onExhausted(); return; }
        el.src = srcs[i++];
      }
      el.onerror = function () { if (gen === mediaGen) next(); };
      el['on' + showEvent] = function () {
        if (gen !== mediaGen) return;
        el.hidden = false;
        if (el === vid) { try { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
        sceneReady(); // fade back from black
      };
      next();
      return true;
    }
    // the animated render IS the scene; the still exists only if every video
    // source fails; if both fail, fade back to the dark stage + caption
    chain(vid, step.video, 'canplay', 'video', sceneIdx, function () {
      if (!chain(img, step.image, 'load', 'image', sceneIdx, sceneReady)) sceneReady();
    });
  }

  /* ---------- Pomelo, drawn live from the companion sprite ---------- */
  var pomeloTimer = null;
  var POMELO_IDLE = [ // frame, hold ms — stand, blink, and a little graze
    [0, 1700], [3, 140], [0, 1100], [3, 140], [0, 700],
    [4, 900], [5, 240], [6, 650], [7, 240], [8, 240], [7, 240], [8, 240], [5, 240], [4, 700]
  ];
  function startPomelo() {
    var canvas = overlay.querySelector('.intro-pomelo');
    if (!canvas || !window.SQCompanion) return;
    var ctx = null;
    try { ctx = canvas.getContext('2d'); } catch (e) {}
    if (!ctx) return;
    window.SQCompanion.draw(ctx, 0);
    if (reduceMotion) return;
    var step = 0;
    (function loop() {
      if (!overlay || overlay.hidden || SCENES[idx].kind !== 'dialogue') return;
      var fr = POMELO_IDLE[step % POMELO_IDLE.length];
      window.SQCompanion.draw(ctx, fr[0]);
      step += 1;
      pomeloTimer = setTimeout(loop, fr[1]);
    })();
  }
  function stopPomelo() {
    if (pomeloTimer) { clearTimeout(pomeloTimer); pomeloTimer = null; }
  }

  /* ---------- dialogue choices (both accept — Pomelo is confident) ---------- */
  function showChoices(step) {
    var row = overlay.querySelector('.intro-choices');
    row.innerHTML = '';
    step.choices.forEach(function (label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'intro-choice type-utility';
      b.innerHTML = '<span class="intro-heart" aria-hidden="true">\u2665</span>' + label;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (window.SQSfx) window.SQSfx.correct();
        finish();
      });
      row.appendChild(b);
    });
    row.hidden = false;
    setCursor(false);
    if (row.firstChild) row.firstChild.focus();
  }

  var pageIdx = 0;
  function render() {
    var step = SCENES[idx];
    overlay.setAttribute('data-scene', step.id);
    overlay.querySelector('.intro-choices').hidden = true;
    pendingAutoAdvance = false;
    setMedia(step, idx);
    prefetchVideo(idx + 1); // stay one scene ahead
    overlay.querySelectorAll('.intro-dot').forEach(function (d, i) {
      d.classList.toggle('is-active', i === idx);
      d.classList.toggle('is-done', i < idx);
    });
    var textEl = overlay.querySelector('.intro-text');
    var centerEl = overlay.querySelector('.intro-center');
    centerEl.textContent = '';
    if (step.kind === 'black') {
      typewrite(centerEl, step.text);
    } else if (step.kind === 'dialogue') {
      pageIdx = 0;
      startPomelo();
      typewrite(textEl, step.pages[0]);
    } else {
      typewrite(textEl, step.text, function () {
        if (pendingAutoAdvance) advance();   // snatch clip already ended
      });
    }
  }

  var dipping = false;
  function advance() {
    var step = SCENES[idx];
    if (tw && !tw.isDone()) { tw.finish(); return; }   // first press: finish the line
    if (window.SQSfx) window.SQSfx.uiTick();
    if (step.kind === 'dialogue') {
      pageIdx += 1;
      if (pageIdx >= step.pages.length) return;        // choices are on screen
      var last = pageIdx === step.pages.length - 1;
      typewrite(overlay.querySelector('.intro-text'), step.pages[pageIdx],
        last ? function () { showChoices(step); } : null);
      return;
    }
    if (idx >= SCENES.length - 1) return finish();
    if (dipping) return;
    dipping = true;
    if (step.flashAfter && !reduceMotion) overlay.querySelector('.intro-flash').classList.add('is-on');
    overlay.querySelector('.intro-media').classList.add('is-dark'); // fade to black
    setTimeout(function () {
      idx++;
      render();   // swap sources + caption in the dark; sceneReady fades back
      dipping = false;
      setTimeout(function () { overlay.querySelector('.intro-flash').classList.remove('is-on'); }, 80);
    }, reduceMotion ? 0 : 300);
  }

  function finish() {
    markSeen();
    stopPomelo();
    overlay.hidden = true;
    document.body.style.overflow = '';
    // straight into character creation, then the map
    if (window.SQCharacter && !window.SQCharacter.get()) window.SQCharacter.open();
  }

  function open() {
    if (!overlay) build();
    prefetchVideo(0);
    prefetchVideo(1);
    window.__SQ_INTRO_PRELOAD = true;
    idx = 0;
    overlay.querySelector('.intro-media').classList.add('is-dark');
    render();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  window.SQIntro = { open: open, seen: seen };

  function init() { if (!seen()) open(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
