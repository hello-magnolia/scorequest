/* ============================================================
   ScoreQuest — character builder
   ------------------------------------------------------------
   A creation screen shown before the first journey: pick your
   hat, tunic, and scarf colors on a live animated sprite preview,
   name your hero, and begin. Saved to localStorage (per device)
   as sq_character; window.SQCharacter is the shared accessor the
   roadmap sprite reads its palette from. A "Customize hero"
   button on the map reopens it any time.
   ============================================================ */
(function () {
  'use strict';
  var PW = window.PixelWorld;
  if (!PW || !PW.sprite) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KEY = 'sq_character';

  var OPTIONS = {
    hat: [
      { name: 'Dusk',   hatLight: '#8E7CC3', hatDark: '#6E4680' },
      { name: 'Berry',  hatLight: '#E2695A', hatDark: '#B3372E' },
      { name: 'Forest', hatLight: '#4C8A5B', hatDark: '#2E6B3F' },
      { name: 'Gold',   hatLight: '#F2B63C', hatDark: '#A87A1A' },
    ],
    tunic: [
      { name: 'Pine',   tunic: '#2E6B55', tunicDark: '#1F4A3B' },
      { name: 'Indigo', tunic: '#3A3F6E', tunicDark: '#262052' },
      { name: 'Rust',   tunic: '#C96A3D', tunicDark: '#8A452B' },
      { name: 'Plum',   tunic: '#6E4680', tunicDark: '#4A3A5E' },
    ],
    scarf: [
      { name: 'Gold', scarf: '#F2B63C' },
      { name: 'Mint', scarf: '#7FE3C0' },
      { name: 'Rose', scarf: '#E58BA5' },
      { name: 'Sky',  scarf: '#57C7CE' },
    ],
  };

  function load() {
    try { return JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { return null; }
  }
  function save(cfg) {
    try { window.localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('sq-character'));
  }
  function palette(cfg) {
    cfg = cfg || load() || {};
    return Object.assign({},
      OPTIONS.hat[cfg.hat || 0], OPTIONS.tunic[cfg.tunic || 0], OPTIONS.scarf[cfg.scarf || 0]);
  }

  window.SQCharacter = {
    get: function () { return load(); },
    palette: function () { return palette(); },
    open: openBuilder,
  };

  /* ---------- the builder screen ---------- */
  var overlay = null;
  var draft = { hat: 0, tunic: 0, scarf: 0, name: '' };
  var previewCtx = null;

  function swatchRow(kind, label) {
    return '<div class="builder-row">' +
      '<span class="builder-label type-utility">' + label + '</span>' +
      '<span class="builder-swatches">' +
        OPTIONS[kind].map(function (opt, i) {
          var c = opt.hatLight || opt.tunic || opt.scarf;
          return '<button class="swatch" data-kind="' + kind + '" data-i="' + i + '"' +
            ' style="--swatch:' + c + '" aria-label="' + label + ': ' + opt.name + '"></button>';
        }).join('') +
      '</span></div>';
  }

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'builder-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="builder-panel pixel-frame" role="dialog" aria-modal="true" aria-labelledby="builder-title">' +
        '<p class="eyebrow type-utility">New adventurer</p>' +
        '<h2 class="builder-title" id="builder-title">Build your hero</h2>' +
        '<div class="builder-preview"><canvas width="16" height="20"></canvas></div>' +
        swatchRow('hat', 'Hat') +
        swatchRow('tunic', 'Tunic') +
        swatchRow('scarf', 'Scarf') +
        '<label class="auth-field builder-name"><span class="type-utility">Hero name</span>' +
          '<input type="text" maxlength="24" placeholder="e.g. Nova" /></label>' +
        '<button class="btn btn-gold btn-block builder-begin">Begin the journey</button>' +
      '</div>';
    document.body.appendChild(overlay);
    previewCtx = overlay.querySelector('canvas').getContext('2d');

    overlay.querySelectorAll('.swatch').forEach(function (b) {
      b.addEventListener('click', function () {
        draft[b.getAttribute('data-kind')] = parseInt(b.getAttribute('data-i'), 10);
        markActive();
        drawPreview(0);
      });
    });

    overlay.querySelector('.builder-begin').addEventListener('click', function () {
      draft.name = overlay.querySelector('.builder-name input').value.trim() || draft.name || 'Adventurer';
      save(draft);
      closeBuilder();
    });

    // preview idles through the walk cycle so the hero feels alive
    if (!reduceMotion) {
      (function strut(now) {
        if (!overlay.hidden) drawPreview(Math.floor(now / 260) % 2 + 1);
        requestAnimationFrame(strut);
      })(performance.now());
    }
  }

  function markActive() {
    overlay.querySelectorAll('.swatch').forEach(function (b) {
      b.classList.toggle('is-active',
        draft[b.getAttribute('data-kind')] === parseInt(b.getAttribute('data-i'), 10));
    });
  }

  function drawPreview(frame) {
    if (previewCtx) PW.sprite.draw(previewCtx, frame, palette(draft));
  }

  function openBuilder() {
    if (!overlay) buildOverlay();
    var existing = load();
    if (existing) draft = Object.assign({ hat: 0, tunic: 0, scarf: 0, name: '' }, existing);
    var nameInput = overlay.querySelector('.builder-name input');
    if (!draft.name && window.SQAuth && window.SQAuth.getUser()) {
      var prof = window.SQAuth.getUser().user_metadata || {};
      draft.name = prof.hero_name || '';
    }
    nameInput.value = draft.name || '';
    markActive();
    drawPreview(0);
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeBuilder() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  /* first visit to the map: build your hero before the journey */
  function init() {
    var customize = document.getElementById('customize-hero');
    if (customize) customize.addEventListener('click', openBuilder);
    var introPending = window.SQIntro && !window.SQIntro.seen();
    if (!load() && !introPending) openBuilder();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
