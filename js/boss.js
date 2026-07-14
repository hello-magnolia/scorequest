/* ============================================================
   ScoreQuest — boss fight
   ------------------------------------------------------------
   The guardian at the end of a realm. Combat is the curriculum:
   answer right and Pomelo strikes (boss loses 1 HP); answer
   wrong and the guardian strikes (Pomelo loses 1 HP, and the
   correct answer is shown before the next question). Boss at
   0 HP: the way opens. Pomelo at 0 HP: a gentle retry — no
   punishment, the guardian will wait.

   Sprites are static placeholders for now (mechanics first);
   attack/hurt animations arrive with Magnolia's frames later.
   Question sets are small original placeholders per realm,
   cycling if exhausted. Clearing persists to
   localStorage sq_boss_<realm> = 'cleared'.
   ============================================================ */
(function () {
  'use strict';
  if (!document.body.classList.contains('page-boss')) return;

  var BOSSES = {
    lorewood: {
      name: 'The Nine-Tailed Archivist',
      taunt: 'Every scroll in this shrine says what I say it says.',
      sprites: {
        neutral: 'assets/boss/lorewood/neutral.png',
        tail:    'assets/boss/lorewood/tail.png',
        attack1: 'assets/boss/lorewood/attack1.png',
        attack2: 'assets/boss/lorewood/attack2.png',
        hurt1:   'assets/boss/lorewood/hurt1.png',
        hurt2:   'assets/boss/lorewood/hurt2.png',
        faint:   'assets/boss/lorewood/faint.png',
        fbForm:  'assets/fx/fireball/form.png',
        fbFly:   'assets/fx/fireball/fly.png',
        fbHit:   'assets/fx/fireball/hit.png',
        pomeloAtk1: 'assets/pomelo/attack1.png',
        pomeloAtk2: 'assets/pomelo/attack2.png',
        pomeloAtk3: 'assets/pomelo/attack3.png',
        pomeloAtk4: 'assets/pomelo/attack4.png',
        orange:  'assets/fx/orange.png'
      },
      bg: 'assets/boss/lorewood/bg.png',
      hp: 9,   /* nine tails, nine hit points: one tail per wound */
      flip: true,   /* source faces right; mirror her toward Pomelo */
      base: 'neutral',
      tails: 9,
      attackSeq: [['attack1', 260], ['attack2', 420]],
      hurtSeq: [['hurt1', 240], ['hurt2', 360]],
      faintSeq: [['faint', 300]],
      projectile: { form: 'fbForm', fly: 'fbFly', hit: 'fbHit', delay: 260,
        formMs: 300, flyMs: 520, hitMs: 320, formW: 74, flyW: 74, hitW: 116,
        ox: 0.06, oy: 0.28 },
      bgFx: { aspect: 1672 / 941, leaves: 12, lamps: [
        [0.131, 0.161, 9], [0.268, 0.162, 8], [0.727, 0.161, 8], [0.875, 0.161, 9],
        [0.445, 0.430, 4], [0.555, 0.430, 4], [0.249, 0.813, 5], [0.744, 0.814, 5]
      ] },
      next: { id: 'storyforge', name: 'Story Forge' },
      questions: [
        { q: 'The lanterns of Lorewood are lit every evening, though no keeper has been seen in ten years. Which question does the passage most directly raise?',
          choices: ['Who is lighting the lanterns?', 'Why are lanterns expensive?', 'When was Lorewood founded?', 'How bright are the lanterns?'], a: 0 },
        { q: '"The shrine\u2019s records are complete," the Archivist insists, "except the years I have eaten." Which word most weakens the Archivist\u2019s claim?',
          choices: ['records', 'complete', 'except', 'shrine\u2019s'], a: 2 },
        { q: 'A wish-paper reads: "Return what was taken, and the forest will speak plainly again." The wish implies the forest currently speaks how?',
          choices: ['Loudly', 'In riddles or falsehoods', 'Only at night', 'In an old dialect'], a: 1 },
        { q: 'Which sentence best supports the claim that the torii gates are maintained by someone?',
          choices: ['The gates are older than the trees.', 'The gates are painted the color of maples.', 'Fresh rope and new paper charms hang from every gate.', 'Travelers admire the gates.'], a: 2 },
        { q: 'The passage states the shrine doors "open only for the truth." Based on this, the doors are best described as a test of the visitor\u2019s\u2026',
          choices: ['strength', 'patience', 'honesty', 'speed'], a: 2 },
        { q: '"Few travelers finish the path; fewer still notice the fox-prints beside their own." The second clause mainly adds a sense of\u2026',
          choices: ['being secretly accompanied', 'the path\u2019s great length', 'the weather\u2019s harshness', 'the travelers\u2019 fatigue'], a: 0 },
        { q: 'The Archivist rewrites one word in every tale so each hero "gives up at the end." The detail suggests the Archivist\u2019s goal is to\u2026',
          choices: ['improve the stories', 'discourage those who read them', 'shorten the archive', 'honor the heroes'], a: 1 },
        { q: 'Which of these is an OPINION rather than a fact from the passage about Lorewood?',
          choices: ['The path passes under three torii gates.', 'Autumn is the most beautiful season here.', 'The shrine stands at the path\u2019s end.', 'Paper wishes hang from the branches.'], a: 1 }
      ]
    },
    storyforge: {
      name: 'The Boilerback Weaver',
      taunt: 'I respin every bridge you build to my own design.',
      sprites: {
        idle1:   'assets/boss/storyforge/idle1.png',
        idle2:   'assets/boss/storyforge/idle2.png',
        idle3:   'assets/boss/storyforge/idle3.png',
        attack1: 'assets/boss/storyforge/attack1.png',
        attack2: 'assets/boss/storyforge/attack2.png',
        attack3: 'assets/boss/storyforge/attack3.png',
        hurt1:   'assets/boss/storyforge/hurt1.png',
        hurt2:   'assets/boss/storyforge/hurt2.png',
        hurt3:   'assets/boss/storyforge/hurt3.png',
        faint1:  'assets/boss/storyforge/faint1.png',
        faint2:  'assets/boss/storyforge/faint2.png',
        faint3:  'assets/boss/storyforge/faint3.png',
        webForm: 'assets/fx/web/form.png',
        webFly:  'assets/fx/web/fly.png',
        webHit:  'assets/fx/web/hit.png',
        pomeloAtk1: 'assets/pomelo/attack1.png',
        pomeloAtk2: 'assets/pomelo/attack2.png',
        pomeloAtk3: 'assets/pomelo/attack3.png',
        pomeloAtk4: 'assets/pomelo/attack4.png',
        orange:  'assets/fx/orange.png'
      },
      bg: 'assets/boss/storyforge/bg.png',
      hp: 7,
      flip: false,  /* the spider already faces Pomelo */
      base: 'idle1',
      idleSeq: ['idle1', 'idle2', 'idle3'],
      idleMs: 460,
      attackSeq: [['attack1', 260], ['attack2', 280], ['attack3', 340]],
      hurtSeq: [['hurt1', 220], ['hurt2', 240], ['hurt3', 320]],
      faintSeq: [['faint1', 280], ['faint2', 280], ['faint3', 300]],
      projectile: { form: 'webForm', fly: 'webFly', hit: 'webHit', delay: 520,
        formMs: 280, flyMs: 480, hitMs: 340, formW: 56, flyW: 118, hitW: 152,
        ox: 0.10, oy: 0.64 },
      next: { id: 'inkreef', name: 'Ink Reef' },
      questions: [
        { q: 'The Weaver\u2019s manual opens with a warning, then lists parts, then assembly steps. Its structure is best described as\u2026',
          choices: ['Alphabetical order', 'A safety-first sequence', 'Cause and effect', 'A comparison of models'], a: 1 },
        { q: 'In \u201Cthe forge hissed, sighed, and finally slept,\u201D the word choice makes the forge seem\u2026',
          choices: ['dangerous', 'brand new', 'alive', 'broken'], a: 2 },
        { q: 'A paragraph about iron ends: \u201CSteel, however, tells a different story.\u201D The sentence mainly serves to\u2026',
          choices: ['define steel', 'summarize the passage', 'signal a shift to a new subject', 'correct an earlier error'], a: 2 },
        { q: 'The web is described as \u201Cmeasured, load-bearing, and exactly as long as needed.\u201D The description mainly presents the Weaver as\u2026',
          choices: ['fragile and hesitant', 'hurried and careless', 'decorative and vain', 'a careful engineer'], a: 3 },
        { q: '\u201CThe bellows failed. ___, the fires cooled.\u201D Which transition fits the logic?',
          choices: ['Meanwhile', 'Therefore', 'Although', 'For example'], a: 1 },
        { q: 'A set of tempering instructions is interrupted by a memory of the smith\u2019s old teacher. The interruption mainly adds\u2026',
          choices: ['a personal dimension', 'technical detail', 'a counterargument', 'statistics'], a: 0 },
        { q: 'The phrase \u201Cevery joint riveted twice\u201D most strongly conveys\u2026',
          choices: ['caution and thoroughness', 'haste', 'decoration', 'weakness'], a: 0 },
        { q: 'The passage compares stories to bridges three separate times. The repetition mainly helps the reader\u2026',
          choices: ['memorize dates', 'see structure as something built and crossed', 'learn bridge engineering', 'doubt the narrator'], a: 1 }
      ]
    }
  };

  var params = new URLSearchParams(window.location.search);
  var realmId = params.get('realm') || 'lorewood';
  var B = BOSSES[realmId] || BOSSES.lorewood;

  var state = {
    bossHp: B.hp,
    bossMax: B.hp,
    pomeloHp: 3,
    pomeloMax: 3,
    qi: 0,
    over: false,
    correctIndex: null,
    fireball: null
  };
  window.__SQ_BOSS = state;

  /* ---------- dom ---------- */
  document.title = B.name + ', ScoreQuest';
  document.getElementById('bf-realm').textContent =
    realmId.charAt(0).toUpperCase() + realmId.slice(1);
  document.getElementById('bf-boss-name').textContent = B.name;
  document.getElementById('bf-taunt').textContent = '\u201C' + B.taunt + '\u201D';
  document.getElementById('bf-stage').style.backgroundImage = 'url(' + B.bg + ')';

  /* the arena breathes: lantern flicker mapped onto the backdrop, leaves adrift */
  (function dressStage() {
    var fx = document.getElementById('bf-fx');
    var cfg = B.bgFx;
    var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fx || !cfg || rm) return;
    var glowEls = [];
    (cfg.lamps || []).forEach(function (l) {
      var g = document.createElement('span');
      g.className = 'bf-glow';
      fx.appendChild(g);
      glowEls.push([g, l]);
    });
    function place() {                        // replicate background-size: cover
      var sw = fx.clientWidth, sh = fx.clientHeight;
      if (!sw || !sh) return;
      var drawnH = Math.max(sh, sw / cfg.aspect);
      var drawnW = drawnH * cfg.aspect;
      var offX = (sw - drawnW) / 2;
      var offY = (sh - drawnH) * 0.3;         // matches background-position: center 30%
      glowEls.forEach(function (pair) {
        var g = pair[0], l = pair[1];
        var d = Math.round(l[2] / 100 * drawnW * 2);
        g.style.width = d + 'px';
        g.style.height = d + 'px';
        g.style.left = Math.round(offX + l[0] * drawnW) + 'px';
        g.style.top = Math.round(offY + l[1] * drawnH) + 'px';
      });
    }
    place();
    window.addEventListener('resize', place);
    var palette = ['#c23b22', '#d95d39', '#a8341e', '#e07a3f'];
    for (var i = 0; i < (cfg.leaves || 0); i++) {
      var leaf = document.createElement('span');
      leaf.className = 'bf-leaf';
      leaf.style.left = (2 + Math.random() * 94).toFixed(1) + '%';
      leaf.style.color = palette[i % palette.length];
      leaf.style.animationDuration = (11 + Math.random() * 8).toFixed(1) + 's';
      leaf.style.animationDelay = (-Math.random() * 16).toFixed(1) + 's';
      fx.appendChild(leaf);
    }
  })();
  if (!B.flip) document.getElementById('bf-boss-rig').classList.add('bf-no-flip');
  var bodyEl = document.getElementById('bf-boss-img');
  var SP = B.sprites;
  Object.keys(SP).forEach(function (k) { var im = new Image(); im.src = SP[k]; });
  function setBody(k) { bodyEl.src = SP[k]; }
  setBody(B.base);
  if (B.idleSeq && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var idleIdx = 0;               // breathing: cycle idle frames while at rest
    setInterval(function () {
      if (busy || state.over) return;
      idleIdx = (idleIdx + 1) % B.idleSeq.length;
      setBody(B.idleSeq[idleIdx]);
    }, B.idleMs || 420);
  }

  /* frame sequences: attack when the guardian strikes, hurt when struck */
  var animT = [];
  var busy = false;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function playBody(seq, hold) {
    animT.forEach(clearTimeout); animT = [];
    if (reduceMotion) { if (hold) setBody(seq[seq.length - 1][0]); return; }
    busy = true;
    var t = 0;
    seq.forEach(function (s) {
      animT.push(setTimeout(function () { setBody(s[0]); }, t));
      t += s[1];
    });
    animT.push(setTimeout(function () {
      busy = false;
      if (!hold && !state.over) setBody(B.base);
    }, t));
  }

  /* ---------- the fireball: forms at the open mouth, flies, and only
     then does the damage land ---------- */
  var fbEl = document.getElementById('bf-fireball');
  var arenaEl = document.querySelector('.bf-arena');
  var projTimers = [];
  function after(ms, fn) { projTimers.push(setTimeout(fn, ms)); }
  function launchFireball(onImpact, delay) {
    delay = delay || 0;
    var P = B.projectile;
    var FORM = P.formMs, FLY = P.flyMs, HIT = P.hitMs;
    if (reduceMotion) { after(delay + 200, onImpact); return; }
    var a = arenaEl.getBoundingClientRect();
    var br = bodyEl.getBoundingClientRect();
    var cr = document.getElementById('bf-capy').getBoundingClientRect();
    // the mouth sits at the face side (screen-left of the mirrored rig), upper third
    var sx = br.left - a.left + br.width * P.ox;
    var sy = br.top - a.top + br.height * P.oy;
    var tx = cr.left - a.left + cr.width * 0.55;
    var ty = cr.top - a.top + cr.height * 0.40;
    after(delay, function () {
      state.fireball = 'form';
      fbEl.src = SP[P.form];
      fbEl.classList.remove('is-hit');
      fbEl.style.width = P.formW + 'px';
      fbEl.style.transition = 'none';
      fbEl.style.transform = 'translate(0,0)';
      fbEl.style.left = Math.round(sx - P.formW / 2) + 'px';
      fbEl.style.top = Math.round(sy - P.formW / 2) + 'px';
      fbEl.hidden = false;
    });
    after(delay + FORM, function () {
      state.fireball = 'fly';
      fbEl.src = SP[P.fly];
      fbEl.style.width = P.flyW + 'px';
      fbEl.style.transition = '';
      // force layout so the transition actually animates the launch
      void fbEl.offsetWidth;
      fbEl.style.transform = 'translate(' + Math.round(tx - sx) + 'px,' + Math.round(ty - sy) + 'px)';
    });
    after(delay + FORM + FLY, function () {
      state.fireball = 'hit';
      fbEl.src = SP[P.hit];
      fbEl.style.width = P.hitW + 'px';
      fbEl.classList.add('is-hit');
      onImpact();
    });
    after(delay + FORM + FLY + HIT, function () {
      state.fireball = null;
      fbEl.hidden = true;
    });
  }

  /* ---------- Pomelo's answer: rear up and throw the orange;
     the Archivist's damage lands when the orange does ---------- */
  var capyAtkEl = document.getElementById('bf-capy-attack');
  var orangeEl = document.getElementById('bf-orange');
  capyAtkEl.src = SP.pomeloAtk1;
  function launchOrange(onImpact) {
    if (reduceMotion) { after(200, onImpact); return; }
    var a = arenaEl.getBoundingClientRect();
    var br = bodyEl.getBoundingClientRect();
    capy.style.visibility = 'hidden';
    capyAtkEl.src = SP.pomeloAtk1;                // orange still on his head
    capyAtkEl.hidden = false;
    after(150, function () { capyAtkEl.src = SP.pomeloAtk2; });
    after(300, function () { capyAtkEl.src = SP.pomeloAtk3; });
    after(450, function () {
      capyAtkEl.src = SP.pomeloAtk4;              // the orangeless release frame:
      var ar = capyAtkEl.getBoundingClientRect(); // the throwable pops up over his head
      var sx = ar.left - a.left + ar.width * 0.62;
      var sy = ar.top - a.top - 6;
      var tx = br.left - a.left + br.width * 0.42;
      var ty = br.top - a.top + br.height * 0.40;
      orangeEl.src = SP.orange;
      orangeEl.style.transition = 'none';
      orangeEl.style.transform = 'translate(0,0)';
      orangeEl.style.left = Math.round(sx - 42) + 'px';
      orangeEl.style.top = Math.round(sy - 42) + 'px';
      orangeEl.hidden = false;
      after(190, function () {
        void orangeEl.offsetWidth;
        orangeEl.style.transition = '';
        orangeEl.style.transform = 'translate(' + Math.round(tx - sx) + 'px,' + Math.round(ty - sy) + 'px)';
      });
    });
    after(450 + 190 + 480, function () {
      orangeEl.hidden = true;
      onImpact();
    });
    after(450 + 190 + 480 + 260, function () {
      capyAtkEl.hidden = true;
      capy.style.visibility = '';
    });
  }

  /* the nine tails, fanned behind the rump; the newest wound takes a tail */
  var tailsEl = document.getElementById('bf-tails');
  var tailEls = [];
  function buildTails(n) {
    tailsEl.innerHTML = '';
    tailEls = [];
    if (!B.tails) return;
    for (var i = 0; i < n; i++) {
      var t = document.createElement('img');
      t.className = 'bf-tail';
      t.src = SP.tail;
      t.alt = '';
      var rot = -100 + i * 14;             // fan, swung 90deg anticlockwise
      // the outer tails run slightly smaller than the middle of the fan
      var s = 1 - 0.18 * Math.pow((i - 4) / 4, 2);
      t.style.setProperty('--tr', rot + 'deg');
      t.style.setProperty('--ts', s.toFixed(3));
      t.style.transform = 'rotate(' + rot + 'deg) scale(' + s.toFixed(3) + ')';
      tailsEl.appendChild(t);
      tailEls.push(t);
    }
  }
  function syncTails(hp) {
    if (!B.tails) return;
    while (tailEls.length > hp) {
      var t = tailEls.pop();
      t.classList.add('is-gone');
      setTimeout(function (el) { return function () { el.remove(); }; }(t), 320);
    }
  }
  var back = document.getElementById('bf-retreat');
  back.href = 'realm.html?realm=' + realmId;

  var capy = document.getElementById('bf-capy');
  (function drawPomelo() {
    if (!window.SQCompanion) return;
    var ctx = null;
    try { ctx = capy.getContext('2d'); } catch (e) {}
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, capy.width, capy.height);
    ctx.setTransform(1, 0, 0, 1, 3, 6);
    window.SQCompanion.draw(ctx, 0);
  })();

  var PX_PER_HP = 38; // bar length scales with max HP, fill drains smoothly
  function bar(el, hp, max) {
    var track = el.querySelector('.bf-hp-track');
    if (!track) {
      el.innerHTML = '<span class="bf-hp-medal"><span class="bf-hp-heart"></span></span>' +
        '<span class="bf-hp-track"><span class="bf-hp-fill"></span></span>' +
        '<span class="bf-hp-cap"></span>';
      track = el.querySelector('.bf-hp-track');
      track.style.width = (max * PX_PER_HP) + 'px';
    }
    el.querySelector('.bf-hp-fill').style.width = (hp / max * 100) + '%';
  }
  function renderHp() {
    bar(document.getElementById('bf-boss-hp'), state.bossHp, state.bossMax);
    bar(document.getElementById('bf-pomelo-hp'), state.pomeloHp, state.pomeloMax);
  }

  var qEl = document.getElementById('bf-question');
  var choicesEl = document.getElementById('bf-choices');
  var feedEl = document.getElementById('bf-feedback');

  function ask() {
    if (state.over) return;
    var item = B.questions[state.qi % B.questions.length];
    state.correctIndex = item.a;
    qEl.textContent = item.q;
    feedEl.textContent = '';
    feedEl.className = 'bf-feedback';
    choicesEl.innerHTML = '';
    item.choices.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bf-choice';
      b.textContent = String.fromCharCode(65 + i) + '.  ' + c;
      b.addEventListener('click', function () { answer(i, item); });
      choicesEl.appendChild(b);
    });
  }

  function lockChoices() {
    choicesEl.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
  }

  function answer(i, item) {
    if (state.over) return;
    lockChoices();
    state.qi += 1;
    if (i === item.a) {
      feedEl.textContent = 'Pomelo strikes! The Archivist loses a tail.';
      feedEl.className = 'bf-feedback is-hit';
      launchOrange(function () {             // her damage lands with the orange
        state.bossHp = Math.max(0, state.bossHp - 1);
        playBody(B.hurtSeq);
        syncTails(state.bossHp);
        flash(document.getElementById('bf-boss-side'));
        renderHp();
        if (window.SQSfx && window.SQSfx.correct) window.SQSfx.correct();
        if (state.bossHp === 0) win();
      });
    } else {
      playBody(B.attackSeq);
      feedEl.textContent = 'The guardian strikes back. The answer was ' +
        String.fromCharCode(65 + item.a) + ': ' + item.choices[item.a];
      feedEl.className = 'bf-feedback is-miss';
      launchFireball(function () {           // the damage lands with the fireball
        state.pomeloHp = Math.max(0, state.pomeloHp - 1);
        renderHp();
        flash(document.getElementById('bf-pomelo-side'));
        if (window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
        if (state.pomeloHp === 0) lose();
      }, B.projectile.delay);   // timed to the open mouth, or the aimed spinneret
    }
    renderHp();
    setTimeout(ask, i === item.a ? 2000 : 2400);
  }

  function flash(el) {
    el.classList.remove('is-flash');
    void el.offsetWidth;               // restart the flash
    el.classList.add('is-flash');
  }

  function win() {
    state.over = true;
    try { window.localStorage.setItem('sq_boss_' + realmId, 'cleared'); } catch (e) {}
    playBody(B.faintSeq, true);             // the guardian goes down, and stays down
    var p = document.getElementById('bf-victory');
    if (B.next) {
      var onward = document.getElementById('bf-onward');
      onward.href = 'realm.html?realm=' + B.next.id;
      onward.textContent = 'Onward to ' + B.next.name + ' \u2192';
    }
    setTimeout(function () { p.hidden = false; }, 1200);
    if (window.SQSfx && window.SQSfx.correct) window.SQSfx.correct();
  }
  function lose() {
    state.over = true;
    document.getElementById('bf-defeat').hidden = false;
  }
  document.getElementById('bf-retry').addEventListener('click', function () {
    state.bossHp = state.bossMax;
    state.pomeloHp = state.pomeloMax;
    state.qi = 0;
    state.over = false;
    document.getElementById('bf-defeat').hidden = true;
    projTimers.forEach(clearTimeout);
    projTimers = [];
    fbEl.hidden = true;
    orangeEl.hidden = true;
    capyAtkEl.hidden = true;
    capy.style.visibility = '';
    state.fireball = null;
    busy = false;
    setBody(B.base);
    buildTails(state.bossMax);
    renderHp();
    ask();
  });

  buildTails(state.bossMax);
  renderHp();
  ask();
})();
