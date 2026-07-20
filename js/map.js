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
  var REGIONS = [{"id": "lorewood", "name": "Lorewood", "domain": "Information & Ideas", "polys": [[[21.05, 18.92], [22.01, 18.92], [23.21, 20.19], [23.68, 21.04], [23.92, 24.02], [29.9, 34.64], [30.02, 42.93], [28.11, 46.33], [15.31, 46.55], [12.44, 50.8], [5.26, 50.8], [3.83, 48.25], [2.39, 47.4], [1.44, 45.7], [1.2, 46.12], [1.08, 45.48], [2.27, 43.36], [2.03, 40.38], [4.19, 37.41], [3.35, 36.34], [3.35, 35.07], [4.43, 33.58], [4.78, 30.82], [6.58, 27.21], [8.97, 25.5], [11.24, 21.04], [12.92, 21.47], [14.59, 23.59], [16.51, 20.19], [17.94, 20.19], [19.14, 22.32], [19.62, 20.62]], [[5.5, 20.62], [8.01, 23.8], [5.74, 23.17], [5.26, 24.02], [3.83, 23.17]]]}, {"id": "storyforge", "name": "Story Forge", "domain": "Craft & Structure", "polys": [[[15.07, 46.55], [27.87, 46.76], [27.87, 55.26], [31.94, 62.49], [31.94, 72.69], [30.98, 75.24], [28.83, 77.36], [27.75, 77.15], [24.04, 80.77], [23.09, 80.77], [21.77, 82.68], [20.81, 81.83], [19.5, 83.74], [19.26, 85.87], [18.66, 86.5], [17.94, 86.08], [16.75, 88.2], [15.55, 88.63], [14.11, 86.08], [13.28, 89.69], [12.44, 89.9], [11.72, 92.03], [11.48, 91.6], [10.17, 93.09], [8.37, 92.03], [7.66, 90.75], [9.09, 87.78], [9.93, 84.17], [7.78, 82.04], [7.18, 80.55], [6.46, 80.98], [5.98, 80.13], [5.14, 80.77], [5.62, 79.91], [4.43, 79.49], [4.9, 78.64], [4.55, 77.58], [3.83, 78.0], [1.08, 75.24], [0.84, 73.96], [1.67, 72.05], [1.56, 69.29], [2.03, 68.44], [0.48, 64.82], [1.08, 63.34], [0.84, 62.06], [2.39, 59.72], [2.39, 58.02], [5.02, 55.05], [5.62, 51.01], [12.68, 50.8]]]}, {"id": "syntaxcitadel", "name": "Syntax Citadel", "domain": "Conventions", "polys": [[[36.6, 0.64], [38.52, 1.49], [37.68, 3.83], [38.76, 6.16], [39.0, 9.14], [39.23, 8.71], [40.91, 9.99], [41.75, 8.08], [41.03, 5.95], [40.19, 7.44], [40.07, 6.8], [40.67, 3.61], [41.15, 3.61], [41.51, 6.38], [42.7, 8.5], [42.46, 11.48], [42.82, 14.24], [43.06, 14.67], [44.5, 11.26], [45.93, 16.37], [47.13, 15.09], [47.97, 17.0], [49.16, 20.83], [49.04, 25.29], [49.28, 25.72], [50.12, 23.8], [50.84, 23.8], [52.03, 27.63], [51.44, 28.27], [44.74, 28.27], [36.36, 43.15], [30.14, 43.15], [30.02, 34.86], [23.8, 23.8], [23.8, 22.1], [25.36, 23.17], [25.96, 22.53], [27.39, 15.73], [27.87, 14.88], [28.71, 15.52], [29.19, 14.67], [29.07, 13.6], [30.14, 10.41], [31.94, 15.3], [32.18, 9.78], [31.7, 8.93], [32.18, 8.5], [32.78, 9.99], [34.21, 8.29], [33.49, 5.74], [33.01, 6.59], [33.13, 3.83], [33.85, 3.83], [33.85, 5.53], [35.17, 8.29], [35.41, 6.16], [36.48, 3.83]]]}, {"id": "mirrormines", "name": "Mirror Mines", "domain": "Algebra", "polys": [[[44.74, 28.27], [51.79, 28.48], [54.43, 31.46], [54.67, 34.43], [55.02, 34.64], [55.98, 32.94], [57.54, 36.98], [59.93, 39.53], [61.12, 39.96], [61.6, 40.81], [61.48, 41.87], [63.28, 44.63], [63.16, 55.47], [49.04, 80.55], [48.8, 81.83], [47.01, 79.06], [47.25, 76.94], [45.69, 77.15], [44.74, 74.6], [43.54, 75.88], [42.46, 73.54], [41.75, 73.96], [40.67, 71.63], [39.95, 72.9], [38.64, 70.99], [37.44, 71.41], [36.36, 69.93], [35.89, 70.78], [32.78, 72.05], [32.06, 73.33], [31.94, 62.49], [27.87, 55.26], [27.87, 46.76], [29.78, 43.36], [36.36, 43.15]]]}, {"id": "inkreef", "name": "Ink Reef", "domain": "Expression of Ideas", "polys": [[[36.12, 71.2], [38.16, 71.84], [39.71, 75.88], [40.43, 74.6], [41.51, 75.24], [42.22, 76.51], [41.75, 78.21], [42.22, 79.06], [42.22, 80.77], [42.94, 79.91], [42.7, 79.49], [43.3, 78.0], [43.54, 78.43], [44.62, 77.36], [46.17, 80.55], [46.05, 82.47], [47.73, 84.59], [47.61, 85.65], [48.09, 86.5], [48.92, 86.72], [49.88, 89.27], [50.6, 89.69], [49.76, 92.45], [49.52, 92.03], [48.56, 93.73], [47.25, 93.94], [46.41, 95.01], [44.14, 95.22], [44.14, 96.92], [42.11, 99.26], [21.05, 99.26], [18.9, 98.83], [16.75, 95.86], [16.75, 93.73], [17.94, 92.45], [17.82, 91.39], [18.42, 91.6], [20.1, 89.48], [21.89, 88.42], [21.41, 86.72], [22.61, 84.59], [24.16, 86.5], [24.4, 85.65], [23.56, 84.59], [23.68, 83.1], [25.6, 80.55], [26.56, 82.25], [27.15, 82.04], [28.23, 85.23], [30.14, 87.78], [30.5, 90.54], [30.02, 91.39], [30.5, 92.24], [30.98, 90.97], [32.3, 89.9], [33.13, 91.82], [33.73, 91.6], [34.69, 94.16], [36.48, 95.64], [36.6, 94.58], [35.17, 92.88], [35.05, 91.39], [33.73, 90.33], [33.73, 88.2], [34.57, 87.99], [34.21, 86.93], [33.61, 86.72], [33.01, 89.05], [31.22, 88.84], [30.74, 87.14], [32.3, 85.65], [33.13, 86.29], [33.73, 84.8], [33.61, 83.74], [32.18, 82.47], [31.58, 83.95], [31.7, 85.02], [30.14, 85.65], [29.19, 84.8], [29.07, 83.32], [30.38, 81.4], [31.58, 82.68], [31.46, 79.06], [33.49, 76.73], [33.49, 74.18], [34.57, 71.84], [35.65, 72.05]]]}, {"id": "datadocks", "name": "Data Docks", "domain": "Problem-Solving & Data", "polys": [[[63.4, 44.0], [65.79, 47.4], [65.67, 50.16], [66.03, 51.22], [68.66, 50.8], [76.08, 63.97], [83.73, 63.97], [87.32, 57.6], [97.13, 58.02], [96.89, 60.57], [95.69, 60.15], [94.26, 63.55], [95.33, 68.86], [95.22, 70.35], [94.74, 71.2], [94.14, 70.99], [92.94, 73.11], [95.33, 75.66], [95.1, 78.64], [96.05, 80.34], [96.29, 83.32], [94.62, 86.29], [93.66, 86.29], [91.15, 89.48], [91.75, 90.54], [91.63, 97.13], [89.47, 99.26], [79.9, 99.26], [78.95, 98.41], [78.59, 97.34], [78.83, 96.07], [78.35, 95.64], [77.15, 96.92], [75.84, 97.13], [75.24, 98.62], [73.44, 98.83], [71.77, 96.71], [70.1, 98.83], [68.66, 97.13], [67.94, 97.56], [66.03, 95.01], [64.11, 98.41], [62.44, 97.13], [59.33, 99.26], [58.37, 98.41], [58.25, 96.92], [57.42, 97.56], [56.82, 95.22], [56.34, 95.64], [56.1, 98.62], [54.9, 97.77], [55.14, 96.49], [54.43, 95.22], [55.14, 89.69], [54.55, 89.05], [54.07, 90.75], [53.59, 90.75], [53.47, 88.42], [52.27, 86.29], [52.75, 84.59], [52.63, 82.25], [52.39, 81.83], [50.72, 83.1], [49.76, 81.4], [49.04, 81.83], [48.92, 81.19], [63.16, 55.47]]]}, {"id": "infinityisles", "name": "Infinity Isles", "domain": "Advanced Math", "polys": [[[71.05, 4.89], [71.89, 5.1], [73.8, 8.5], [73.92, 11.69], [74.16, 12.11], [74.88, 10.84], [76.32, 14.24], [76.44, 16.58], [75.72, 19.55], [72.37, 24.65], [71.29, 23.59], [70.69, 24.23], [71.41, 27.21], [71.29, 28.69], [69.14, 34.22], [68.06, 34.01], [66.27, 38.47], [65.43, 38.26], [64.35, 35.92], [63.64, 36.34], [61.36, 31.03], [60.77, 26.14], [58.61, 30.82], [58.13, 30.82], [57.06, 27.63], [55.86, 27.21], [54.19, 23.38], [53.47, 20.4], [53.59, 18.07], [56.22, 16.79], [56.58, 15.73], [55.26, 13.82], [55.02, 11.26], [58.13, 6.59], [59.57, 6.59], [62.56, 11.48], [62.2, 14.24], [60.17, 15.73], [62.44, 16.79], [64.0, 19.13], [64.0, 20.83], [63.28, 22.95], [64.23, 24.65], [65.31, 21.89], [66.15, 22.1], [67.22, 24.44], [68.06, 22.53], [66.15, 18.28], [65.79, 14.24], [67.22, 12.54], [67.58, 9.78], [68.18, 9.99], [68.9, 12.11], [69.38, 7.86]]]}, {"id": "prismpeaks", "name": "Prism Peaks", "domain": "Geometry & Trigonometry", "polys": [[[86.12, 2.76], [87.92, 2.98], [88.16, 4.25], [87.8, 5.31], [86.24, 7.65], [86.72, 8.08], [87.56, 7.01], [88.52, 7.86], [89.59, 11.05], [90.79, 17.43], [91.75, 19.13], [91.15, 22.74], [91.39, 23.17], [92.82, 20.62], [93.06, 21.04], [93.9, 17.85], [95.57, 25.08], [96.77, 27.21], [96.17, 27.84], [95.93, 29.97], [95.22, 30.39], [94.26, 29.54], [93.78, 30.39], [94.38, 32.31], [95.81, 32.73], [95.93, 31.24], [96.53, 31.46], [97.73, 28.91], [98.21, 35.71], [99.64, 45.06], [99.64, 52.71], [98.68, 53.56], [98.8, 57.17], [97.61, 58.45], [96.65, 57.6], [87.56, 57.6], [83.49, 63.97], [76.32, 63.97], [68.78, 51.01], [66.63, 50.58], [66.87, 47.61], [67.58, 44.63], [68.54, 43.78], [68.78, 40.81], [69.5, 39.53], [69.26, 38.26], [72.01, 35.49], [71.89, 33.58], [72.49, 32.94], [72.37, 31.88], [73.09, 29.76], [73.56, 29.33], [74.4, 31.24], [74.76, 31.03], [76.67, 24.23], [77.27, 23.59], [77.75, 24.44], [77.99, 24.02], [79.78, 17.85], [80.14, 17.64], [81.1, 19.34], [83.61, 11.9], [84.69, 13.82], [84.93, 13.39], [86.24, 9.78], [86.12, 8.29], [85.53, 9.78], [84.57, 9.78], [83.85, 11.05], [79.67, 11.69], [82.54, 9.14], [83.13, 6.8], [84.45, 6.59], [84.57, 5.1]], [[94.5, 13.39], [95.45, 13.39], [96.53, 14.88], [93.9, 15.73], [93.66, 15.3]]]}];
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
