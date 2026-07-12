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
        fbHit:   'assets/fx/fireball/hit.png'
      },
      bg: 'assets/realms/lorewood.png',
      hp: 9,   /* nine tails, nine hit points: one tail per wound */
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
  var bodyEl = document.getElementById('bf-boss-img');
  var SP = B.sprites;
  Object.keys(SP).forEach(function (k) { var im = new Image(); im.src = SP[k]; });
  function setBody(k) { bodyEl.src = SP[k]; }
  setBody('neutral');

  /* frame sequences: attack when the guardian strikes, hurt when struck */
  var animT = [];
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function playBody(seq) {
    animT.forEach(clearTimeout); animT = [];
    if (reduceMotion) return;
    var t = 0;
    seq.forEach(function (s) {
      animT.push(setTimeout(function () { setBody(s[0]); }, t));
      t += s[1];
    });
    animT.push(setTimeout(function () { if (!state.over) setBody('neutral'); }, t));
  }

  /* ---------- the fireball: forms at the open mouth, flies, and only
     then does the damage land ---------- */
  var fbEl = document.getElementById('bf-fireball');
  var arenaEl = document.querySelector('.bf-arena');
  var fbTimers = [];
  function launchFireball(onImpact) {
    fbTimers.forEach(clearTimeout); fbTimers = [];
    var FORM = 300, FLY = 520, HIT = 320;
    if (reduceMotion) { fbTimers.push(setTimeout(onImpact, 200)); return; }
    var a = arenaEl.getBoundingClientRect();
    var br = bodyEl.getBoundingClientRect();
    var cr = document.getElementById('bf-capy').getBoundingClientRect();
    // the mouth sits at the face side (screen-left of the mirrored rig), upper third
    var sx = br.left - a.left + br.width * 0.06;
    var sy = br.top - a.top + br.height * 0.28;
    var tx = cr.left - a.left + cr.width * 0.55;
    var ty = cr.top - a.top + cr.height * 0.40;
    state.fireball = 'form';
    fbEl.src = SP.fbForm;
    fbEl.classList.remove('is-hit');
    fbEl.style.transition = 'none';
    fbEl.style.transform = 'translate(0,0)';
    fbEl.style.left = Math.round(sx - 37) + 'px';
    fbEl.style.top = Math.round(sy - 37) + 'px';
    fbEl.hidden = false;
    fbTimers.push(setTimeout(function () {
      state.fireball = 'fly';
      fbEl.src = SP.fbFly;
      fbEl.style.transition = '';
      // force layout so the transition actually animates the launch
      void fbEl.offsetWidth;
      fbEl.style.transform = 'translate(' + Math.round(tx - sx) + 'px,' + Math.round(ty - sy) + 'px)';
    }, FORM));
    fbTimers.push(setTimeout(function () {
      state.fireball = 'hit';
      fbEl.src = SP.fbHit;
      fbEl.classList.add('is-hit');
      onImpact();
    }, FORM + FLY));
    fbTimers.push(setTimeout(function () {
      state.fireball = null;
      fbEl.hidden = true;
    }, FORM + FLY + HIT));
  }

  /* the nine tails, fanned behind the rump; the newest wound takes a tail */
  var tailsEl = document.getElementById('bf-tails');
  var tailEls = [];
  function buildTails(n) {
    tailsEl.innerHTML = '';
    tailEls = [];
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
      state.bossHp = Math.max(0, state.bossHp - 1);
      feedEl.textContent = 'Pomelo strikes! The Archivist loses a tail.';
      feedEl.className = 'bf-feedback is-hit';
      playBody([['hurt1', 240], ['hurt2', 360]]);
      syncTails(state.bossHp);
      flash(document.getElementById('bf-boss-side'));
      if (window.SQSfx && window.SQSfx.correct) window.SQSfx.correct();
    } else {
      playBody([['attack1', 260], ['attack2', 420]]);
      feedEl.textContent = 'The guardian strikes back. The answer was ' +
        String.fromCharCode(65 + item.a) + ': ' + item.choices[item.a];
      feedEl.className = 'bf-feedback is-miss';
      launchFireball(function () {           // the damage lands with the fireball
        state.pomeloHp = Math.max(0, state.pomeloHp - 1);
        renderHp();
        flash(document.getElementById('bf-pomelo-side'));
        if (window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
        if (state.pomeloHp === 0) lose();
      });
    }
    renderHp();
    if (state.bossHp === 0) return win();
    setTimeout(ask, i === item.a ? 900 : 2300);
  }

  function flash(el) {
    el.classList.remove('is-flash');
    void el.offsetWidth;               // restart the flash
    el.classList.add('is-flash');
  }

  function win() {
    state.over = true;
    try { window.localStorage.setItem('sq_boss_' + realmId, 'cleared'); } catch (e) {}
    animT.forEach(clearTimeout);
    setBody('faint');                       // nine tails down, the Archivist rests
    var p = document.getElementById('bf-victory');
    if (B.next) {
      var onward = document.getElementById('bf-onward');
      onward.href = 'realm.html?realm=' + B.next.id;
      onward.textContent = 'Onward to ' + B.next.name + ' \u2192';
    }
    setTimeout(function () { p.hidden = false; }, 800);
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
    fbTimers.forEach(clearTimeout);
    fbEl.hidden = true;
    state.fireball = null;
    setBody('neutral');
    buildTails(state.bossMax);
    renderHp();
    ask();
  });

  buildTails(state.bossMax);
  renderHp();
  ask();
})();
