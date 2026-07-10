/* ============================================================
   ScoreQuest — intro cinematic
   ------------------------------------------------------------
   A five-scene opening the player clicks through on their first
   visit to the World Map, before building their hero:
     1. Late night, practice-test misery
     2. The glowing summons
     3. The room dissolves into starlight
     4. Arrival: the realms (the Duskmeadow valley)
     5. The call: create your hero
   Scenes are the live pixel engine, captions advance on click,
   Skip is always available, and finishing opens the character
   builder. Seen-state persists per device (sq_intro_seen).
   ============================================================ */
(function () {
  'use strict';
  var PW = window.PixelWorld;
  if (!PW || !document.body.classList.contains('page-map')) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KEY = 'sq_intro_seen';

  var SCENES = [
    { scene: 'bedroom', text: '11:52 PM. Another practice test, another headache. Test day is 63 days away, and none of it is sticking.' },
    { scene: 'summons', text: 'Then, under the flashcards, something glows. A summons, addressed to you.' },
    { scene: 'portal',  text: 'The room dissolves into starlight. Somewhere far away, eight realms are waiting.' },
    { scene: 'hero',    text: 'Each realm holds one domain of the exam. Clear its quests, and its power becomes yours.' },
    { scene: 'hero',    text: 'Heroes who walk the whole path return changed. Your quest begins now.', cta: 'Create your hero' },
  ];

  var overlay = null, canvasCtx = null, idx = 0;

  function seen() {
    try { return !!window.localStorage.getItem(KEY); } catch (e) { return false; }
  }
  function markSeen() {
    try { window.localStorage.setItem(KEY, '1'); } catch (e) {}
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<canvas class="intro-canvas" width="480" height="270" aria-hidden="true"></canvas>' +
      '<div class="intro-vignette" aria-hidden="true"></div>' +
      '<button class="intro-skip type-utility">Skip intro</button>' +
      '<div class="intro-caption pixel-frame">' +
        '<p class="intro-text" aria-live="polite"></p>' +
        '<div class="intro-foot">' +
          '<div class="intro-dots">' + SCENES.map(function () { return '<span class="intro-dot"></span>'; }).join('') + '</div>' +
          '<button class="btn btn-gold intro-next">Continue</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    canvasCtx = overlay.querySelector('.intro-canvas').getContext('2d');

    overlay.querySelector('.intro-next').addEventListener('click', function (e) {
      e.stopPropagation();
      advance();
    });
    overlay.querySelector('.intro-skip').addEventListener('click', function (e) {
      e.stopPropagation();
      finish();
    });
    // clicking anywhere on the scene advances, like the opening of a game
    overlay.addEventListener('click', function (e) {
      if (e.target.closest('.intro-caption') || e.target.closest('.intro-skip')) return;
      advance();
    });

    var start = performance.now();
    (function frame(now) {
      if (!overlay.hidden) {
        var sc = PW.scenes[SCENES[idx].scene];
        if (sc) sc.draw(canvasCtx, 480, 270, reduceMotion ? 2 : (now - start) / 1000);
      }
      requestAnimationFrame(frame);
    })(performance.now());
  }

  function render() {
    var step = SCENES[idx];
    overlay.querySelector('.intro-text').textContent = step.text;
    var next = overlay.querySelector('.intro-next');
    next.textContent = step.cta || 'Continue';
    overlay.querySelectorAll('.intro-dot').forEach(function (d, i) {
      d.classList.toggle('is-active', i === idx);
      d.classList.toggle('is-done', i < idx);
    });
  }

  function advance() {
    if (window.SQSfx) window.SQSfx.uiTick();
    if (idx >= SCENES.length - 1) return finish();
    idx++;
    render();
  }

  function finish() {
    markSeen();
    overlay.hidden = true;
    document.body.style.overflow = '';
    // straight into character creation, then the map
    if (window.SQCharacter && !window.SQCharacter.get()) window.SQCharacter.open();
  }

  function open() {
    if (!overlay) build();
    idx = 0;
    render();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  window.SQIntro = { open: open, seen: seen };

  function init() { if (!seen()) open(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
