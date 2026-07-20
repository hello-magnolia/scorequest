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
  var REGIONS = [{"id": "lorewood", "name": "Lorewood", "domain": "Information & Ideas", "polys": [[[21.05, 18.92], [23.21, 20.19], [23.92, 24.02], [29.9, 34.64], [30.02, 42.93], [28.11, 46.33], [15.31, 46.55], [12.44, 50.8], [5.26, 50.8], [1.67, 46.12], [2.51, 42.93], [2.27, 39.96], [3.83, 37.62], [3.35, 35.07], [6.58, 27.21], [8.97, 25.5], [11.24, 21.04], [12.2, 21.04], [14.35, 24.02], [16.51, 20.19], [18.9, 21.89]]], "gpolys": [[[21.05, 18.92], [22.01, 18.92], [23.21, 20.19], [24.28, 22.53], [24.04, 22.95], [30.74, 34.86], [30.62, 43.15], [27.99, 47.82], [15.07, 47.82], [12.68, 52.07], [5.98, 52.07], [3.59, 47.82], [3.35, 48.25], [1.67, 46.12], [1.67, 44.85], [2.51, 42.93], [2.27, 39.96], [3.83, 37.62], [3.35, 35.07], [4.43, 33.58], [4.67, 31.46], [6.58, 27.21], [7.42, 26.14], [8.97, 25.5], [9.69, 24.23], [9.69, 23.38], [11.24, 21.04], [12.2, 21.04], [14.35, 24.02], [16.51, 20.19], [17.82, 20.4], [18.9, 21.89]]]}, {"id": "storyforge", "name": "Story Forge", "domain": "Craft & Structure", "polys": [[[15.07, 46.55], [27.87, 46.76], [27.87, 55.26], [31.94, 62.49], [31.94, 71.84], [30.38, 75.88], [25.36, 78.85], [21.77, 82.68], [20.81, 81.83], [19.5, 83.74], [19.26, 85.87], [17.34, 87.57], [15.67, 88.42], [14.11, 86.08], [13.16, 89.48], [10.53, 92.45], [8.25, 89.69], [9.81, 84.38], [8.37, 81.83], [6.46, 80.98], [4.31, 77.15], [3.83, 78.0], [1.08, 75.24], [2.03, 68.44], [0.6, 65.89], [1.32, 63.76], [1.08, 61.64], [2.87, 57.17], [5.26, 54.62], [5.62, 51.01], [12.68, 50.8]]], "gpolys": [[[15.07, 45.27], [27.87, 45.48], [28.59, 46.76], [28.59, 55.26], [32.66, 62.49], [32.66, 71.84], [32.3, 72.9], [31.7, 72.69], [30.5, 75.66], [29.67, 75.88], [28.59, 77.36], [27.99, 77.15], [26.56, 78.85], [25.6, 78.85], [24.16, 80.55], [23.21, 80.55], [21.89, 82.47], [20.69, 82.04], [19.62, 83.53], [19.14, 86.08], [17.94, 86.5], [17.22, 87.78], [16.27, 87.78], [15.79, 88.63], [14.0, 86.29], [13.52, 87.14], [13.76, 87.57], [13.28, 89.27], [10.77, 92.45], [9.57, 92.03], [8.25, 90.12], [8.37, 88.63], [9.93, 85.44], [9.93, 84.59], [8.49, 82.04], [7.89, 82.25], [6.94, 80.55], [6.34, 80.77], [4.43, 77.36], [3.71, 77.79], [1.2, 75.45], [1.08, 73.96], [1.79, 71.84], [1.56, 69.71], [1.91, 68.23], [0.6, 65.46], [1.2, 63.97], [1.2, 61.42], [2.39, 59.3], [2.51, 57.81], [5.38, 54.41], [5.14, 53.13], [5.74, 51.22], [5.14, 50.58], [5.62, 49.73], [12.68, 49.52]]]}, {"id": "syntaxcitadel", "name": "Syntax Citadel", "domain": "Conventions", "polys": [[[38.04, 5.31], [39.0, 9.56], [41.15, 9.99], [42.58, 8.29], [42.46, 11.9], [43.18, 13.18], [44.26, 11.26], [45.81, 16.15], [47.25, 15.3], [49.04, 20.62], [48.92, 24.23], [49.64, 25.08], [50.72, 23.59], [51.67, 28.27], [44.62, 28.48], [36.48, 42.93], [30.02, 42.93], [29.9, 34.64], [23.92, 24.02], [23.92, 21.89], [24.64, 23.17], [25.96, 22.1], [26.91, 17.0], [27.99, 14.67], [28.83, 15.3], [29.31, 14.45], [30.02, 10.63], [31.7, 13.6], [32.3, 9.56], [34.45, 9.14], [35.89, 7.44], [37.08, 7.86]]], "gpolys": [[[38.04, 5.31], [38.52, 8.71], [39.0, 9.56], [39.23, 9.14], [41.15, 9.99], [42.58, 8.29], [42.46, 11.9], [43.18, 13.18], [44.26, 11.26], [44.62, 11.48], [45.81, 16.15], [47.25, 15.3], [49.04, 20.62], [48.92, 24.23], [49.64, 25.08], [50.24, 23.59], [50.72, 23.59], [51.67, 26.99], [51.67, 28.69], [52.03, 28.91], [51.44, 29.54], [44.74, 29.54], [36.36, 44.42], [30.14, 44.42], [29.31, 42.51], [29.31, 34.86], [23.09, 23.8], [23.09, 22.1], [23.8, 21.25], [24.64, 23.17], [25.48, 22.95], [26.67, 19.98], [26.91, 17.0], [27.99, 14.67], [28.83, 15.3], [29.31, 14.45], [29.07, 14.03], [30.02, 10.63], [30.38, 10.41], [30.98, 12.75], [31.7, 13.6], [32.18, 12.75], [32.3, 9.56], [32.89, 9.78], [33.73, 8.71], [34.45, 9.14], [35.89, 7.44], [37.08, 7.86]]]}, {"id": "mirrormines", "name": "Mirror Mines", "domain": "Algebra", "polys": [[[44.74, 28.27], [51.44, 28.27], [54.43, 31.46], [54.19, 33.58], [54.78, 35.07], [55.98, 32.94], [57.66, 37.62], [61.12, 39.96], [63.28, 44.63], [63.16, 55.47], [48.8, 81.83], [47.13, 78.85], [46.89, 76.73], [45.69, 77.15], [44.5, 75.03], [43.54, 75.88], [40.67, 71.63], [39.83, 72.26], [36.36, 69.93], [31.94, 72.69], [31.94, 62.49], [27.87, 55.26], [27.87, 46.76], [29.78, 43.36], [36.36, 43.15]]], "gpolys": [[[44.74, 26.99], [51.44, 26.99], [51.79, 28.06], [51.56, 28.48], [54.31, 31.24], [54.19, 34.01], [54.67, 34.86], [55.74, 32.94], [56.1, 33.16], [56.82, 36.13], [57.54, 37.41], [59.09, 38.04], [60.05, 39.74], [61.0, 39.74], [61.36, 41.66], [62.92, 44.0], [63.4, 44.0], [64.0, 46.33], [64.0, 54.84], [63.4, 56.32], [49.04, 81.83], [47.85, 80.55], [47.01, 78.64], [47.49, 77.79], [47.01, 76.94], [45.57, 76.94], [44.26, 75.03], [43.78, 75.88], [43.42, 75.66], [42.34, 73.33], [41.75, 73.54], [40.79, 71.84], [39.95, 72.48], [38.52, 70.78], [37.32, 71.2], [36.24, 70.14], [35.41, 71.2], [34.93, 70.35], [34.45, 71.2], [31.46, 73.11], [31.22, 62.49], [27.15, 55.26], [27.15, 46.76], [29.78, 42.08], [36.36, 41.87]]]}, {"id": "inkreef", "name": "Ink Reef", "domain": "Expression of Ideas", "polys": [[[36.12, 71.2], [38.16, 71.84], [39.59, 75.24], [41.15, 75.03], [42.11, 76.73], [41.75, 78.21], [42.22, 79.06], [44.26, 77.15], [45.57, 79.06], [46.29, 81.19], [45.93, 82.68], [49.64, 87.99], [50.12, 89.69], [49.4, 91.82], [46.77, 94.79], [44.5, 95.01], [42.82, 98.83], [21.77, 98.83], [21.05, 97.56], [20.33, 98.83], [17.11, 94.37], [18.9, 90.75], [21.29, 89.05], [21.77, 88.2], [21.41, 86.72], [25.6, 80.55], [27.99, 83.95], [31.1, 91.18], [32.3, 89.9], [33.73, 91.6], [34.21, 93.73], [33.13, 95.22], [33.97, 97.13], [35.77, 95.22], [36.24, 94.37], [35.05, 91.39], [37.68, 86.72], [35.65, 85.23], [34.21, 86.93], [33.61, 86.29], [33.73, 84.38], [31.22, 80.34], [33.49, 76.73], [34.09, 72.69]]], "gpolys": [[[22.37, 99.47], [21.05, 97.56], [20.33, 98.83], [19.98, 98.62], [17.11, 94.37], [18.9, 90.75], [21.29, 89.05], [21.77, 88.2], [21.41, 86.72], [25.6, 80.55], [27.99, 83.95], [28.23, 85.23], [30.26, 88.42], [31.1, 91.18], [32.3, 89.9], [33.25, 91.6], [33.73, 91.6], [34.21, 93.73], [33.13, 95.22], [33.97, 97.13], [36.24, 94.37], [35.17, 92.88], [35.05, 91.39], [37.68, 86.72], [37.2, 85.87], [36.6, 86.08], [35.65, 85.23], [34.69, 86.93], [34.21, 86.93], [33.61, 86.29], [33.73, 84.38], [31.22, 80.34], [32.06, 78.43], [33.49, 76.73], [33.37, 74.81], [34.09, 73.54], [34.09, 72.69], [34.93, 71.63], [35.65, 72.05], [36.12, 71.2], [38.16, 71.84], [39.59, 75.24], [39.95, 75.45], [40.43, 74.6], [41.15, 75.03], [42.11, 76.73], [42.22, 77.36], [41.75, 78.21], [42.22, 79.06], [43.54, 78.43], [44.26, 77.15], [46.17, 80.55], [45.93, 82.68], [47.49, 84.17], [47.61, 85.65], [49.64, 87.99], [50.12, 89.69], [49.4, 91.82], [47.37, 93.3], [46.77, 94.79], [44.5, 95.01], [44.02, 95.86], [44.14, 96.92], [42.11, 99.26]]]}, {"id": "datadocks", "name": "Data Docks", "domain": "Problem-Solving & Data", "polys": [[[63.4, 44.0], [65.55, 46.97], [65.43, 49.73], [66.27, 51.65], [68.66, 50.8], [76.08, 63.97], [83.73, 63.97], [87.32, 57.6], [97.01, 58.24], [97.01, 59.94], [95.69, 60.15], [94.14, 63.34], [95.33, 69.71], [93.54, 72.48], [95.33, 75.66], [95.1, 78.64], [96.29, 83.32], [94.62, 86.29], [91.15, 89.48], [91.75, 91.39], [91.63, 97.13], [90.19, 98.83], [79.19, 98.83], [77.99, 95.86], [75.84, 97.13], [75.24, 98.62], [73.44, 98.83], [71.77, 96.71], [70.1, 98.83], [65.07, 94.16], [64.23, 96.07], [64.47, 98.19], [63.64, 98.41], [61.96, 96.28], [60.41, 98.62], [59.09, 98.83], [58.01, 96.49], [57.18, 97.13], [56.82, 95.22], [54.9, 96.07], [54.9, 91.82], [54.31, 90.33], [53.59, 90.75], [52.51, 83.32], [48.92, 81.19], [63.16, 55.47]]], "gpolys": [[[80.26, 99.47], [79.19, 98.83], [77.99, 95.86], [77.15, 96.92], [76.08, 97.56], [75.84, 97.13], [75.24, 98.62], [73.44, 98.83], [71.77, 96.71], [70.1, 98.83], [68.66, 97.13], [67.94, 97.56], [65.07, 94.16], [64.23, 96.07], [64.47, 98.19], [63.64, 98.41], [63.04, 96.92], [61.96, 96.28], [60.41, 98.62], [59.33, 99.26], [58.01, 96.49], [57.18, 97.13], [57.3, 96.07], [56.82, 95.22], [56.46, 95.01], [55.74, 96.28], [54.9, 96.07], [54.78, 91.18], [54.31, 90.33], [53.59, 90.75], [53.23, 88.84], [53.47, 88.42], [52.75, 87.14], [52.75, 84.59], [52.03, 82.47], [51.44, 82.68], [49.76, 81.4], [48.68, 81.62], [48.44, 80.34], [62.56, 55.26], [62.56, 44.21], [63.4, 44.0], [65.55, 46.97], [65.43, 49.73], [66.27, 51.65], [66.99, 49.52], [68.78, 49.73], [76.32, 62.7], [83.49, 62.7], [87.56, 56.32], [96.65, 56.32], [97.13, 57.17], [97.01, 59.94], [95.93, 60.57], [95.69, 60.15], [94.14, 63.34], [95.33, 69.71], [93.54, 72.48], [95.33, 75.66], [95.1, 78.64], [96.29, 83.32], [94.62, 86.29], [92.11, 87.78], [91.15, 89.48], [91.75, 91.39], [91.63, 97.13], [89.47, 99.26], [89.23, 98.83]]]}, {"id": "infinityisles", "name": "Infinity Isles", "domain": "Advanced Math", "polys": [[[71.77, 4.89], [73.68, 8.29], [73.92, 10.41], [75.0, 11.05], [76.44, 16.15], [74.4, 21.89], [72.49, 24.44], [71.29, 23.17], [70.81, 24.02], [71.41, 28.48], [69.26, 34.01], [68.06, 34.43], [66.03, 38.47], [64.47, 36.13], [63.52, 36.13], [60.29, 27.42], [58.73, 30.61], [58.01, 30.61], [53.95, 22.53], [53.59, 18.49], [56.46, 15.94], [54.9, 11.48], [57.18, 7.86], [59.33, 6.59], [62.44, 11.26], [62.32, 14.03], [61.36, 15.73], [63.64, 18.49], [63.4, 23.17], [64.11, 24.44], [65.55, 21.89], [67.22, 24.02], [68.06, 22.1], [66.39, 19.13], [65.67, 14.45], [67.34, 12.33], [67.7, 9.56], [68.78, 10.63], [69.26, 8.08]]], "gpolys": [[[71.77, 4.89], [73.68, 8.29], [73.92, 10.41], [74.4, 11.26], [75.0, 11.05], [75.0, 11.9], [76.32, 14.67], [76.44, 16.15], [75.72, 19.13], [74.4, 21.89], [73.92, 21.89], [72.49, 24.44], [72.01, 24.44], [71.29, 23.17], [70.81, 24.02], [70.69, 25.5], [71.41, 26.78], [71.41, 28.48], [69.26, 34.01], [68.06, 34.43], [66.03, 38.47], [65.55, 38.47], [64.47, 36.13], [63.52, 36.13], [60.29, 27.42], [58.73, 30.61], [58.01, 30.61], [56.82, 27.63], [55.98, 27.42], [53.95, 22.53], [53.47, 20.83], [53.59, 18.49], [56.46, 15.94], [55.02, 12.96], [54.9, 11.48], [57.18, 7.86], [58.37, 6.59], [59.33, 6.59], [60.05, 7.01], [62.44, 11.26], [62.32, 14.03], [61.36, 15.73], [63.64, 18.49], [63.4, 23.17], [64.11, 24.44], [65.55, 21.89], [67.22, 24.02], [68.06, 22.1], [66.39, 19.13], [65.67, 16.15], [65.67, 14.45], [67.34, 12.33], [67.7, 9.56], [68.78, 10.63], [69.26, 9.78], [69.26, 8.08]]]}, {"id": "prismpeaks", "name": "Prism Peaks", "domain": "Geometry & Trigonometry", "polys": [[[87.08, 7.44], [88.04, 7.44], [87.2, 9.78], [87.44, 13.6], [88.4, 16.15], [89.23, 15.52], [89.71, 12.11], [91.99, 21.68], [94.5, 19.77], [96.29, 29.33], [93.54, 30.39], [92.11, 34.22], [92.58, 35.07], [94.14, 34.43], [94.38, 33.16], [95.45, 33.37], [97.61, 28.69], [99.4, 43.36], [99.4, 52.71], [98.44, 54.41], [98.92, 56.96], [97.85, 58.45], [97.37, 57.6], [87.32, 57.6], [83.73, 63.97], [76.08, 63.97], [68.66, 50.8], [66.75, 50.8], [67.34, 45.48], [69.02, 42.51], [69.26, 38.68], [72.01, 35.07], [73.21, 29.54], [74.76, 31.46], [76.08, 26.14], [77.03, 23.59], [78.23, 23.17], [79.9, 17.64], [80.98, 19.55], [83.49, 12.11], [84.09, 12.75], [83.49, 15.09], [83.97, 16.37]]], "gpolys": [[[99.76, 52.5], [98.56, 53.77], [98.92, 56.96], [98.44, 56.96], [97.85, 58.45], [97.37, 57.6], [96.65, 58.87], [87.56, 58.87], [83.49, 65.25], [76.32, 65.25], [68.78, 52.28], [66.39, 51.43], [67.34, 45.48], [69.02, 42.51], [69.5, 39.11], [69.26, 38.68], [72.01, 35.07], [71.89, 34.01], [72.61, 32.73], [72.37, 31.46], [73.21, 29.54], [73.44, 29.12], [74.76, 31.46], [75.24, 30.61], [75.0, 29.33], [76.2, 27.21], [76.08, 26.14], [77.03, 23.59], [77.75, 24.02], [78.23, 23.17], [79.9, 17.64], [80.98, 19.55], [81.7, 18.28], [83.49, 12.11], [83.97, 12.11], [84.09, 12.75], [83.49, 15.09], [83.97, 16.37], [86.6, 8.29], [87.08, 7.44], [88.04, 7.44], [87.2, 9.78], [87.44, 13.6], [87.92, 15.3], [88.76, 16.37], [89.23, 15.52], [89.71, 12.11], [91.75, 20.4], [91.51, 20.83], [91.99, 21.68], [93.54, 19.77], [94.5, 19.77], [96.29, 29.33], [95.45, 30.39], [94.38, 29.76], [93.54, 30.39], [91.99, 33.58], [92.11, 34.22], [92.58, 35.07], [94.14, 34.43], [94.62, 33.58], [94.38, 33.16], [95.45, 33.37], [96.17, 31.24], [96.41, 31.67], [97.25, 30.61], [97.61, 28.69], [99.76, 46.12]]]}];
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
