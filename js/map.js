/* ============================================================
   ScoreQuest - map progression interface
   ------------------------------------------------------------
   Renders:
   1. A live world map: 8 realm nodes on a winding trail, each showing
      lock / level / progress, colored by section. Cleared realms get a
      banner flag. Locked realms are dimmed with a lock glyph.
   2. Progress overlays on the existing realm cards (level pip + XP bar),
      and a "Start quest" button that opens the quest drawer.
   3. A quest drawer: a short sample question set for the realm. Answering
      calls SQGame.completeQuest -> awards XP -> animates the map + card,
      with level-up / realm-cleared celebration.

   Depends on SQGame (state) and SQAuth (persistence). Degrades: if a
   visitor isn't signed in, playing a quest still works in-session and a
   gentle nudge invites them to create a hero to save it.
   ============================================================ */
(function () {
  'use strict';
  if (!window.SQGame) return;
  var G = window.SQGame;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- tiny sample quests per realm (demo content) ---------- */
  var QUESTS = {
    info: [
      { q: 'A passage’s central idea is best described as its…', why: 'The central idea is the point the whole passage supports, not any single detail.', a: ['main point', 'first sentence', 'longest word', 'title'], correct: 0 },
      { q: '“Command of evidence” asks you to…', why: 'Command of evidence means choosing the lines that directly back up a claim.', a: ['guess the author’s mood', 'find text that supports a claim', 'count paragraphs', 'define a word'], correct: 1 },
      { q: 'An inference is a conclusion based on…', why: 'An inference combines what the text says with what it implies. No outside guessing.', a: ['stated + implied clues', 'the answer key', 'your opinion', 'the title only'], correct: 0 },
    ],
    craft: [
      { q: '“Words in context” questions test a word’s…', why: 'The test asks what the word means in this sentence, which can differ from its everyday meaning.', a: ['dictionary rank', 'meaning in that sentence', 'syllable count', 'origin'], correct: 1 },
      { q: 'Two texts that disagree have a relationship of…', why: 'When two passages push against each other, describe the relationship as tension or contrast.', a: ['agreement', 'tension / contrast', 'repetition', 'no connection'], correct: 1 },
      { q: 'An author’s “purpose” is…', why: 'Purpose is the author\'s reason for writing: to argue, explain, or entertain.', a: ['why they wrote it', 'how long it is', 'the font', 'the date'], correct: 0 },
    ],
    expression: [
      { q: 'A transition like “however” signals…', why: 'However tells the reader the next idea pushes against the previous one.', a: ['a contrast', 'an example', 'a cause', 'agreement'], correct: 0 },
      { q: 'The best transition depends on the…', why: 'Pick the transition that matches the logic between the sentences, not the fanciest word.', a: ['sentence length', 'logical relationship', 'first letter', 'paragraph number'], correct: 1 },
      { q: 'Rhetorical synthesis rewards the choice that…', why: 'The right choice is the one that accomplishes the stated goal, even if others sound fine.', a: ['is longest', 'meets the stated goal', 'sounds fancy', 'repeats the prompt'], correct: 1 },
    ],
    conventions: [
      { q: 'Two independent clauses can be joined with…', why: 'A comma alone splices two complete sentences. A semicolon can legally join them.', a: ['a comma alone', 'a semicolon', 'nothing', 'an apostrophe'], correct: 1 },
      { q: 'Subject–verb agreement means the verb matches the subject’s…', why: 'Singular subjects take singular verbs and plural subjects take plural verbs. Match the number.', a: ['number', 'color', 'length', 'tense only'], correct: 0 },
      { q: '“Its” vs “it’s”: “it’s” means…', why: 'It\'s is the contraction of it is or it has. Its (no apostrophe) shows possession.', a: ['belonging to it', 'it is / it has', 'many its', 'a typo'], correct: 1 },
    ],
    algebra: [
      { q: 'Solve 2x + 4 = 10. x = ?', why: 'Subtract 4 from both sides to get 2x = 6, then divide by 2: x = 3.', a: ['2', '3', '4', '7'], correct: 1 },
      { q: 'The slope of y = 3x − 1 is…', why: 'In y = mx + b form, the slope is m, the number multiplying x. Here that is 3.', a: ['−1', '1', '3', '0'], correct: 2 },
      { q: 'A system with no solution has lines that are…', why: 'Parallel lines share a slope but never meet, so the system has no solution.', a: ['parallel', 'the same', 'perpendicular', 'curved'], correct: 0 },
    ],
    advmath: [
      { q: 'The vertex form of a parabola is y = a(x − h)² + …', why: 'Vertex form is y = a(x - h)² + k, where (h, k) is the vertex.', a: ['k', 'b', 'x', 'c'], correct: 0 },
      { q: 'x² = 9 has solutions x = …', why: 'Both 3 and -3 square to 9, so take both roots: x = ±3.', a: ['3 only', '−3 only', '±3', '9'], correct: 2 },
      { q: '2³ · 2² = …', why: 'When multiplying powers with the same base, add the exponents: 3 + 2 = 5.', a: ['2⁵', '2⁶', '4⁵', '2¹'], correct: 0 },
    ],
    data: [
      { q: '20 is what percent of 50?', why: '20 ÷ 50 = 0.4, and 0.4 written as a percent is 40%.', a: ['20%', '30%', '40%', '50%'], correct: 2 },
      { q: 'The median of 2, 4, 9 is…', why: 'The median is the middle value once the list is in order: 2, 4, 9 gives 4.', a: ['2', '4', '5', '9'], correct: 1 },
      { q: 'A rate of 60 miles in 2 hours is…', why: 'Divide distance by time: 60 miles ÷ 2 hours = 30 mph.', a: ['30 mph', '60 mph', '120 mph', '2 mph'], correct: 0 },
    ],
    geometry: [
      { q: 'Angles in a triangle sum to…', why: 'The interior angles of any triangle always add up to 180°.', a: ['90°', '180°', '270°', '360°'], correct: 1 },
      { q: 'The area of a circle is…', why: 'Area is πr². The formula 2πr gives the circumference instead.', a: ['2πr', 'πr²', 'πd', 'r²'], correct: 1 },
      { q: 'In a right triangle, a² + b² = …', why: 'The legs squared sum to the hypotenuse squared: a² + b² = c².', a: ['c', 'c²', '2c', 'ab'], correct: 1 },
    ],
  };

  var mapWrap, drawer;

  /* ============================================================
     2. CARD OVERLAYS - level pip + XP bar + Start quest button
     ============================================================ */
  function decorateCards() {
    document.querySelectorAll('.card').forEach(function (card) {
      var kicker = card.querySelector('.card-kicker');
      if (!kicker) return;
      // derive realm id from the canvas fallback's data-scene
      var cv = card.querySelector('canvas[data-scene]');
      var id = cv && cv.getAttribute('data-scene');
      if (!id || !G.byId(id)) return;
      card.setAttribute('data-realm', id);

      var meta = card.querySelector('.card-meta');
      var prog = document.createElement('div');
      prog.className = 'card-progress';
      prog.innerHTML =
        '<div class="card-bar"><div class="card-bar-fill"></div></div>' +
        '<button class="btn btn-outline btn-quest">Start quest</button>';
      meta.parentNode.insertBefore(prog, meta.nextSibling);
      prog.querySelector('.btn-quest').addEventListener('click', function () { openQuest(id); });
    });
    refreshCards();
  }

  function refreshCards() {
    var s = G.getState();
    document.querySelectorAll('.card[data-realm]').forEach(function (card) {
      var id = card.getAttribute('data-realm');
      var st = s.realms[id];
      var fill = card.querySelector('.card-bar-fill');
      if (fill) fill.style.width = (st.cleared ? 100 : st.pct) + '%';
      var btn = card.querySelector('.btn-quest');
      if (btn) {
        if (!st.unlocked) { btn.textContent = '🔒 Locked'; btn.disabled = true; }
        else if (st.cleared) { btn.textContent = '★ Replay quest'; btn.disabled = false; }
        else { btn.textContent = 'Start quest'; btn.disabled = false; }
      }
      card.classList.toggle('realm-locked', !st.unlocked);
      card.classList.toggle('realm-cleared', st.cleared);
    });
  }

  /* ============================================================
     3. QUEST DRAWER - the loop that actually earns XP
     ============================================================ */
  function buildDrawer() {
    drawer = document.createElement('div');
    drawer.className = 'quest-overlay';
    drawer.hidden = true;
    drawer.innerHTML =
      '<div class="quest-panel pixel-frame" role="dialog" aria-modal="true" aria-labelledby="quest-title">' +
        '<div class="quest-scene" aria-hidden="true"><canvas width="240" height="104"></canvas><img alt="" hidden /></div>' +
        '<div class="quest-scrim" aria-hidden="true"></div>' +
        '<button class="quest-close" aria-label="Close">\u2715</button>' +
        '<p class="eyebrow type-utility quest-eyebrow" id="quest-eyebrow"></p>' +
        '<h3 class="quest-title" id="quest-title"></h3>' +
        '<div class="quest-progress type-utility" id="quest-progress"></div>' +
        '<div class="quest-stage" id="quest-stage"></div>' +
      '</div>';
    document.body.appendChild(drawer);
    drawer.querySelector('.quest-close').addEventListener('click', closeQuest);
    drawer.addEventListener('click', function (e) { if (e.target === drawer) closeQuest(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) closeQuest(); });

    // ambient biome backdrop: animated canvas, upgraded to the generated
    // image when it loads (local file first, then the Higgsfield CDN)
    var sceneCv = drawer.querySelector('.quest-scene canvas');
    var sceneCtx = sceneCv.getContext('2d');
    var sceneStart = performance.now();
    (function ambient(now) {
      if (!drawer.hidden && drawer._scene && !reduceMotion) {
        drawer._scene.draw(sceneCtx, 240, 104, (now - sceneStart) / 1000);
      }
      requestAnimationFrame(ambient);
    })(performance.now());
  }

  function setQuestScene(r) {
    var PW = window.PixelWorld;
    var panel = drawer.querySelector('.quest-panel');
    var cv = drawer.querySelector('.quest-scene canvas');
    var img = drawer.querySelector('.quest-scene img');
    panel.setAttribute('data-section', r.section);
    drawer._scene = PW && PW.scenes[r.scene];
    if (drawer._scene) drawer._scene.draw(cv.getContext('2d'), 240, 104, 2);
    // generated-art chain on top of the live canvas
    img.hidden = true;
    img.removeAttribute('src');
    var sources = [r.art, r.cdn].filter(Boolean);
    var i = 0;
    img.onerror = function () { if (i < sources.length) img.src = sources[i++]; else img.hidden = true; };
    img.onload = function () { img.hidden = false; };
    if (sources.length) img.src = sources[i++];
  }

  var session = null;

  function openQuest(realmId) {
    var st = G.realmState(realmId);
    if (!st.unlocked) return;
    if (!drawer) buildDrawer();
    var r = G.byId(realmId);
    var pool = (QUESTS[realmId] || []).slice();
    session = { realmId: realmId, items: pool, i: 0, correct: 0, total: pool.length };

    setQuestScene(r);
    drawer.querySelector('#quest-eyebrow').textContent = r.domain + ' · Lv ' + st.level;
    drawer.querySelector('#quest-title').textContent = r.name + ': side quest';
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    renderQuestStep();
  }

  function renderQuestStep() {
    var stage = drawer.querySelector('#quest-stage');
    var prog = drawer.querySelector('#quest-progress');
    var item = session.items[session.i];
    prog.textContent = 'Question ' + (session.i + 1) + ' / ' + session.total;

    if (!item) return renderQuestResult();

    stage.innerHTML =
      '<p class="quest-q">' + item.q + '</p>' +
      '<div class="quest-answers">' +
        item.a.map(function (opt, idx) {
          return '<button class="quest-answer" data-idx="' + idx + '">' + opt + '</button>';
        }).join('') +
      '</div>' +
      /* TEMP-SKIP (testing): moves on without scoring */
      '<button class="sq-skip-test" type="button">Skip (testing)</button>' +
      '<div class="quest-fbslot"></div>';

    stage.querySelector('.sq-skip-test').addEventListener('click', function () {
      session.i++;
      renderQuestStep();
    });

    var fbslot = stage.querySelector('.quest-fbslot');
    stage.querySelectorAll('.quest-answer').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        var right = idx === item.correct;
        if (window.SQSfx) { if (right) window.SQSfx.correct(); else window.SQSfx.wrong(); }
        if (right) session.correct++;
        stage.querySelectorAll('.quest-answer').forEach(function (b, bi) {
          b.disabled = true;
          if (bi === item.correct) b.classList.add('is-correct');
          else if (bi === idx) b.classList.add('is-wrong');
        });
        // feedback strip: celebrate or explain, then the player continues
        var body = right
          ? (item.why || 'Nailed it.')
          : 'Answer: ' + item.a[item.correct] + '. ' + (item.why || '');
        fbslot.innerHTML =
          '<div class="quest-feedback ' + (right ? 'is-right' : 'is-wrong') + '">' +
            '<div class="fb-text">' +
              '<p class="fb-title type-utility">' + (right ? '\u2713 Correct!' : '\u2717 Not quite') + '</p>' +
              '<p class="fb-body">' + body + '</p>' +
            '</div>' +
            '<button class="btn quest-continue ' + (right ? 'btn-gold' : 'btn-outline') + '">Continue</button>' +
          '</div>';
        var cont = fbslot.querySelector('.quest-continue');
        cont.focus();
        cont.addEventListener('click', function () { session.i++; renderQuestStep(); });
      });
    });
  }

  function renderQuestResult() {
    var stage = drawer.querySelector('#quest-stage');
    var res = G.completeQuest(session.realmId, session.correct, session.total);
    var signedIn = !!(window.SQAuth && window.SQAuth.getUser());

    var banner =
      res.cleared ? '<p class="quest-badge cleared">★ Realm cleared! ' + G.byId(session.realmId).name + ' conquered.</p>' :
      res.leveledUp ? '<p class="quest-badge levelup">▲ Level up! Now Lv ' + res.newLevel + '.</p>' : '';

    stage.innerHTML =
      banner +
      '<p class="quest-score">You answered <strong>' + session.correct + ' / ' + session.total + '</strong> correctly.</p>' +
      '<p class="quest-xp type-utility">+' + res.earned + ' XP earned</p>' +
      (signedIn
        ? '<p class="quest-saved type-utility">✓ Saved to your hero</p>'
        : '<p class="quest-saved type-utility warn">Progress kept for this session. <button class="quest-signup">Create a hero</button> to save it.</p>') +
      '<div class="quest-actions">' +
        '<button class="btn btn-gold quest-done">Return to map</button>' +
      '</div>';

    if (res.leveledUp || res.cleared) { if (window.SQSfx) window.SQSfx.levelup(); }
    if (!reduceMotion && (res.leveledUp || res.cleared)) burst();

    stage.querySelector('.quest-done').addEventListener('click', closeQuest);
    var su = stage.querySelector('.quest-signup');
    if (su) su.addEventListener('click', function () { closeQuest(); if (window.SQAuth) window.SQAuth.openModal('up'); });

    refreshCards();
  }

  function closeQuest() {
    window.dispatchEvent(new CustomEvent('sq-quest-closed'));
    if (!drawer) return;
    drawer.hidden = true;
    document.body.style.overflow = '';
    session = null;
  }

  /* confetti-ish pixel burst for level-ups */
  function burst() {
    var panel = drawer.querySelector('.quest-panel');
    var colors = ['#F2B63C', '#79C77B', '#9A86D9', '#E2695A', '#57C7CE'];
    for (var i = 0; i < 24; i++) {
      var p = document.createElement('span');
      p.className = 'pixel-confetti';
      p.style.left = (20 + Math.random() * 60) + '%';
      p.style.top = '30%';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 2 - 1) * 120 + 'px');
      p.style.setProperty('--dy', (80 + Math.random() * 160) + 'px');
      p.style.animationDelay = (Math.random() * 0.15) + 's';
      panel.appendChild(p);
      setTimeout((function (el) { return function () { el.remove(); }; })(p), 1200);
    }
  }

  /* ---------- init ---------- */
  function init() {
    decorateCards();
    buildDrawer();
    G.onChange(function () { refreshCards(); });
  }
  // expose the quest drawer so other surfaces (the roadmap page) can launch quests
  window.SQQuest = { open: openQuest };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* ---------- the world map selector ----------
   Regions were carved from the painting itself: each realm's territory
   grown outward from a seed until it met its neighbors, coastlines
   respected. Hover lights a realm and names its SAT domain; click walks in. */
