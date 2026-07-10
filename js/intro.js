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

  var HERO_VIDEO = ['assets/hero.mp4', '__CDN__/hf_20260707_160337_73e7a3e7-612c-49f7-ab6a-4f7920599476.mp4'];
  var SCENES = [
    { scene: 'bedroom', video: ['assets/intro/bedroom.mp4', 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260710_030436_8fa96d4e-b1e5-42d4-8f27-0ee298d74ee1.mp4'], image: ['assets/intro/bedroom.png', 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260710_022711_060638fc-4e28-4089-86a6-574270306697.png'],
      text: 'Somewhere past midnight, the practice test sits open and untouched. You have reorganized your desk twice and studied the ceiling extensively. Anything but question seven.' },
    { scene: 'summons', video: ['assets/intro/summons.mp4', 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260710_030446_a850f884-0043-4564-aa70-c16ef902f9b3.mp4'], image: ['assets/intro/summons.png', 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260710_022725_20fbc722-18c9-46d9-8c01-5b1feaa77e0f.png'],
      text: 'Then, beneath the flashcards, a warm light stirs. A letter that was not there before, sealed in gold, humming your name.' },
    { scene: 'portal', video: ['assets/intro/portal.mp4', 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260710_030454_ebf2faec-0853-418a-9e97-077e9ab60527.mp4'], image: ['assets/intro/portal.png', 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260710_022743_7503496a-a6fa-41cc-9a12-670db63ec102.png'],
      text: 'The room unravels into starlight, page by page, until only the glow remains. Far below, eight realms turn beneath a patient moon.' },
    { scene: 'hero', video: HERO_VIDEO,
      text: 'Duskmeadow, where the lantern light knows every path, and each realm guards one art of the exam. Master a realm, and its power walks with you.' },
    { scene: 'hero', video: HERO_VIDEO,
      text: 'The old scholars say those who walk the whole path come home changed. The path is waiting. So is your hero.', cta: 'Create your hero' },
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
      '<div class="intro-media" aria-hidden="true">' +
        '<canvas class="intro-canvas" width="480" height="270"></canvas>' +
        '<img class="intro-img" hidden alt="" />' +
        '<video class="intro-video" hidden muted loop playsinline autoplay></video>' +
      '</div>' +
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

  function setMedia(step) {
    var img = overlay.querySelector('.intro-img');
    var vid = overlay.querySelector('.intro-video');
    img.hidden = true; vid.hidden = true; vid.pause();
    function chain(el, sources, showEvent) {
      var srcs = (sources || []).filter(function (u) { return u && u.indexOf('__') !== 0; })
        .map(function (u) { return u.replace('__CDN__', 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01'); });
      if (!srcs.length) return false;
      var i = 0;
      el.onerror = function () { if (i < srcs.length) el.src = srcs[i++]; else el.hidden = true; };
      el['on' + showEvent] = function () { el.hidden = false; };
      el.src = srcs[i++];
      return true;
    }
    // prefer the animated Higgsfield render; fall back to the still, then canvas
    if (!chain(vid, step.video, 'canplay')) chain(img, step.image, 'load');
    else if (step.image) chain(img, step.image, 'load'); // still shows while/if video loads
  }

  function render() {
    var step = SCENES[idx];
    setMedia(step);
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
