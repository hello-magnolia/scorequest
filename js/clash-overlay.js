/* ============================================================
   ScoreQuest: the waypoint overlay (realm.html)
   ------------------------------------------------------------
   Pomelo reaches a waypoint, the player presses Start, and this opens
   over the realm: the Critter Clash battle screen and reading card for
   a 5-question round on the waypoint's skill, or a lesson scroll.

     SQClashOverlay.open({ realm, waypoint, round, questions, onDone })
       mode clash   questions[] for this round; onDone({cleared, right, total})
       mode lesson  the lesson for waypoint.skill; onDone({cleared: true})
     SQClashOverlay.close()

   The boss critter here is the biome's sparring partner (same critter as
   clash.html). Its ward is the round: 5 pips, one per correct answer, and a
   round clears at 8 of 10. Pomelo's HP drains on misses and refills between
   rounds; empty is never a loss. Grading goes through SQQuestions.grade (the
   server when signed in), so every answer is an attempt with
   session_id "realm:<realm>:<waypoint>:r<round>".
   Needs: css/clash.css, js/qcard.js, js/clash-arena.js (binds #cx-cv), the
   bank engine, data/lessons.js.
   ============================================================ */
(function () {
  'use strict';
  var C = window.SQCard, $ = function (s, r) { return (r || document).querySelector(s); };
  var ROUND = 10, PASS = 8, POM_HP = 5;   /* a round is 10 questions, clears at 8 */
  var BOSS = {
    lorewood: { key: 'rabbit', name: 'Lantern Rabbit' }, storyforge: { key: 'hedgehog', name: 'Forge Hedgehog' },
    inkreef: { key: 'turtle', name: 'Reef Turtle' }, syntaxcitadel: { key: 'frog', name: 'Citadel Frog King' },
    mirrormines: { key: 'bear', name: 'Crystal Bear' }, infinityisles: { key: 'rabbit', name: 'Doubling Rabbit' },
    datadocks: { key: 'turtle', name: 'Dockside Turtle' }, prismpeaks: { key: 'bear', name: 'Summit Bear' }
  };
  var el = null, state = null;

  function mount() {
    if (el) return el;
    el = document.createElement('div');
    el.className = 'sq-overlay sq-clash';
    el.id = 'sq-overlay';
    el.innerHTML =
      '<div class="ov-top"><h2 id="ov-title"></h2><span class="sub" id="ov-sub"></span><span class="spacer"></span>' +
      '<div class="ov-dots" id="ov-dots" aria-label="Round progress"></div>' +
      '<button class="tbtn" id="ov-close" type="button">Leave</button></div>' +
      '<div id="ov-body"></div>';
    document.body.appendChild(el);
    $('#ov-close', el).addEventListener('click', function () { leave(); });
    el.addEventListener('keydown', function (e) { e.stopPropagation(); }, true);  /* the realm's arrow keys stay out */
    return el;
  }
  function clashHTML() {
    return '<div class="lay"><div class="left">' +
      '<div class="screen" id="screen"><canvas id="cx-cv" aria-hidden="true"></canvas>' +
      '<div class="plate me"><div class="nm" id="me-name"><span>Pomelo</span></div><div class="row"><span class="lbl hpl">HP</span><span class="bar hp" id="me-hp" role="img"></span></div></div>' +
      '<div class="plate boss"><div class="nm"><span id="cx-boss"></span></div><div class="row"><span class="lbl">WARD</span><span class="bar ward" id="cx-ward" role="img"></span></div></div></div>' +
      '<p class="log" id="cx-log" aria-live="polite"></p>' +
      '<section class="whybox" id="whybox" aria-live="polite" hidden><h3>Explanation</h3><div id="why"></div></section></div>' +
      '<article class="card" id="read"></article></div>';
  }
  function segs(n, on) { var h = ''; for (var i = 0; i < n; i++) h += '<i class="' + (i < on ? 'on' : '') + '"></i>'; return h; }
  function bars() {
    var hp = $('#me-hp', el); if (!hp || !state || state.mode !== 'clash') return;
    hp.innerHTML = segs(POM_HP, state.hp); hp.classList.toggle('low', state.hp <= 2);
    $('#cx-ward', el).classList.toggle('low', state.total - state.right <= 1);
  }
  function dots() {
    $('#ov-dots', el).innerHTML = state.qs.map(function (q, i) {
      var r = state.results[i];
      return '<i class="' + (r === true ? 'won' : r === false ? 'missed' : '') + (i === state.i ? ' cur' : '') + '"></i>';
    }).join('');
  }

  /* ---------- a clash round ---------- */
  function openClash(o) {
    state = { mode: 'clash', o: o, qs: o.questions.slice(0, ROUND), i: 0, results: [], right: 0, total: Math.min(ROUND, o.questions.length), hp: POM_HP, picked: null, shownAt: 0, busy: false };
    var boss = BOSS[o.realm] || BOSS.lorewood;
    $('#ov-title', el).textContent = o.waypoint.skill;
    $('#ov-sub', el).textContent = 'Round ' + (o.round || 1) + (o.waypoint.rounds > 1 ? ' of ' + o.waypoint.rounds : '') + ' · ' + state.total + ' questions, clear ' + Math.min(PASS, state.total);
    $('#ov-body', el).innerHTML = clashHTML();
    $('#me-name', el).insertAdjacentHTML('afterbegin', C.LEAF);
    var A = window.SQArena;
    A.bind(el);
    A.ready.then(function () {
      A.setMotion(motionPref());
      A.enter(o.realm, boss.key, boss.name, state.total, state.total).then(bars);
      bars(); show();
    });
  }
  function show() {
    var q = state.qs[state.i];
    state.picked = null; state.shownAt = Date.now(); state.busy = false;
    dots();
    var read = $('#read', el);
    read.innerHTML = C.passageHTML(q) + C.questionHTML(q, state.i + 1, state.total) +
      '<p class="msg" id="msg" role="status"></p><div class="acts"><button class="btn main" id="bCheck" type="button" disabled>Check</button>' +
      '<button class="btn" id="bNext" type="button" hidden>' + (state.i + 1 < state.total ? 'Next ▶' : 'Finish ▶') + '</button></div></div>';
    $('#why', el).innerHTML = ''; $('#whybox', el).hidden = true;
    C.math(read);
    Array.prototype.forEach.call(read.querySelectorAll('.choices button'), function (b) {
      b.addEventListener('click', function () { if (state.busy || state.results[state.i] != null) return; state.picked = b.getAttribute('data-k');
        Array.prototype.forEach.call(read.querySelectorAll('.choices button'), function (x) { x.classList.toggle('picked', x === b); });
        $('#bCheck', el).disabled = false; });
    });
    var inp = $('#spr-in', el);
    if (inp) {
      inp.addEventListener('input', function () { state.picked = inp.value; $('#bCheck', el).disabled = !inp.value.trim(); $('#msg', el).textContent = ''; });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 0);
    }
    $('#bCheck', el).addEventListener('click', check);
    $('#bNext', el).addEventListener('click', function () { if (state.i + 1 < state.total) { state.i++; show(); el.scrollTop = 0; } else finish(); });
  }
  function check() {
    var q = state.qs[state.i], resp = state.picked;
    if (state.busy || resp == null || resp === '') return;
    if (q.type !== 'mcq') { var bad = C.gridIn(resp); if (bad) { $('#msg', el).textContent = bad; return; } }
    state.busy = true; $('#bCheck', el).disabled = true;
    var o = state.o, sid = 'realm:' + o.realm + ':' + o.waypoint.id + ':r' + (o.round || 1);
    window.SQQuestions.grade(q, resp, { ms: Date.now() - state.shownAt, session_id: sid }).then(function (r) {
      if (!state || state.qs[state.i] !== q) return;
      if (r.status !== 'checked') { state.busy = false; $('#bCheck', el).disabled = false; $('#msg', el).textContent = r.message || 'Try again.'; return; }
      state.results[state.i] = !!r.correct;
      if (r.correct) state.right++;
      var read = $('#read', el);
      if (q.type === 'mcq') {
        Array.prototype.forEach.call(read.querySelectorAll('.choices button'), function (b) {
          var k = b.getAttribute('data-k'); b.disabled = true; b.classList.remove('picked');
          if (k === r.key) b.classList.add('correct'); else if (k === resp) b.classList.add('wrong');
        });
      } else { var inp = $('#spr-in', el); inp.disabled = true; }
      $('#why', el).innerHTML = '<p class="verdict ' + (r.correct ? 'won' : 'missed') + '">' +
        (r.correct ? 'Correct! A hit.' : 'Not this time. The answer is ' + C.esc(r.key) + '.') + '</p>' +
        (r.trap && !r.correct ? '<p class="slip">Common slip: ' + C.esc(String(r.trap).replace(/-/g, ' ')) + '.</p>' : '') +
        '<div class="body">' + String(r.explanation || '').split(/\n+/).map(function (x) { return '<p>' + C.rich(x) + '</p>'; }).join('') + '</div>';
      $('#whybox', el).hidden = false; C.math($('#why', el));
      $('#bCheck', el).hidden = true; $('#bNext', el).hidden = false;
      try { $('#bNext', el).focus({ preventScroll: true }); } catch (e) {}
      dots();
      var A = window.SQArena, st = state;
      if (r.correct) A.hit().then(function () { if (state === st) bars(); });
      else A.miss().then(function () { if (state !== st) return; st.hp = Math.max(0, st.hp - 1); bars();
        if (st.hp === 0) { $('#cx-log', el).textContent = 'Pomelo rests for a moment and bounces back, fully restored.'; setTimeout(function () { if (state === st) { st.hp = POM_HP; bars(); } }, 1200); } });
    });
  }
  function finish() {
    var cleared = state.right >= Math.min(PASS, state.total), o = state.o;
    $('#ov-body', el).innerHTML = '<div class="round-end"><h3>' + (cleared ? 'Round cleared!' : 'Almost there') + '</h3>' +
      '<p>' + state.right + ' of ' + state.total + ' correct.' + (cleared ? ' The way forward is open.' : ' Clear ' + Math.min(PASS, state.total) + ' to pass. Read the explanations and try again any time.') + '</p>' +
      '<div class="acts"><button class="btn main" id="ov-done" type="button">' + (cleared ? 'Back to the path' : 'Back to the path') + '</button>' +
      (cleared ? '' : '<button class="btn" id="ov-retry" type="button">Try again</button>') + '</div></div>';
    var res = { cleared: cleared, right: state.right, total: state.total };
    $('#ov-done', el).addEventListener('click', function () { close(); if (o.onDone) o.onDone(res); });
    var retry = $('#ov-retry', el);
    if (retry) retry.addEventListener('click', function () { if (o.onRetry) o.onRetry(); else openClash(o); });
    window.__SQ_OVERLAY = { done: true, cleared: cleared, right: state.right, total: state.total };
  }

  /* ---------- a lesson ---------- */
  function openLesson(o) {
    var L = (window.SQ_LESSONS || {})[o.waypoint.skill];
    state = { mode: 'lesson', o: o, checks: 0 };
    $('#ov-title', el).textContent = o.waypoint.title || o.waypoint.skill;
    $('#ov-sub', el).textContent = 'Lesson · ' + o.waypoint.skill;
    $('#ov-dots', el).innerHTML = '';
    if (!L) {
      $('#ov-body', el).innerHTML = '<div class="round-end"><h3>Lesson coming soon</h3><p>This scroll has not been written yet. Pomelo will let you through.</p><div class="acts"><button class="btn main" id="ov-done" type="button">Back to the path</button></div></div>';
      $('#ov-done', el).addEventListener('click', function () { close(); if (o.onDone) o.onDone({ cleared: true }); });
      return;
    }
    var h = '<div class="lesson"><div class="scroll"><div class="kicker">Lesson</div><h3>' + C.esc(o.waypoint.title || o.waypoint.skill) + '</h3><p>' + C.rich(L.intro) + '</p>' +
      '<h4>The moves</h4><ol>' + L.patterns.map(function (p) { return '<li>' + C.rich(p) + '</li>'; }).join('') + '</ol>' +
      '<h4>Worked example</h4><div class="ex"><p>' + C.rich(L.example.text) + '</p>' + (L.example.question ? '<p>' + C.rich(L.example.question) + '</p>' : '') +
      '<p class="ans">' + C.rich(L.example.answer) + '</p><p>' + C.rich(L.example.why) + '</p></div>' +
      '<h4>Quick check</h4><div class="checks">' + L.checks.map(function (c, i) {
        return '<div class="check" data-i="' + i + '"><p>' + C.rich(c.stem) + '</p><div class="opts">' + c.choices.map(function (t, j) { return '<button type="button" data-j="' + j + '">' + C.rich(t) + '</button>'; }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="acts"><button class="btn main" id="ov-done" type="button" disabled>Back to the path</button></div></div></div>';
    $('#ov-body', el).innerHTML = h;
    C.math($('#ov-body', el));
    Array.prototype.forEach.call(el.querySelectorAll('.check'), function (box) {
      var i = +box.getAttribute('data-i'), done = false;
      Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () {
          if (done) return; done = true; state.checks++;
          var j = +b.getAttribute('data-j'), key = L.checks[i].key;
          Array.prototype.forEach.call(box.querySelectorAll('button'), function (x) { x.disabled = true; if (+x.getAttribute('data-j') === key) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
          if (state.checks >= L.checks.length) $('#ov-done', el).disabled = false;
        });
      });
    });
    $('#ov-done', el).addEventListener('click', function () { close(); if (o.onDone) o.onDone({ cleared: true }); });
  }

  function motionPref() {
    var m = null; try { m = window.localStorage.getItem('sq_motion'); } catch (e) {}
    if (m === 'calm' || m === 'off' || m === 'full') return m;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full';
  }
  function open(o) {
    mount();
    el.classList.add('is-open'); el.scrollTop = 0;
    document.body.classList.add('sq-overlay-open');
    window.__SQ_OVERLAY = { open: true, mode: o.waypoint.mode, waypoint: o.waypoint.id };
    if (o.waypoint.mode === 'lesson') openLesson(o); else openClash(o);
  }
  function close() {
    if (!el) return;
    el.classList.remove('is-open');
    document.body.classList.remove('sq-overlay-open');
    $('#ov-body', el).innerHTML = '';
    window.__SQ_OVERLAY = null;
    state = null;
  }
  function leave() { var o = state && state.o; close(); if (o && o.onLeave) o.onLeave(); }
  window.SQClashOverlay = { open: open, close: close, ROUND: ROUND, PASS: PASS, get state() { return state; } };
})();
