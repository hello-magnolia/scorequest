/* ============================================================
   ScoreQuest - page behaviour
   1. Hero: live canvas world (or assets/hero.mp4 if present)
   2. Realm card canvases
   3. Typewriter hero subline
   4. Scroll reveals (IntersectionObserver, staggered)
   5. Quest trail: dash-draws with scroll progress
   6. Count-up stats + XP bars
   7. Realm filter pills
   8. Sticky nav state
   ============================================================ */
(function () {
  console.log('ScoreQuest build b20260711b');
  'use strict';
  var PW = window.PixelWorld;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 0. hub head: player line + world rank ----------
     (owned by roadmap.js until the roadmap retired) */
  (function hubHead() {
    var line = document.getElementById('mappage-player');
    if (line && window.SQAuth) {
      var lastAuth = {};
      var refreshPlayer = function () {
        var chr = window.SQCharacter && window.SQCharacter.get && window.SQCharacter.get();
        var name = (chr && chr.name) || (lastAuth.user ? ((lastAuth.profile && lastAuth.profile.hero_name) || 'Hero') : null);
        line.hidden = !name;
        if (name) document.getElementById('mappage-player-name').textContent = name;
      };
      window.SQAuth.onChange(function (st) { lastAuth = st; refreshPlayer(); });
      window.addEventListener('sq-character', refreshPlayer);
    }
    var rank = document.getElementById('world-rank');
    if (rank && window.SQGame && window.SQGame.totalLevel) {
      rank.textContent = 'Lv ' + window.SQGame.totalLevel();
    }
  })();

  /* ---------- 1. hero background ---------- */
  var heroCanvas = document.getElementById('hero-canvas');
  var heroVideo = document.getElementById('hero-video');
  var heroRunning = true;

  function setupHeroCanvas() {
    var scene = PW.scenes.hero;
    var low = document.createElement('canvas');
    low.width = scene.w; low.height = scene.h;
    var lctx = low.getContext('2d');
    var hctx = heroCanvas.getContext('2d');

    function size() {
      // render at logical res, scale to cover; keep the buffer pixel-perfect
      var rect = heroCanvas.parentElement.getBoundingClientRect();
      var w = rect.width || scene.w, h = rect.height || scene.h;
      var scale = Math.max(1, Math.ceil(Math.max(w / scene.w, h / scene.h)));
      heroCanvas.width = scene.w * scale;
      heroCanvas.height = scene.h * scale;
      hctx.imageSmoothingEnabled = false;
    }
    size();
    window.addEventListener('resize', size);

    var start = performance.now();
    function frame(now) {
      if (!heroRunning) return;
      var t = reduceMotion ? 0 : (now - start) / 1000;
      scene.draw(lctx, scene.w, scene.h, t);
      hctx.imageSmoothingEnabled = false;
      hctx.drawImage(low, 0, 0, heroCanvas.width, heroCanvas.height);
      if (!reduceMotion) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Hero media: the video (already fetching via its HTML sources) fades in on its
  // first ready frame. The live canvas is a fallback, not an opening act: it only
  // appears if every source fails, or as an interim if the network stalls hard.
  function tryHeroVideo() {
    var canvasStarted = false;
    function fallbackToCanvas() {
      if (canvasStarted || !PW) return;
      canvasStarted = true;
      heroCanvas.hidden = false;
      setupHeroCanvas();
    }
    var stallTimer = setTimeout(fallbackToCanvas, 4000);
    heroVideo.addEventListener('canplay', function () {
      clearTimeout(stallTimer);
      heroVideo.classList.remove('is-loading');
      heroRunning = false;
      heroCanvas.hidden = true;
    });
    var last = heroVideo.querySelector('source:last-of-type');
    if (last) last.addEventListener('error', function () {   // every source failed
      clearTimeout(stallTimer);
      heroVideo.hidden = true;
      heroRunning = true;
      fallbackToCanvas();
    });
  }

  if (heroCanvas && heroVideo) { tryHeroVideo(); }

  /* ---------- 2. realm card art: generated image first, canvas fallback ---------- */
  function startCardCanvas(cv) {
    var scene = PW && PW.scenes[cv.getAttribute('data-scene')];
    if (!scene) return;
    var ctx = cv.getContext('2d');
    scene.draw(ctx, scene.w, scene.h, 0);
    if (reduceMotion) { scene.draw(ctx, scene.w, scene.h, 2); return; }
    var visible = true, start = performance.now();
    function loop(now) {
      if (visible) scene.draw(ctx, scene.w, scene.h, (now - start) / 1000);
      requestAnimationFrame(loop);
    }
    if (typeof IntersectionObserver === 'function') {
      visible = false;
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }, { rootMargin: '60px' }).observe(cv);
    }
    requestAnimationFrame(loop);
  }

  document.querySelectorAll('.card-art').forEach(function (art) {
    var img = art.querySelector('img');
    var cv = art.querySelector('canvas');
    if (!img) { if (cv) startCardCanvas(cv); return; }
    var sources = [img.getAttribute('data-local'), img.getAttribute('data-cdn')]
      .filter(function (s) { return s && s.indexOf('__') !== 0; });
    var i = 0;
    function next() {
      if (i >= sources.length) { img.remove(); startCardCanvas(cv); return; }
      img.src = sources[i++];
    }
    img.addEventListener('error', next);
    img.addEventListener('load', function () { if (cv) cv.hidden = true; });
    next();
  });

  /* ---------- 3. typewriter ---------- */
  var lines = [
    'Grind XP, not anxiety.',
    'Six realms. One score goal.',
    'Boss battles are full-length mocks.',
    'Your best score is out there. Go get it.'
  ];
  var tw = document.getElementById('typewriter');
  if (tw) {
    if (reduceMotion) {
      tw.textContent = lines[0];
    } else {
      var li = 0, ci = 0, deleting = false;
      (function tick() {
        var line = lines[li];
        if (!deleting) {
          ci++;
          tw.textContent = line.slice(0, ci);
          if (ci === line.length) { deleting = true; return setTimeout(tick, 2100); }
          return setTimeout(tick, 46);
        }
        ci--;
        tw.textContent = line.slice(0, ci);
        if (ci === 0) { deleting = false; li = (li + 1) % lines.length; return setTimeout(tick, 420); }
        setTimeout(tick, 22);
      })();
    }
  }

  /* ---------- 4. scroll reveals ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  // stagger siblings inside grids for a cascading entrance
  document.querySelectorAll('.cards, .features, .plans, .steps').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty('--reveal-delay', (i * 90) + 'ms');
    });
  });
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
          if (e.target.classList.contains('forecast')) fillBars(e.target);
          if (e.target.classList.contains('hero-stats')) countUps(e.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
    // allow modules that insert content later (e.g. the world map) to join in
    window.SQRevealObserve = function (el) { io.observe(el); };
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    document.querySelectorAll('.forecast').forEach(fillBars);
    document.querySelectorAll('.hero-stats').forEach(countUps);
    window.SQRevealObserve = function (el) { el.classList.add('is-visible'); };
  }

  /* ---------- 5. quest trail draws with scroll ---------- */
  var trailPath = document.getElementById('trail-path');
  if (trailPath) {
    // normalise the path to 100 units so scroll math is resolution-independent
    trailPath.setAttribute('pathLength', '100');
    trailPath.style.strokeDasharray = '4 3.4'; /* in pathLength units: dotted */
    trailPath.style.strokeDashoffset = '0';
    var trailWrap = trailPath.closest('.trail-wrap');
    var mask = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mask.setAttribute('d', trailPath.getAttribute('d'));
    mask.setAttribute('pathLength', '100');
    mask.style.fill = 'none';
    mask.style.stroke = 'var(--ink-2)';
    mask.style.strokeWidth = '9';
    mask.style.strokeDasharray = '100 100';
    mask.style.strokeDashoffset = '0';
    trailPath.parentNode.appendChild(mask); // covers the trail; recedes on scroll

    function updateTrail() {
      var r = trailWrap.getBoundingClientRect();
      var vh = window.innerHeight;
      // progress: 0 when section top hits 85% of viewport, 1 when bottom hits 35%
      var total = r.height + vh * 0.5;
      var passed = Math.min(Math.max(vh * 0.85 - r.top, 0), total);
      var p = passed / total;
      mask.style.strokeDashoffset = String(-100 * p);
    }
    if (reduceMotion) {
      mask.remove();
    } else {
      updateTrail();
      window.addEventListener('scroll', updateTrail, { passive: true });
      window.addEventListener('resize', updateTrail);
    }
  }

  /* ---------- 6. count-ups + XP bars ---------- */
  function countUps(scope) {
    scope.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var from = parseInt(el.getAttribute('data-start') || '0', 10);
      if (reduceMotion) { el.textContent = String(target); return; }
      var t0 = performance.now(), dur = 1300;
      (function step(now) {
        var p = Math.min((now - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(from + (target - from) * eased));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }
  function fillBars(scope) {
    scope.querySelectorAll('.bar-fill').forEach(function (bar) {
      requestAnimationFrame(function () {
        bar.style.width = bar.getAttribute('data-fill') + '%';
      });
    });
    countUps(scope);
  }

  /* ---------- 7. realm filters (R&W / Math) ---------- */
  var pills = document.querySelectorAll('.pill');
  var cards = document.querySelectorAll('.card');
  pills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      pills.forEach(function (p) { p.classList.remove('is-active'); });
      pill.classList.add('is-active');
      var f = pill.getAttribute('data-filter');
      cards.forEach(function (card) {
        var section = card.getAttribute('data-section');
        var show = f === 'all' || section === f;
        card.classList.toggle('is-filtered', !show);
      });
    });
  });

  /* ---------- 8. sticky nav ---------- */
  var nav = document.getElementById('nav');
  function navState() { nav.classList.toggle('is-scrolled', window.scrollY > 24); }
  navState();
  window.addEventListener('scroll', navState, { passive: true });
})();
