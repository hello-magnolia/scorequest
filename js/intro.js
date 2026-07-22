/* ============================================================
   ScoreQuest — intro cinematic v2: Pomelo & the orange
   ------------------------------------------------------------
   Six scenes the player clicks through on their first visit to
   the World Map:
     1. Late night, practice-test misery        (media, loops)
     2. A glowing orange lands on the desk      (media, plays once)
     3. "You touch it."                         (black + centered text;
                                                 exits on a swelling flare
                                                 of light and sound)
     4. Two capybaras in the onsen              (media, loops, music)
     5. The eagle. "And then, suddenly—"        (media, music, advances on end)
     6. Pomelo's ask                            (sprite + dialogue pages)
   All text renders Undertale/Pokemon typewriter style: first
   click finishes the line, second advances. Scene 6 draws the
   companion sprite (standing idle) and asks WHO ARE U — the name
   typed there IS the hero name (the separate character builder is
   gone; sq_character now holds { name } and window.SQCharacter.get
   lives here for the roadmap's "Playing as" line). The lullaby
   cues in for the capybara scenes only. Seen-state persists per
   device (sq_intro_seen = 'v2').
   ============================================================ */
(function () {
  'use strict';
  if (!document.body.classList.contains('page-map')) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KEY = 'sq_intro_seen';
  var VERSION = 'v2';
  var CHAR_KEY = 'sq_character';
  var CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01';

  var SCENES = [
    { id: 'bedroom', kind: 'media', loop: true,
      video: ['assets/intro/bedroom.mp4', CDN + '/hf_20260710_030436_8fa96d4e-b1e5-42d4-8f27-0ee298d74ee1.mp4'],
      text: 'Somewhere past midnight, the practice test sits open and untouched. You have reorganized your desk twice and studied the ceiling extensively. Anything but question seven.' },
    { id: 'orange', kind: 'media', sound: true,
      video: ['assets/intro/orange.mp4', CDN + '/hf_20260710_200915_4ce8fe29-f05f-4441-bbfb-5e0dd0a9027a.mp4'],
      text: 'Then something streaks past the window and lands on your desk with a soft thunk. An orange. Glowing. Still warm.' },
    { id: 'touch', kind: 'black', flashAfter: true,
      text: 'You touch it.' },
    { id: 'onsen', kind: 'media', loop: true, music: true,
      video: ['assets/intro/onsen.mp4'],
      image: ['assets/intro/onsen.png'],
      text: 'Somewhere far away: two capybaras, one steaming spring, a pile of oranges. Every day the same. Perfect.' },
    { id: 'snatch', kind: 'media', advanceOnEnd: true, music: true, enterSound: 'caw', enterSoundDelay: 400,
      video: ['assets/intro/snatch.mp4'],
      image: ['assets/intro/onsen.png'],
      text: 'And then, suddenly\u2014' },
    { id: 'pomelo', kind: 'dialogue',
      pages: [
        '* hello.',
        '* u found my orange. good.',
        { text: '* i am pomelo. who are u?', input: true },
        '* {name}. good name.',
        '* the big bird took mango to the top of the big mountain. big bird fast. leg too short.',
        '* the gates on the path only open if u answer questions. u are a scholar right? u are basically made of answers.',
        '* so. deal \u2014 u get mango back, i help u study.',
        '* i am extremely good at sitting next to people while they work. best in the world maybe.',
        '* deal?'
      ],
      choices: ['deal.', 'deal, obviously.'] }
  ];

  var overlay = null, idx = 0;
  var heroName = '';

  function seen() {
    try { return window.localStorage.getItem(KEY) === VERSION; } catch (e) { return false; }
  }
  function markSeen() {
    try { window.localStorage.setItem(KEY, VERSION); } catch (e) {}
  }

  /* ---------- the hero record (the builder's old job) ---------- */
  function loadCharacter() {
    try { return JSON.parse(window.localStorage.getItem(CHAR_KEY)); } catch (e) { return null; }
  }
  function saveCharacter(name) {
    var cfg = loadCharacter() || {};
    cfg.name = name;
    try { window.localStorage.setItem(CHAR_KEY, JSON.stringify(cfg)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('sq-character'));
  }
  window.SQCharacter = { get: loadCharacter };

  /* ---------- typewriter (Undertale/Pokemon) ----------
     Types one character at a time with longer holds on sentence
     punctuation and a soft click per letter. finish() completes
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
      '<canvas class="intro-pomelo" width="57" height="45" aria-label="Pomelo the capybara"></canvas>' +
      '<button class="intro-skip type-utility">Skip intro</button>' +
      '<div class="intro-caption pixel-frame">' +
        '<p class="intro-text" aria-live="polite"></p>' +
        '<span class="intro-cursor" aria-hidden="true">\u25BC</span>' +
        '<div class="intro-name" hidden>' +
          '<div class="intro-name-row">' +
            '<input type="text" maxlength="24" placeholder="type ur name" aria-label="Your name" />' +
            '<button class="intro-name-ok type-utility">ok</button>' +
          '</div>' +
          '<p class="intro-name-note type-utility">If a parent account is linked, this name appears on their progress reports.</p>' +
        '</div>' +
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
      if (e.target.closest('.intro-skip') || e.target.closest('.intro-choice') ||
          e.target.closest('.intro-name')) return;
      advance();
    });
    document.addEventListener('keydown', function (e) {
      if (!overlay || overlay.hidden) return;
      if (e.target && e.target.tagName === 'INPUT') return;      // the name field owns its keys
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
        if (!overlay.querySelector('.intro-choices').hidden) return; // buttons own Enter
        e.preventDefault();
        advance();
      }
    });

    var nameBox = overlay.querySelector('.intro-name');
    nameBox.querySelector('input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submitName(); }
    });
    nameBox.querySelector('.intro-name-ok').addEventListener('click', function (e) {
      e.stopPropagation();
      submitName();
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
    // scenes that bring their own audio play unmuted (respecting the sound toggle);
    // by scene 2 the begin-gate click has satisfied the autoplay policy
    vid.muted = !(step.sound && (!window.SQSfx || window.SQSfx.enabled()));
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

  /* ---------- Pomelo, drawn live from the companion sprite ----------
     He enters the way he does everything: on foot. A beat of blank
     dark after the snatch, then he walks in from the left with soft
     footsteps, stops at center, and the dialogue begins. Standing
     idle only afterwards — he is here on business, not to graze. */
  var pomeloTimer = null;
  var walking = false, walkArrive = null, walkTimers = [];
  var POMELO_IDLE = [ // frame, hold ms — stand with the occasional blink
    [0, 1900], [3, 150], [0, 1250], [3, 150], [0, 800], [3, 130], [0, 160], [3, 130]
  ];
  function pomeloCtx() {
    var canvas = overlay.querySelector('.intro-pomelo');
    if (!canvas) return null;
    var ctx = null;
    try { ctx = canvas.getContext('2d'); } catch (e) {}
    return ctx;
  }
  function drawPomelo(ctx, frame) {
    var canvas = overlay.querySelector('.intro-pomelo');
    // full clear under identity first: tween frames paint outside 43x39
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 3, 6); // padding so no frame kisses an edge
    window.SQCompanion.draw(ctx, frame);
  }
  function clearWalk() {
    walkTimers.forEach(clearTimeout);
    walkTimers = [];
  }
  function enterPomelo(step) {
    var canvas = overlay.querySelector('.intro-pomelo');
    var ctx = pomeloCtx();
    walking = true;
    overlay.classList.add('is-walking');
    canvas.style.left = '-14%';
    walkArrive = function () {
      if (!walking) return;
      walking = false;
      clearWalk();
      overlay.classList.remove('is-walking');
      canvas.style.left = '50%';
      startPomelo();
      typePage(step);
    };
    if (reduceMotion || !ctx || !window.SQCompanion) { walkArrive(); return; }
    // a beat of blank dark, then the walk
    walkTimers.push(setTimeout(function () {
      if (!walking) return;
      var frame = 2;
      (function stepFrames() {
        if (!walking) return;
        frame = frame === 1 ? 2 : 1;                 // the two walk frames
        drawPomelo(ctx, frame);
        if (window.SQSfx && window.SQSfx.step) window.SQSfx.step();
        walkTimers.push(setTimeout(stepFrames, 90));
      })();
      var start = performance.now();
      var DUR = 3000;
      (function move(now) {
        if (!walking) return;
        var p = Math.min(1, (now - start) / DUR);
        canvas.style.left = (-14 + 64 * p) + '%';     // -14% -> 50%
        if (p < 1) window.requestAnimationFrame(move);
        else walkArrive();
      })(start);
    }, 650));
  }
  function startPomelo() {
    var ctx = pomeloCtx();
    if (!ctx || !window.SQCompanion) return;
    drawPomelo(ctx, 0);
    if (reduceMotion) return;
    var step = 0;
    (function loop() {
      if (!overlay || overlay.hidden || SCENES[idx].kind !== 'dialogue') return;
      var fr = POMELO_IDLE[step % POMELO_IDLE.length];
      drawPomelo(ctx, fr[0]);
      step += 1;
      pomeloTimer = setTimeout(loop, fr[1]);
    })();
  }
  function stopPomelo() {
    if (pomeloTimer) { clearTimeout(pomeloTimer); pomeloTimer = null; }
    walking = false;
    clearWalk();
  }

  /* ---------- the name, given to a capybara ---------- */
  var pageIdx = 0;
  function pageAt(step, i) {
    var p = step.pages[i];
    var text = typeof p === 'string' ? p : p.text;
    return {
      text: text.replace('{name}', heroName || 'friend'),
      input: typeof p !== 'string' && !!p.input
    };
  }
  function showNameForm() {
    var box = overlay.querySelector('.intro-name');
    box.hidden = false;
    setCursor(false);
    var input = box.querySelector('input');
    input.value = heroName || '';
    input.focus();
  }
  function submitName() {
    var box = overlay.querySelector('.intro-name');
    heroName = (box.querySelector('input').value || '').trim() || 'friend';
    saveCharacter(heroName);
    box.hidden = true;
    nextPage();
  }
  function showBegin() {
    overlay.setAttribute('data-scene', 'begin');
    overlay.querySelector('.intro-media').classList.add('is-dark');
    overlay.querySelector('.intro-text').textContent = '';
    var c = overlay.querySelector('.intro-center');
    c.removeAttribute('data-full');
    c.textContent = '\u25BC  press to begin  \u25BC';
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

  function typePage(step) {
    var page = pageAt(step, pageIdx);
    var last = pageIdx === step.pages.length - 1;
    typewrite(overlay.querySelector('.intro-text'), page.text,
      page.input ? function () { showNameForm(); } :
      last ? function () { showChoices(step); } : null);
  }
  function nextPage() {
    var step = SCENES[idx];
    pageIdx += 1;
    if (pageIdx < step.pages.length) typePage(step);
  }

  function cueMusic(on) {
    if (window.SQMusic && window.SQMusic.cue) window.SQMusic.cue(on);
  }

  function render() {
    var step = SCENES[idx];
    overlay.setAttribute('data-scene', step.id);
    overlay.querySelector('.intro-choices').hidden = true;
    overlay.querySelector('.intro-name').hidden = true;
    pendingAutoAdvance = false;
    cueMusic(!!step.music);
    setMedia(step, idx);
    prefetchVideo(idx + 1); // stay one scene ahead
    overlay.querySelectorAll('.intro-dot').forEach(function (d, i) {
      d.classList.toggle('is-active', i === idx);
      d.classList.toggle('is-done', i < idx);
    });
    var textEl = overlay.querySelector('.intro-text');
    var centerEl = overlay.querySelector('.intro-center');
    centerEl.textContent = '';
    if (step.enterSound && window.SQSfx && window.SQSfx[step.enterSound]) {
      setTimeout(window.SQSfx[step.enterSound], step.enterSoundDelay || 0);
    }
    if (step.kind === 'black') {
      typewrite(centerEl, step.text);
    } else if (step.kind === 'dialogue') {
      pageIdx = 0;
      tw = null;
      enterPomelo(step);
    } else {
      typewrite(textEl, step.text, function () {
        if (pendingAutoAdvance) advance();   // snatch clip already ended
      });
    }
  }

  var dipping = false;
  var started = false;
  function advance() {
    if (!started) { started = true; render(); return; }   // the begin gate: this click unlocked audio
    if (walking) { if (walkArrive) walkArrive(); return; } // skip the entrance walk
    var step = SCENES[idx];
    if (!overlay.querySelector('.intro-name').hidden) return;   // Pomelo is waiting for a name
    if (tw && !tw.isDone()) { tw.finish(); return; }            // first press: finish the line
    if (step.kind === 'dialogue') {
      if (pageIdx >= step.pages.length - 1) return;             // choices are on screen
      nextPage();
      return;
    }
    if (idx >= SCENES.length - 1) return finish();
    if (dipping) return;
    dipping = true;
    var flash = overlay.querySelector('.intro-flash');
    if (step.flashAfter) {
      // the orange's light swells until it fills the screen, then we're elsewhere
      if (window.SQSfx && window.SQSfx.flare) window.SQSfx.flare();
      if (!reduceMotion) flash.classList.add('is-rising');
    }
    overlay.querySelector('.intro-media').classList.add('is-dark'); // fade to black
    setTimeout(function () {
      idx++;
      render();   // swap sources + caption in the dark; sceneReady fades back
      dipping = false;
      setTimeout(function () { flash.classList.remove('is-rising'); }, 120);
    }, reduceMotion ? 0 : (step.flashAfter ? 1900 : 300));
  }

  function finish() {
    markSeen();
    stopPomelo();
    cueMusic(false);
    window.__SQ_INTRO_OPEN = false;
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  function open() {
    if (!overlay) build();
    prefetchVideo(0);
    prefetchVideo(1);
    window.__SQ_INTRO_PRELOAD = true;
    window.__SQ_INTRO_OPEN = true;
    // unlock audio as early as the browser allows, so scene 1's
    // typewriter is audible — immediately if user activation carried
    // over, otherwise from the very first tap or keypress
    function wake() {
      if (window.SQSfx && window.SQSfx.wake) window.SQSfx.wake();
      document.removeEventListener('pointerdown', wake, true);
      document.removeEventListener('keydown', wake, true);
    }
    if (window.SQSfx && window.SQSfx.wake) window.SQSfx.wake();
    document.addEventListener('pointerdown', wake, true);
    document.addEventListener('keydown', wake, true);
    idx = 0;
    started = false;
    showBegin();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  window.SQIntro = { open: open, seen: seen };

  function init() { if (!seen()) open(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
