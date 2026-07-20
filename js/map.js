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
  var REGIONS = [{"id": "lorewood", "name": "Lorewood", "domain": "Information & Ideas", "polys": [[[21.53, 18.38], [23.86, 20.62], [24.58, 24.44], [30.26, 34.75], [30.44, 42.51], [28.47, 46.65], [27.63, 47.29], [15.67, 47.29], [12.32, 51.54], [5.62, 51.54], [1.2, 46.23], [1.97, 43.15], [1.97, 40.17], [3.17, 37.62], [3.05, 35.28], [6.7, 26.46], [9.09, 24.34], [10.53, 21.36], [11.72, 20.51], [14.59, 22.64], [16.27, 20.09], [17.46, 19.66], [19.02, 20.72]], [[5.26, 20.51], [8.01, 22.85], [8.19, 24.23], [7.54, 24.76], [4.19, 23.91], [4.01, 22.1]]]}, {"id": "storyforge", "name": "Story Forge", "domain": "Craft & Structure", "polys": [[[15.43, 46.01], [27.75, 46.23], [28.29, 47.82], [28.41, 55.26], [32.36, 63.12], [32.36, 72.05], [30.5, 76.41], [21.05, 83.42], [19.26, 86.61], [16.75, 88.95], [14.23, 89.16], [10.17, 93.84], [8.25, 92.56], [7.54, 90.86], [9.39, 84.59], [7.54, 82.36], [5.38, 81.51], [3.89, 78.64], [1.02, 75.66], [0.78, 73.54], [1.26, 71.84], [1.26, 68.86], [0.3, 65.04], [0.84, 61.74], [2.21, 57.81], [4.72, 54.62], [5.8, 50.58], [12.32, 50.27]]]}, {"id": "syntaxcitadel", "name": "Syntax Citadel", "domain": "Conventions", "polys": [[[37.74, 0.0], [38.82, 1.91], [38.34, 4.46], [39.35, 6.91], [39.95, 6.27], [40.37, 4.04], [41.27, 3.51], [42.88, 8.29], [43.0, 11.48], [43.42, 12.01], [44.62, 11.16], [46.17, 14.77], [47.13, 14.77], [47.91, 15.94], [49.46, 20.83], [49.58, 23.17], [51.14, 23.8], [52.09, 28.06], [51.2, 29.01], [44.86, 29.22], [36.48, 43.68], [30.62, 43.89], [29.72, 42.08], [29.61, 35.07], [23.92, 24.76], [23.62, 22.74], [23.92, 22.0], [25.66, 21.68], [27.03, 16.05], [28.71, 13.92], [30.02, 10.31], [31.76, 11.26], [31.88, 8.08], [33.37, 3.51], [34.15, 4.25], [34.63, 5.95], [35.29, 6.06], [36.18, 3.83], [36.54, 0.21]]]}, {"id": "mirrormines", "name": "Mirror Mines", "domain": "Algebra", "polys": [[[45.1, 27.74], [51.32, 27.74], [52.15, 28.37], [54.49, 31.03], [55.08, 32.94], [56.28, 32.94], [57.89, 36.88], [61.36, 39.64], [63.7, 44.85], [63.7, 54.62], [63.34, 56.11], [48.92, 81.93], [47.61, 80.87], [46.53, 78.11], [44.5, 76.2], [43.54, 76.2], [40.91, 73.22], [38.52, 71.94], [36.0, 71.31], [32.0, 73.33], [31.64, 72.26], [31.52, 62.7], [27.57, 54.84], [27.57, 47.61], [29.49, 43.36], [30.26, 42.61], [36.36, 42.4]]]}, {"id": "inkreef", "name": "Ink Reef", "domain": "Expression of Ideas", "polys": [[[19.08, 99.68], [16.45, 95.43], [16.57, 93.52], [17.94, 90.86], [20.81, 88.31], [21.35, 86.29], [25.12, 80.66], [26.32, 80.66], [28.11, 83.42], [28.77, 83.32], [32.95, 76.73], [33.19, 74.6], [34.57, 71.52], [35.89, 70.88], [38.22, 71.41], [39.59, 74.07], [41.51, 74.92], [42.82, 77.68], [44.86, 77.47], [46.59, 80.77], [46.89, 82.78], [50.9, 89.69], [50.12, 92.56], [46.77, 95.54], [44.86, 95.96], [43.3, 99.57]]]}, {"id": "datadocks", "name": "Data Docks", "domain": "Problem-Solving & Data", "polys": [[[58.19, 99.68], [57.78, 98.3], [57.06, 97.87], [55.74, 99.36], [54.78, 98.09], [54.37, 95.43], [54.61, 92.88], [53.29, 90.54], [52.21, 86.5], [52.15, 84.06], [50.6, 83.42], [48.74, 81.19], [62.86, 55.26], [63.28, 44.1], [65.85, 46.76], [66.21, 49.95], [69.2, 51.01], [76.56, 63.44], [83.25, 63.44], [87.8, 57.07], [96.41, 57.07], [97.43, 58.24], [97.25, 60.47], [95.04, 62.91], [94.92, 64.82], [95.75, 69.29], [94.2, 72.9], [95.57, 75.56], [95.63, 78.43], [96.59, 83.1], [94.68, 86.93], [93.36, 87.99], [92.46, 89.8], [92.17, 96.49], [91.93, 97.77], [90.61, 99.68]]]}, {"id": "infinityisles", "name": "Infinity Isles", "domain": "Advanced Math", "polys": [[[71.53, 4.57], [73.8, 7.76], [76.2, 13.28], [76.85, 15.52], [76.73, 17.0], [74.94, 21.89], [72.97, 24.76], [71.47, 25.5], [71.83, 27.84], [70.99, 31.03], [69.26, 34.75], [67.88, 35.71], [66.45, 38.68], [65.67, 39.0], [63.46, 36.56], [60.29, 29.01], [58.85, 31.14], [57.95, 31.03], [53.89, 23.38], [53.17, 20.4], [53.29, 18.49], [55.68, 15.52], [54.72, 12.96], [54.72, 11.69], [57.12, 7.44], [58.73, 6.06], [60.41, 6.91], [62.86, 11.48], [62.26, 15.52], [64.17, 18.92], [64.0, 22.64], [64.47, 23.06], [65.91, 21.79], [67.17, 22.74], [67.28, 21.68], [65.85, 18.28], [65.55, 14.35], [66.81, 12.33], [67.52, 9.78], [68.72, 9.35], [70.16, 5.95]]]}, {"id": "prismpeaks", "name": "Prism Peaks", "domain": "Geometry & Trigonometry", "polys": [[[99.88, 53.88], [99.22, 54.84], [99.04, 57.49], [98.09, 58.77], [87.8, 58.34], [83.49, 64.72], [76.56, 64.72], [75.72, 64.08], [69.02, 52.18], [66.57, 51.01], [66.45, 49.52], [66.93, 46.12], [68.36, 43.15], [69.32, 38.04], [71.41, 35.39], [72.73, 30.07], [73.21, 29.22], [74.82, 29.12], [76.56, 24.12], [78.29, 22.1], [79.37, 18.49], [80.02, 17.53], [81.28, 17.64], [82.12, 15.73], [82.66, 12.65], [80.02, 12.65], [79.78, 11.16], [82.36, 8.5], [85.17, 3.29], [87.2, 2.23], [88.34, 3.61], [88.1, 6.59], [89.65, 10.2], [91.51, 17.11], [93.42, 15.41], [94.62, 13.28], [95.81, 13.28], [96.65, 14.35], [96.47, 15.52], [94.74, 16.26], [94.2, 17.43], [96.11, 25.5], [97.73, 28.16], [98.15, 29.97], [99.88, 42.19]]]}];
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
  svg.appendChild(defs);
  REGIONS.forEach(function (R) {
    if (isVisited(R.id)) return;
    /* pixel-accurate coverage: the mask is an image rendered from the
       region data itself, pre-feathered. No polygon approximations. */
    var mk = document.createElementNS(NS, 'mask');
    mk.setAttribute('id', 'wm-mk-' + R.id);
    mk.setAttribute('maskUnits', 'userSpaceOnUse');
    mk.setAttribute('x', '0'); mk.setAttribute('y', '0');
    mk.setAttribute('width', '100'); mk.setAttribute('height', '100');
    var mimg = document.createElementNS(NS, 'image');
    mimg.setAttribute('href', 'assets/map-masks/' + R.id + '.png');
    mimg.setAttribute('x', '0'); mimg.setAttribute('y', '0');
    mimg.setAttribute('width', '100'); mimg.setAttribute('height', '100');
    mimg.setAttribute('preserveAspectRatio', 'none');
    mk.appendChild(mimg);
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