(function () {
  var wrap = document.getElementById('worldmap');
  if (!wrap) return;
  var REGIONS = [{"id": "lorewood", "name": "Lorewood", "domain": "Information & Ideas", "polys": [[[21.05, 18.92], [23.33, 20.83], [23.92, 24.02], [29.9, 34.64], [30.02, 42.93], [28.11, 46.33], [15.31, 46.55], [12.44, 50.8], [5.74, 50.8], [1.56, 45.48], [2.51, 42.93], [2.27, 39.96], [4.19, 37.41], [3.35, 35.07], [5.02, 32.94], [4.67, 31.46], [6.58, 27.21], [8.97, 25.5], [10.41, 22.1], [11.72, 21.04], [14.35, 24.02], [16.51, 20.19], [18.9, 21.89]]], "gpolys": [[[21.05, 18.92], [22.01, 18.92], [23.33, 20.83], [24.04, 22.1], [24.04, 22.95], [30.74, 34.86], [30.62, 43.15], [27.99, 47.82], [15.07, 47.82], [12.68, 52.07], [5.98, 52.07], [3.95, 48.03], [3.35, 48.25], [1.56, 45.48], [2.51, 42.93], [2.27, 39.96], [4.19, 37.41], [3.23, 35.71], [3.35, 35.07], [5.02, 32.94], [4.67, 31.46], [6.58, 27.21], [8.97, 25.5], [10.41, 22.1], [11.72, 21.04], [13.4, 22.32], [14.35, 24.02], [16.51, 20.19], [17.82, 20.4], [18.9, 21.89]]]}, {"id": "storyforge", "name": "Story Forge", "domain": "Craft & Structure", "polys": [[[15.07, 46.55], [27.87, 46.76], [27.87, 55.26], [31.94, 62.49], [31.94, 71.84], [31.1, 74.6], [28.71, 77.15], [23.92, 80.55], [23.21, 80.13], [21.53, 82.25], [20.69, 81.62], [19.38, 85.23], [17.58, 87.14], [15.79, 88.2], [14.11, 86.08], [13.16, 89.48], [10.77, 92.03], [8.25, 89.69], [9.93, 84.17], [7.18, 80.55], [6.46, 80.98], [4.31, 77.15], [1.2, 75.03], [2.03, 68.44], [0.72, 65.25], [1.32, 63.76], [1.08, 61.64], [2.87, 57.17], [5.26, 54.62], [5.62, 51.01], [12.68, 50.8]]], "gpolys": [[[15.07, 45.27], [27.87, 45.48], [28.59, 46.76], [28.59, 55.26], [32.66, 62.49], [32.66, 71.84], [32.3, 72.9], [31.7, 72.69], [31.22, 74.39], [29.19, 76.73], [27.51, 77.15], [24.4, 80.13], [23.09, 80.34], [22.49, 81.83], [21.77, 82.25], [20.81, 81.4], [19.62, 83.53], [19.5, 85.02], [17.46, 87.35], [17.22, 86.93], [15.55, 88.2], [14.0, 86.29], [13.52, 87.14], [13.76, 87.57], [13.28, 89.27], [10.53, 92.03], [8.85, 90.75], [8.25, 89.27], [9.93, 85.44], [9.81, 83.95], [8.61, 81.83], [8.01, 82.04], [7.3, 80.77], [6.34, 80.77], [4.43, 77.36], [3.11, 77.15], [2.15, 75.45], [1.91, 75.88], [1.08, 74.81], [1.32, 72.69], [1.79, 71.84], [1.56, 69.71], [2.03, 68.01], [0.6, 65.46], [1.32, 63.34], [1.2, 61.42], [2.39, 59.3], [2.51, 57.81], [5.38, 54.41], [5.14, 53.13], [5.74, 51.65], [5.38, 50.16], [5.62, 49.73], [12.68, 49.52]]]}, {"id": "syntaxcitadel", "name": "Syntax Citadel", "domain": "Conventions", "polys": [[[38.04, 7.01], [39.0, 9.56], [40.91, 10.41], [42.46, 9.35], [42.22, 11.48], [43.06, 13.39], [44.26, 11.26], [45.81, 16.15], [46.89, 15.09], [49.04, 20.62], [49.04, 24.87], [49.52, 25.72], [50.6, 23.8], [51.79, 27.63], [44.62, 28.48], [36.48, 42.93], [30.02, 42.93], [29.9, 34.64], [23.92, 24.02], [23.92, 21.89], [24.64, 23.17], [25.96, 22.1], [27.51, 15.52], [29.31, 14.45], [30.02, 10.63], [31.94, 14.03], [32.3, 9.56], [35.17, 9.56], [35.89, 7.44], [36.84, 8.29]]], "gpolys": [[[38.04, 7.01], [38.52, 7.01], [38.4, 8.08], [39.0, 9.56], [39.23, 9.14], [40.91, 10.41], [41.39, 9.56], [42.46, 9.35], [42.22, 11.48], [43.06, 13.39], [44.26, 11.26], [45.81, 16.15], [46.17, 16.37], [46.89, 15.09], [47.85, 16.79], [47.73, 17.85], [49.04, 20.62], [49.04, 24.87], [49.52, 25.72], [50.6, 23.8], [51.67, 26.99], [51.67, 29.12], [44.74, 29.54], [36.36, 44.42], [30.14, 44.42], [29.31, 42.51], [29.31, 34.86], [23.09, 23.8], [23.09, 22.1], [23.68, 21.47], [24.64, 23.17], [25.48, 22.95], [26.91, 19.55], [26.67, 19.13], [27.51, 15.52], [27.99, 14.67], [28.83, 15.3], [29.31, 14.45], [29.07, 14.03], [30.02, 10.63], [30.38, 10.41], [30.98, 12.75], [31.94, 14.03], [32.42, 13.18], [32.3, 9.56], [33.37, 10.2], [34.45, 9.14], [35.17, 9.56], [35.89, 7.44], [36.84, 8.29]]]}, {"id": "mirrormines", "name": "Mirror Mines", "domain": "Algebra", "polys": [[[44.74, 28.27], [51.44, 28.27], [54.31, 31.67], [54.78, 35.07], [55.98, 32.94], [57.78, 37.41], [61.12, 39.96], [63.28, 44.63], [63.16, 55.47], [49.04, 81.4], [47.37, 79.28], [47.01, 76.51], [46.17, 77.15], [44.62, 74.81], [43.42, 75.24], [38.52, 70.35], [38.04, 71.2], [36.84, 69.93], [34.69, 70.35], [31.94, 72.69], [31.94, 62.49], [27.87, 55.26], [27.87, 46.76], [29.78, 43.36], [36.36, 43.15]]], "gpolys": [[[44.74, 26.99], [51.44, 26.99], [51.79, 28.91], [54.43, 31.88], [54.19, 34.01], [54.67, 34.86], [55.74, 32.94], [56.1, 33.16], [57.89, 37.62], [59.09, 38.04], [60.05, 39.74], [61.0, 39.74], [61.36, 41.66], [62.92, 44.0], [63.4, 44.0], [64.0, 45.48], [64.0, 54.84], [63.64, 55.9], [49.88, 80.77], [49.16, 81.19], [47.25, 79.06], [47.49, 77.79], [46.89, 76.3], [45.93, 77.15], [44.5, 74.6], [43.54, 75.45], [42.34, 73.33], [41.75, 73.54], [40.43, 71.63], [39.95, 72.48], [38.64, 70.56], [37.8, 71.2], [36.6, 69.93], [35.17, 70.78], [34.93, 70.35], [34.09, 71.41], [33.13, 71.41], [32.42, 72.69], [31.22, 72.69], [31.22, 62.49], [27.15, 55.26], [27.15, 46.76], [29.78, 42.08], [36.36, 41.87]]]}, {"id": "inkreef", "name": "Ink Reef", "domain": "Expression of Ideas", "polys": [[[36.12, 71.2], [38.16, 71.84], [39.59, 75.24], [41.15, 75.03], [42.11, 76.73], [41.63, 78.43], [42.34, 79.7], [44.26, 77.15], [45.57, 79.06], [47.61, 85.65], [49.76, 88.63], [49.28, 91.6], [46.65, 94.58], [44.86, 94.79], [43.42, 98.19], [42.34, 98.83], [21.77, 98.83], [21.05, 97.56], [20.1, 98.41], [17.58, 95.22], [17.34, 93.94], [18.18, 92.03], [21.29, 89.05], [21.53, 86.08], [25.6, 80.55], [27.99, 83.95], [29.43, 88.2], [30.26, 88.42], [30.38, 90.33], [29.43, 92.03], [29.9, 93.3], [32.3, 89.9], [33.73, 91.6], [33.13, 95.22], [33.97, 97.13], [35.77, 95.22], [36.24, 94.37], [35.05, 91.39], [37.68, 86.72], [35.65, 85.23], [33.97, 86.5], [34.09, 84.59], [31.22, 80.34], [33.49, 76.73], [34.09, 72.69]]], "gpolys": [[[22.37, 99.47], [21.05, 97.56], [20.1, 98.41], [18.3, 96.49], [17.34, 93.94], [19.26, 90.54], [21.29, 89.05], [21.77, 88.2], [21.53, 86.08], [23.09, 84.59], [25.6, 80.55], [27.99, 83.95], [28.47, 86.5], [29.43, 88.2], [30.26, 88.42], [30.38, 90.33], [29.43, 92.03], [29.9, 93.3], [32.3, 89.9], [33.73, 91.6], [33.85, 93.09], [33.13, 95.22], [33.97, 97.13], [36.24, 94.37], [35.05, 92.24], [35.05, 91.39], [37.68, 86.72], [37.2, 85.87], [36.6, 86.08], [35.65, 85.23], [34.93, 86.5], [33.97, 86.5], [33.61, 85.44], [34.09, 84.59], [32.06, 82.25], [31.22, 80.34], [31.94, 78.21], [33.49, 76.73], [33.37, 74.81], [34.09, 73.54], [34.09, 72.69], [35.65, 72.05], [36.12, 71.2], [38.16, 71.84], [39.59, 75.24], [39.95, 75.45], [40.43, 74.6], [41.15, 75.03], [42.11, 76.73], [41.63, 78.43], [42.34, 79.7], [44.26, 77.15], [46.17, 80.55], [46.17, 82.25], [47.73, 84.59], [47.61, 85.65], [48.56, 86.5], [49.88, 89.27], [49.28, 91.6], [46.65, 94.58], [44.86, 94.79], [43.42, 98.19], [42.11, 99.26]]]}, {"id": "datadocks", "name": "Data Docks", "domain": "Problem-Solving & Data", "polys": [[[63.4, 44.0], [65.55, 46.97], [65.43, 49.73], [66.27, 51.65], [68.66, 50.8], [76.08, 63.97], [83.73, 63.97], [87.32, 57.6], [97.25, 57.81], [97.01, 59.94], [95.57, 59.94], [94.14, 63.34], [95.22, 69.5], [92.46, 72.26], [95.33, 75.66], [95.1, 77.79], [96.29, 82.47], [94.5, 86.08], [91.39, 89.05], [91.75, 96.49], [89.71, 98.83], [80.14, 98.83], [79.07, 98.19], [78.23, 95.43], [74.64, 98.41], [72.25, 96.71], [69.86, 98.41], [64.95, 93.94], [64.23, 96.07], [61.96, 95.43], [59.57, 98.83], [58.13, 96.28], [57.3, 96.92], [56.82, 95.22], [55.74, 96.28], [54.78, 95.43], [55.38, 87.57], [54.55, 86.5], [53.35, 87.78], [51.91, 81.83], [51.08, 82.47], [49.16, 80.77], [63.16, 55.47]]], "gpolys": [[[80.26, 99.47], [78.59, 97.34], [78.83, 96.92], [78.23, 95.43], [74.64, 98.41], [73.33, 98.19], [72.25, 96.71], [69.86, 98.41], [65.19, 93.94], [63.88, 96.28], [63.16, 95.01], [61.96, 95.43], [60.05, 98.83], [59.45, 99.04], [58.13, 96.28], [57.3, 96.92], [56.82, 95.22], [56.46, 95.01], [55.74, 96.28], [54.78, 95.43], [54.9, 90.12], [55.62, 88.84], [54.9, 86.72], [54.55, 86.5], [53.83, 87.78], [53.35, 87.78], [52.63, 85.65], [52.39, 82.68], [51.91, 81.83], [51.08, 82.47], [48.44, 80.34], [62.56, 55.26], [62.56, 44.21], [63.4, 44.0], [65.55, 46.97], [65.43, 49.73], [66.27, 51.65], [66.99, 49.52], [68.78, 49.73], [76.32, 62.7], [83.49, 62.7], [87.56, 56.32], [97.13, 56.32], [97.61, 57.17], [97.01, 58.24], [97.01, 59.94], [95.57, 59.94], [94.26, 62.7], [95.22, 69.5], [93.9, 71.41], [92.94, 71.41], [92.46, 72.26], [95.33, 75.66], [95.1, 77.79], [96.29, 82.47], [94.5, 86.08], [92.7, 87.14], [91.39, 89.05], [91.27, 89.69], [91.75, 90.54], [91.75, 96.49], [89.71, 98.83]]]}, {"id": "infinityisles", "name": "Infinity Isles", "domain": "Advanced Math", "polys": [[[71.05, 5.31], [72.97, 7.01], [73.68, 10.84], [74.16, 11.69], [74.64, 10.84], [76.08, 14.24], [76.2, 16.58], [74.4, 21.89], [73.8, 21.68], [72.49, 24.44], [71.29, 23.17], [70.45, 24.23], [71.41, 27.63], [70.81, 29.97], [69.26, 34.01], [68.18, 33.79], [66.03, 38.47], [63.4, 35.49], [60.29, 27.42], [58.01, 30.61], [54.31, 23.59], [53.59, 18.49], [56.46, 15.94], [55.02, 11.69], [57.18, 7.86], [59.33, 6.59], [62.44, 11.26], [62.56, 12.75], [61.36, 15.73], [63.64, 18.49], [63.76, 20.83], [63.04, 22.1], [63.52, 23.8], [65.31, 24.87], [64.59, 26.57], [65.07, 27.84], [66.39, 27.63], [66.87, 26.78], [65.91, 25.08], [68.06, 22.1], [66.27, 18.49], [66.15, 13.6], [67.34, 12.33], [67.7, 9.56], [68.66, 11.26], [69.26, 8.08]]], "gpolys": [[[71.05, 5.31], [71.89, 5.53], [72.97, 7.01], [73.56, 8.5], [73.68, 10.84], [74.16, 11.69], [74.64, 10.84], [76.08, 14.24], [76.2, 16.58], [75.72, 19.13], [74.4, 21.89], [73.8, 21.68], [72.49, 24.44], [72.01, 24.44], [71.29, 23.17], [70.45, 24.23], [71.41, 27.63], [70.81, 29.97], [69.26, 34.01], [68.18, 33.79], [66.03, 38.47], [65.55, 38.47], [64.47, 36.13], [63.88, 36.34], [63.4, 35.49], [60.29, 27.42], [58.37, 30.82], [58.01, 30.61], [57.78, 29.33], [56.82, 27.63], [55.98, 27.42], [54.31, 23.59], [53.47, 19.98], [53.59, 18.49], [56.46, 15.94], [55.02, 12.96], [55.02, 11.69], [57.18, 7.86], [58.37, 6.59], [59.33, 6.59], [60.05, 7.01], [62.44, 11.26], [62.56, 12.75], [61.36, 15.73], [63.64, 18.49], [63.76, 20.83], [63.04, 22.1], [63.52, 23.8], [64.0, 24.65], [65.31, 24.87], [64.59, 26.57], [65.07, 27.84], [66.39, 27.63], [66.87, 26.78], [65.91, 25.08], [66.99, 24.44], [68.06, 22.1], [66.27, 18.49], [65.91, 16.58], [66.15, 13.6], [67.34, 12.33], [67.7, 9.56], [68.66, 11.26], [69.14, 10.41], [69.26, 8.08]]]}, {"id": "prismpeaks", "name": "Prism Peaks", "domain": "Geometry & Trigonometry", "polys": [[[87.32, 7.44], [87.8, 7.44], [87.56, 14.67], [88.04, 15.52], [88.52, 12.96], [89.0, 13.82], [89.83, 12.33], [91.51, 19.55], [91.03, 22.1], [91.75, 22.95], [92.82, 20.62], [93.3, 21.47], [94.26, 19.77], [96.29, 28.91], [93.3, 30.39], [91.99, 33.16], [92.11, 34.64], [93.78, 35.07], [96.65, 31.67], [97.61, 29.12], [99.4, 43.78], [99.4, 52.28], [98.56, 53.35], [98.56, 56.75], [97.85, 58.02], [87.56, 57.6], [83.49, 63.97], [75.96, 63.76], [68.78, 51.01], [66.63, 50.58], [67.46, 45.27], [69.02, 42.93], [69.62, 38.04], [72.13, 34.86], [73.09, 29.76], [73.56, 29.33], [74.4, 31.24], [76.67, 24.23], [77.75, 24.44], [80.02, 18.28], [79.78, 20.83], [80.62, 21.89], [83.25, 12.96], [83.85, 14.45], [83.37, 15.3], [84.09, 16.15]]], "gpolys": [[[99.76, 52.5], [98.44, 53.56], [98.68, 56.54], [96.65, 58.87], [87.56, 58.87], [83.49, 65.25], [76.32, 65.25], [68.78, 52.28], [66.63, 51.86], [66.63, 50.16], [66.87, 48.03], [67.34, 47.18], [67.34, 45.48], [68.9, 43.15], [69.5, 38.26], [72.01, 35.07], [71.89, 34.01], [72.61, 32.73], [72.49, 31.67], [73.21, 29.54], [73.44, 29.12], [74.52, 31.03], [76.2, 27.21], [76.79, 24.02], [77.03, 23.59], [77.87, 24.23], [80.14, 18.07], [80.26, 19.55], [79.78, 20.4], [80.38, 21.89], [80.74, 21.68], [83.13, 13.18], [83.49, 12.96], [83.49, 15.52], [83.97, 16.37], [86.48, 8.93], [87.56, 7.44], [87.92, 7.65], [87.2, 9.78], [87.68, 13.18], [87.44, 14.45], [88.16, 15.3], [88.64, 14.45], [88.4, 13.18], [89.11, 13.6], [89.71, 12.11], [91.51, 19.98], [91.15, 22.32], [91.63, 23.17], [92.7, 20.83], [93.54, 21.47], [94.38, 19.98], [95.57, 25.5], [95.57, 27.21], [96.17, 28.69], [95.69, 29.97], [94.26, 29.12], [92.7, 31.46], [91.99, 34.43], [92.46, 35.28], [93.9, 34.86], [94.62, 33.58], [95.45, 33.37], [97.73, 29.33], [98.44, 37.41], [99.16, 40.38], [99.16, 42.93], [99.76, 46.12]]]}];
  var svg = wrap.querySelector('.worldmap-svg');
  var tip = document.getElementById('worldmap-tip');
  var tipName = document.getElementById('worldmap-tip-name');
  var tipDomain = document.getElementById('worldmap-tip-domain');
  var NS = 'http://www.w3.org/2000/svg';
  function isVisited(id) {
    try {
      return !!(window.localStorage.getItem('sq_visited_' + id) ||
                window.localStorage.getItem('sq_realm_prog_' + id) ||
                window.localStorage.getItem('sq_boss_' + id));
    } catch (e) { return true; }
  }
  /* unvisited realms are drawn again in gray: the same painting, masked
     to an expanded copy of the region that overlaps its neighbors on land
     only, with a soft blur on the mask so every border feathers instead of
     cutting. Overlapping grays show identical pixels, so seams vanish. */
  var defs = document.createElementNS(NS, 'defs');
  var filt = document.createElementNS(NS, 'filter');
  filt.setAttribute('id', 'wm-desat');
  var cm = document.createElementNS(NS, 'feColorMatrix');
  cm.setAttribute('type', 'saturate'); cm.setAttribute('values', '0.08');
  filt.appendChild(cm);
  var ct = document.createElementNS(NS, 'feComponentTransfer');
  ['feFuncR', 'feFuncG', 'feFuncB'].forEach(function (fn) {
    var f = document.createElementNS(NS, fn);
    f.setAttribute('type', 'linear'); f.setAttribute('slope', '0.72'); f.setAttribute('intercept', '0.04');
    ct.appendChild(f);
  });
  filt.appendChild(ct);
  defs.appendChild(filt);
  var soft = document.createElementNS(NS, 'filter');
  soft.setAttribute('id', 'wm-soften');
  soft.setAttribute('x', '-20%'); soft.setAttribute('y', '-20%');
  soft.setAttribute('width', '140%'); soft.setAttribute('height', '140%');
  var blur = document.createElementNS(NS, 'feGaussianBlur');
  blur.setAttribute('stdDeviation', '0.5');
  soft.appendChild(blur);
  defs.appendChild(soft);
  svg.appendChild(defs);
  REGIONS.forEach(function (R) {
    if (isVisited(R.id)) return;
    var mk = document.createElementNS(NS, 'mask');
    mk.setAttribute('id', 'wm-mk-' + R.id);
    mk.setAttribute('maskUnits', 'userSpaceOnUse');
    mk.setAttribute('x', '0'); mk.setAttribute('y', '0');
    mk.setAttribute('width', '100'); mk.setAttribute('height', '100');
    var gg = document.createElementNS(NS, 'g');
    gg.setAttribute('filter', 'url(#wm-soften)');
    (R.gpolys || R.polys).forEach(function (poly) {
      var p = document.createElementNS(NS, 'polygon');
      p.setAttribute('points', poly.map(function (q) { return q[0] + ',' + q[1]; }).join(' '));
      p.setAttribute('fill', '#fff');
      gg.appendChild(p);
    });
    mk.appendChild(gg);
    defs.appendChild(mk);
    var gimg = document.createElementNS(NS, 'image');
    gimg.setAttribute('href', 'assets/worldmap.webp');
    gimg.setAttribute('x', '0'); gimg.setAttribute('y', '0');
    gimg.setAttribute('width', '100'); gimg.setAttribute('height', '100');
    gimg.setAttribute('preserveAspectRatio', 'none');
    gimg.setAttribute('mask', 'url(#wm-mk-' + R.id + ')');
    gimg.setAttribute('filter', 'url(#wm-desat)');
    gimg.setAttribute('class', 'wm-gray');
    gimg.setAttribute('id', 'wm-gray-' + R.id);
    svg.appendChild(gimg);
  });
  REGIONS.forEach(function (R) {
    if (isVisited(R.id)) return;
    var cp = document.createElementNS(NS, 'clipPath');
    cp.setAttribute('id', 'wm-cp-' + R.id);
    cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
    R.polys.forEach(function (poly) {
      var p = document.createElementNS(NS, 'polygon');
      p.setAttribute('points', poly.map(function (q) { return q[0] + ',' + q[1]; }).join(' '));
      cp.appendChild(p);
    });
    defs.appendChild(cp);
    var gimg = document.createElementNS(NS, 'image');
    gimg.setAttribute('href', 'assets/worldmap.webp');
    gimg.setAttribute('x', '0'); gimg.setAttribute('y', '0');
    gimg.setAttribute('width', '100'); gimg.setAttribute('height', '100');
    gimg.setAttribute('preserveAspectRatio', 'none');
    gimg.setAttribute('clip-path', 'url(#wm-cp-' + R.id + ')');
    gimg.setAttribute('filter', 'url(#wm-desat)');
    gimg.setAttribute('class', 'wm-gray');
    gimg.setAttribute('id', 'wm-gray-' + R.id);
    svg.appendChild(gimg);
    R.polys.forEach(function (poly) {
      var edge = document.createElementNS(NS, 'polygon');
      edge.setAttribute('points', poly.map(function (q) { return q[0] + ',' + q[1]; }).join(' '));
      edge.setAttribute('class', 'wm-gray-edge');
      svg.appendChild(edge);
    });
  });
  REGIONS.forEach(function (R) {
    var a = document.createElementNS(NS, 'a');
    a.setAttribute('href', 'realm.html?realm=' + R.id);
    a.setAttribute('aria-label', R.name + ' \u00B7 ' + R.domain);
    R.polys.forEach(function (poly) {
      var p = document.createElementNS(NS, 'polygon');
      p.setAttribute('points', poly.map(function (q) { return q[0] + ',' + q[1]; }).join(' '));
      a.appendChild(p);
    });
    var grayEl = document.getElementById('wm-gray-' + R.id);
    function show() {
      tipName.textContent = R.name;
      tipDomain.textContent = R.domain;
      tip.hidden = false;
      if (grayEl) grayEl.classList.add('is-peek');
      if (window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
    }
    function hide() {
      tip.hidden = true;
      if (grayEl) grayEl.classList.remove('is-peek');
    }
    a.addEventListener('mouseenter', show);
    a.addEventListener('focus', function () {
      show();
      var r = wrap.getBoundingClientRect(), bb = a.getBBox();
      tip.style.left = Math.min(bb.x / 100 * r.width + 20, r.width - 190) + 'px';
      tip.style.top = Math.max(bb.y / 100 * r.height - 8, 8) + 'px';
    });
    a.addEventListener('mouseleave', hide);
    a.addEventListener('blur', hide);
    a.addEventListener('mousemove', function (e) {
      var r = wrap.getBoundingClientRect();
      tip.style.left = Math.min(e.clientX - r.left + 16, r.width - 190) + 'px';
      tip.style.top = Math.max(e.clientY - r.top - 48, 8) + 'px';
    });
    svg.appendChild(a);
  });
})();
