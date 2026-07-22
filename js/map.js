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
  var REGIONS = [{"id": "lorewood", "name": "Lorewood", "domain": "Information & Ideas", "polys": [[[21.17, 18.6], [22.25, 18.81], [23.56, 20.3], [24.58, 24.44], [30.26, 34.75], [30.44, 42.51], [28.47, 46.65], [27.63, 47.29], [15.67, 47.29], [12.32, 51.54], [5.86, 51.54], [1.32, 46.44], [1.14, 45.48], [1.97, 43.57], [2.09, 39.96], [3.29, 37.83], [3.17, 35.07], [6.58, 26.67], [8.79, 25.08], [10.29, 21.79], [11.36, 20.72], [12.68, 20.94], [14.47, 22.85], [16.51, 20.09], [19.26, 20.72]]]}, {"id": "storyforge", "name": "Story Forge", "domain": "Craft & Structure", "polys": [[[15.43, 46.01], [27.75, 46.23], [28.29, 47.82], [28.41, 55.26], [32.36, 63.12], [32.36, 72.05], [30.5, 76.41], [22.01, 83.0], [20.93, 83.21], [20.28, 85.02], [17.46, 88.1], [16.63, 87.89], [16.39, 88.74], [14.23, 88.31], [10.17, 93.84], [8.91, 92.67], [9.21, 91.71], [8.49, 91.29], [8.07, 89.9], [9.51, 85.23], [8.85, 82.57], [5.14, 81.08], [3.83, 78.32], [0.9, 75.03], [1.5, 68.01], [0.54, 65.89], [0.78, 62.06], [2.45, 57.39], [4.67, 54.94], [5.8, 50.58], [12.32, 50.27]]]}, {"id": "syntaxcitadel", "name": "Syntax Citadel", "domain": "Conventions", "polys": [[[37.74, 0.0], [38.82, 1.91], [38.34, 4.46], [39.06, 6.59], [40.01, 7.23], [40.37, 4.04], [41.27, 3.51], [42.88, 8.71], [42.88, 11.69], [43.54, 12.22], [44.5, 11.37], [46.05, 14.98], [47.49, 15.41], [49.46, 20.83], [49.46, 23.8], [50.96, 23.7], [51.97, 27.84], [51.2, 29.01], [44.86, 29.22], [36.48, 43.68], [30.62, 43.89], [29.72, 42.08], [29.61, 35.07], [23.92, 24.76], [23.62, 22.74], [23.92, 22.0], [25.24, 22.21], [25.78, 21.47], [27.09, 16.15], [28.83, 13.71], [29.9, 10.52], [31.7, 11.58], [31.88, 8.5], [32.72, 7.44], [32.83, 4.68], [33.37, 3.51], [34.15, 4.25], [34.63, 5.95], [35.29, 6.06], [36.18, 3.83], [36.54, 0.21]]]}, {"id": "mirrormines", "name": "Mirror Mines", "domain": "Algebra", "polys": [[[45.1, 27.74], [51.79, 28.16], [54.01, 30.61], [54.84, 32.94], [56.4, 33.16], [57.89, 36.88], [61.42, 39.96], [63.7, 44.85], [63.7, 54.62], [63.34, 56.11], [48.92, 81.51], [48.09, 81.3], [47.61, 79.17], [47.25, 79.81], [46.71, 78.21], [44.74, 76.2], [43.54, 76.2], [40.19, 71.94], [39.47, 72.37], [36.12, 71.09], [32.06, 73.22], [31.64, 71.84], [31.52, 62.7], [27.57, 54.84], [27.57, 47.61], [29.49, 43.36], [30.26, 42.61], [36.36, 42.4]]]}, {"id": "inkreef", "name": "Ink Reef", "domain": "Expression of Ideas", "polys": [[[19.08, 99.68], [16.57, 95.64], [16.81, 93.94], [18.18, 90.86], [20.87, 88.84], [21.35, 86.29], [25.48, 80.45], [28.65, 83.53], [32.78, 77.26], [33.19, 74.6], [34.33, 71.94], [36.12, 70.88], [38.34, 71.63], [39.71, 74.28], [41.63, 75.13], [42.94, 77.9], [44.86, 77.47], [48.21, 85.55], [50.9, 89.69], [50.12, 92.56], [46.53, 95.54], [44.98, 95.75], [43.12, 99.68]]]}, {"id": "datadocks", "name": "Data Docks", "domain": "Problem-Solving & Data", "polys": [[[58.67, 99.68], [57.18, 97.66], [55.62, 99.15], [54.9, 98.3], [54.61, 92.45], [53.29, 90.54], [52.21, 86.5], [52.21, 83.95], [48.86, 80.98], [62.86, 55.26], [63.22, 44.42], [64.0, 44.53], [65.85, 46.76], [66.21, 49.95], [69.2, 51.01], [76.56, 63.44], [83.25, 63.44], [87.8, 57.07], [96.41, 57.07], [97.31, 58.02], [97.31, 60.15], [94.92, 62.7], [94.8, 64.61], [95.63, 69.5], [94.2, 72.48], [95.63, 75.88], [95.63, 78.43], [96.59, 83.1], [95.04, 86.29], [91.93, 89.27], [92.17, 96.07], [90.49, 99.47]]]}, {"id": "infinityisles", "name": "Infinity Isles", "domain": "Advanced Math", "polys": [[[71.29, 4.78], [73.03, 6.38], [74.22, 10.2], [75.48, 11.8], [76.5, 14.24], [76.61, 17.43], [74.82, 21.89], [72.67, 24.87], [71.23, 25.29], [71.71, 27.84], [70.99, 30.82], [69.14, 34.75], [68.06, 35.39], [66.33, 38.68], [65.31, 38.58], [63.58, 36.56], [60.65, 29.01], [59.93, 29.01], [58.79, 30.82], [57.95, 30.82], [53.89, 23.17], [53.29, 18.7], [55.8, 15.52], [54.9, 13.28], [54.96, 11.05], [57.48, 7.01], [59.09, 6.06], [60.59, 7.23], [62.5, 10.63], [62.86, 12.54], [62.14, 15.94], [64.11, 18.81], [64.0, 23.27], [65.85, 24.87], [65.85, 22.74], [67.11, 22.85], [67.4, 22.1], [65.73, 17.43], [65.67, 14.35], [67.64, 9.78], [68.72, 9.56], [69.26, 7.55]]]}, {"id": "prismpeaks", "name": "Prism Peaks", "domain": "Geometry & Trigonometry", "polys": [[[99.88, 53.88], [99.34, 54.2], [98.98, 57.39], [97.61, 58.77], [87.8, 58.34], [83.49, 64.72], [76.56, 64.72], [75.72, 64.08], [69.02, 52.18], [66.87, 51.33], [66.45, 49.95], [67.05, 45.91], [68.48, 42.93], [69.26, 38.36], [71.53, 35.18], [72.97, 29.65], [74.64, 29.65], [76.56, 24.12], [78.23, 22.42], [79.72, 18.28], [81.34, 17.75], [83.37, 12.01], [85.05, 12.01], [86.48, 8.18], [87.92, 6.91], [89.65, 10.2], [91.33, 17.0], [92.94, 15.83], [93.96, 17.0], [95.99, 25.29], [98.03, 29.33], [99.88, 42.19]]]}];
  var svg = wrap.querySelector('.worldmap-svg');
  var NS = 'http://www.w3.org/2000/svg';
  function isVisited(id) {
    try {
      return !!(window.localStorage.getItem('sq_visited_' + id) ||
                window.localStorage.getItem('sq_realm_prog_' + id) ||
                window.localStorage.getItem('sq_boss_' + id));
    } catch (e) { return true; }
  }
  /* the world stays in full color for everyone: progress is planted on the
     land as flags, not painted over it as fog */
  var defs = document.createElementNS(NS, 'defs');
  var vf = document.createElementNS(NS, 'filter');
  vf.setAttribute('id', 'wm-vivid-f');
  var vcm = document.createElementNS(NS, 'feColorMatrix');
  vcm.setAttribute('type', 'saturate'); vcm.setAttribute('values', '1.45');
  vf.appendChild(vcm);
  var vct = document.createElementNS(NS, 'feComponentTransfer');
  ['feFuncR', 'feFuncG', 'feFuncB'].forEach(function (fn) {
    var f = document.createElementNS(NS, fn);
    f.setAttribute('type', 'linear'); f.setAttribute('slope', '1.1'); f.setAttribute('intercept', '0');
    vct.appendChild(f);
  });
  vf.appendChild(vct);
  defs.appendChild(vf);
  svg.appendChild(defs);
  /* every realm gets a vivid layer: its own colors, boosted, for hover */
  REGIONS.forEach(function (R) {
    var mk0 = document.createElementNS(NS, 'mask');
    mk0.setAttribute('id', 'wm-vmk-' + R.id);
    mk0.setAttribute('maskUnits', 'userSpaceOnUse');
    mk0.setAttribute('x', '0'); mk0.setAttribute('y', '0');
    mk0.setAttribute('width', '100'); mk0.setAttribute('height', '100');
    var mi0 = document.createElementNS(NS, 'image');
    mi0.setAttribute('href', 'assets/map-masks/' + R.id + '.png');
    mi0.setAttribute('x', '0'); mi0.setAttribute('y', '0');
    mi0.setAttribute('width', '100'); mi0.setAttribute('height', '100');
    mi0.setAttribute('preserveAspectRatio', 'none');
    mk0.appendChild(mi0);
    defs.appendChild(mk0);
    var vimg = document.createElementNS(NS, 'image');
    vimg.setAttribute('href', 'assets/worldmap.webp');
    vimg.setAttribute('x', '0'); vimg.setAttribute('y', '0');
    vimg.setAttribute('width', '100'); vimg.setAttribute('height', '100');
    vimg.setAttribute('preserveAspectRatio', 'none');
    vimg.setAttribute('mask', 'url(#wm-vmk-' + R.id + ')');
    vimg.setAttribute('filter', 'url(#wm-vivid-f)');
    vimg.setAttribute('class', 'wm-vivid');
    vimg.setAttribute('id', 'wm-vivid-' + R.id);
    svg.appendChild(vimg);
  });
  var LABEL_AT = {
    lorewood: [12.9, 33.0], storyforge: [15.3, 60.7], syntaxcitadel: [36.5, 23.5],
    mirrormines: [44.9, 53.3], inkreef: [35.3, 84.0], datadocks: [65.2, 83.5],
    infinityisles: [61.5, 24.5], prismpeaks: [83.7, 36.5]
  };
  REGIONS.forEach(function (R) {
    var lb = document.createElement('span');
    lb.className = 'worldmap-label';
    var nm = document.createElement('span');
    nm.className = 'worldmap-label-name';
    nm.textContent = R.name;
    lb.appendChild(nm);
    lb.style.left = LABEL_AT[R.id][0] + '%';
    lb.style.top = LABEL_AT[R.id][1] + '%';
    wrap.appendChild(lb);
  });

  /* ---------- deeds planted on the land: a gold flag where a guardian
     fell, a white pennant where Pomelo has wandered ---------- */
  function realmMark(id) {
    try {
      if (window.localStorage.getItem('sq_boss_' + id) === 'cleared') return 'cleared';
      if (isVisited(id)) return 'visited';
    } catch (e) {}
    return null;
  }
  function flagSvg(gold) {
    var ink = '#16112B', pole = '#5a4226',
        cloth = gold ? '#f2b63c' : '#f0ead6', trim = gold ? '#c77b2a' : '#9aa7c4';
    return '<svg width="26" height="34" viewBox="0 0 13 17" aria-hidden="true">' +
      '<rect x="1" y="0" width="3" height="17" fill="' + ink + '"/>' +
      '<rect x="2" y="1" width="1" height="15" fill="' + pole + '"/>' +
      '<rect x="4" y="0" width="9" height="8" fill="' + ink + '"/>' +
      '<rect x="4" y="1" width="7" height="2" fill="' + cloth + '"/>' +
      '<rect x="11" y="1" width="1" height="1" fill="' + cloth + '"/>' +
      '<rect x="4" y="3" width="8" height="2" fill="' + cloth + '"/>' +
      '<rect x="4" y="5" width="5" height="1" fill="' + cloth + '"/>' +
      '<rect x="4" y="6" width="3" height="1" fill="' + trim + '"/>' +
      '</svg>';
  }
  function plantFlags() {
    wrap.querySelectorAll('.wm-flag').forEach(function (f) { f.remove(); });
    REGIONS.forEach(function (R) {
      var mark = realmMark(R.id);
      if (!mark) return;
      var f = document.createElement('span');
      f.className = 'wm-flag ' + (mark === 'cleared' ? 'is-cleared' : 'is-visited');
      f.innerHTML = flagSvg(mark === 'cleared');
      f.style.left = LABEL_AT[R.id][0] + '%';
      f.style.top = (LABEL_AT[R.id][1] - 3.2) + '%';
      f.title = mark === 'cleared' ? R.name + ': guardian felled' : R.name + ': visited';
      wrap.appendChild(f);
    });
  }
  plantFlags();
  document.addEventListener('sq:progress-synced', plantFlags);
  /* ---------- the realm dock: the strip below the map answers the cursor
     with the realm's discipline and standing; the painting stays quiet ---------- */
  var QUEST_ID = {
    lorewood: 'info', storyforge: 'craft', syntaxcitadel: 'conventions',
    inkreef: 'expression', mirrormines: 'algebra', infinityisles: 'advmath',
    datadocks: 'data', prismpeaks: 'geometry'
  };
  var dock = document.getElementById('worldmap-dock');
  var dockHint = dock && dock.querySelector('.wm-dock-hint');
  var dockInfo = dock && dock.querySelector('.wm-dock-info');
  function dockShow(R) {
    if (!dock) return;
    dockInfo.querySelector('.wm-dock-name').textContent = R.name;
    dockInfo.querySelector('.wm-dock-domain').textContent = R.domain;
    var lvEl = dockInfo.querySelector('.wm-dock-level');
    var barEl = dockInfo.querySelector('.wm-dock-bar');
    var st = window.SQGame && window.SQGame.realmState && window.SQGame.realmState(QUEST_ID[R.id]);
    if (st) {
      lvEl.hidden = false; barEl.hidden = false;
      lvEl.textContent = 'Lv ' + st.level;
      dockInfo.querySelector('.wm-dock-fill').style.width = (st.cleared ? 100 : st.pct) + '%';
    } else { lvEl.hidden = true; barEl.hidden = true; }
    dockInfo.querySelector('.wm-dock-enter').textContent =
      realmMark(R.id) === 'cleared' ? '\u2605 Guardian felled \u00B7 walk in anytime' : 'Click to walk in \u2192';
    dockHint.hidden = true;
    dockInfo.hidden = false;
  }
  function dockHide() {
    if (!dock) return;
    dockInfo.hidden = true;
    dockHint.hidden = false;
  }
  REGIONS.forEach(function (R) {
    var a = document.createElementNS(NS, 'a');
    a.setAttribute('href', 'realm.html?realm=' + R.id);
    a.setAttribute('aria-label', R.name + ' \u00B7 ' + R.domain);
    R.polys.forEach(function (poly) {
      var p = document.createElementNS(NS, 'polygon');
      p.setAttribute('points', poly.map(function (q) { return q[0] + ',' + q[1]; }).join(' '));
      a.appendChild(p);
    });
    var vividEl = document.getElementById('wm-vivid-' + R.id);
    function show() {
      if (vividEl) vividEl.classList.add('is-on');
      dockShow(R);
      if (window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
    }
    function hide() {
      if (vividEl) vividEl.classList.remove('is-on');
      dockHide();
    }
    a.addEventListener('mouseenter', show);
    a.addEventListener('focus', show);
    a.addEventListener('mouseleave', hide);
    a.addEventListener('blur', hide);
    svg.appendChild(a);
  });

  /* ---------- the living layer: pixel clouds adrift, sparks on the sea,
     and Pomelo standing wherever he last wandered ---------- */
  var reduceMap = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sky = document.createElement('canvas');
  sky.className = 'worldmap-sky';
  sky.id = 'worldmap-sky';
  sky.setAttribute('aria-hidden', 'true');
  wrap.appendChild(sky);
  var skyCtx = sky.getContext('2d');
  /* clouds hold the upper air; sparks keep to the open water */
  var CLOUDS = [
    { x: 8, y: 7, s: 1.15, v: 0.55, a: 0.34 }, { x: 34, y: 3, s: 0.8, v: 0.8, a: 0.26 },
    { x: 58, y: 10, s: 1.3, v: 0.42, a: 0.3 }, { x: 79, y: 5, s: 0.9, v: 0.68, a: 0.24 },
    { x: 20, y: 15, s: 0.7, v: 0.95, a: 0.2 }, { x: 90, y: 14, s: 1.0, v: 0.5, a: 0.28 }
  ];
  var SPARKS = [
    [3, 55], [6, 76], [12, 93], [30, 95], [48, 90], [70, 96],
    [94, 78], [96, 47], [88, 27], [50, 30], [2, 24], [72, 42]
  ];
  window.__SQ_MAP_TICKS = 0;
  function drawSky(t) {
    var w = sky.width, h = sky.height;
    if (!w || !h) return;
    skyCtx.clearRect(0, 0, w, h);
    var u = Math.max(2, Math.round(w / 220));       // one cloud pixel, scaled to the sea
    CLOUDS.forEach(function (c, i) {
      var cx = ((c.x + t * c.v) % 116 - 8) / 100 * w;
      var cy = c.y / 100 * h + Math.sin(t * 0.35 + i) * u * 0.6;
      var s = c.s * u;
      skyCtx.globalAlpha = c.a;
      skyCtx.fillStyle = '#eef3ff';
      [[0, 0, 9, 2], [2, -2, 6, 2], [1, 2, 7, 1], [-2, 1, 4, 1], [8, 1, 3, 1]].forEach(function (b) {
        skyCtx.fillRect(Math.round(cx + b[0] * s), Math.round(cy + b[1] * s),
          Math.round(b[2] * s), Math.round(b[3] * s));
      });
    });
    skyCtx.globalAlpha = 1;
    SPARKS.forEach(function (p, i) {
      var tw = (Math.sin(t * 1.7 + i * 2.1) + 1) / 2;   // each spark breathes on its own beat
      if (tw < 0.55) return;
      skyCtx.globalAlpha = (tw - 0.55) * 1.6;
      skyCtx.fillStyle = '#dff1ff';
      var px = Math.round(p[0] / 100 * sky.width), py = Math.round(p[1] / 100 * sky.height);
      skyCtx.fillRect(px - u, py, u * 3, u);
      skyCtx.fillRect(px, py - u, u, u * 3);
    });
    skyCtx.globalAlpha = 1;
  }
  function sizeSky() {
    var r = wrap.getBoundingClientRect();
    if (!r.width) return;
    sky.width = Math.round(r.width);
    sky.height = Math.round(r.height);
  }
  sizeSky();
  window.addEventListener('resize', function () { sizeSky(); if (reduceMap) drawSky(2); });
  if (reduceMap) { drawSky(2); }
  else {
    var skyStart = null;
    (function skyTick(now) {
      if (skyStart === null) skyStart = now;
      if (!sky.width) sizeSky();
      drawSky((now - skyStart) / 1000);
      window.__SQ_MAP_TICKS += 1;
      requestAnimationFrame(skyTick);
    })(0);
  }

  /* Pomelo waits where he last wandered (the first realm, before any journey).
     companion.js loads after this file, so the companion is placed on load. */
  function placePomelo() {
    if (!window.SQCompanion || document.getElementById('worldmap-pomelo')) return;
    var at = null;
    try { at = window.localStorage.getItem('sq_last_realm'); } catch (e) {}
    if (!LABEL_AT[at]) at = 'lorewood';
    var pom = document.createElement('canvas');
    pom.className = 'worldmap-pomelo';
    pom.id = 'worldmap-pomelo';
    pom.width = window.SQCompanion.w;
    pom.height = window.SQCompanion.h;
    pom.style.width = '40px';
    pom.style.height = Math.round(40 * window.SQCompanion.h / window.SQCompanion.w) + 'px';
    pom.style.left = LABEL_AT[at][0] + '%';
    pom.style.top = (LABEL_AT[at][1] + 3.4) + '%';
    pom.setAttribute('aria-label', 'Pomelo, waiting at ' + at);
    wrap.appendChild(pom);
    var pctx = pom.getContext('2d');
    window.SQCompanion.draw(pctx, 0);
    if (!reduceMap) {
      setInterval(function () {            // a slow blink, nothing more
        window.SQCompanion.draw(pctx, 3);
        setTimeout(function () { window.SQCompanion.draw(pctx, 0); }, 260);
      }, 4600);
    }
  }
  if (window.SQCompanion) placePomelo();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', placePomelo);
  else window.addEventListener('load', placePomelo);
})();
