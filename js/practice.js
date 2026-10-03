/* ============================================================
   ScoreQuest - practice page (practice.html)
   ------------------------------------------------------------
   Setup -> one question at a time (check, explanation, next) -> summary.
   Questions come from SQQuestions (js/questions.js), figures are drawn by
   SQFigures (js/figures.js), math by KaTeX when its CDN is reachable.
   Every answer is recorded through SQAttempts.

   Deep links: practice.html?section=math&domain=Algebra&difficulty=2&n=5&go=1
   (domain/skill may repeat). Keys: A-D or 1-4 pick, Enter checks / moves on.
   Low-anxiety copy rules apply: no timers on screen, "not quite" not "wrong".
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var LV = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
  var SAVE = 'sq_practice_session';
  var opts = { section: 'math', domains: [], difficulty: '', n: 10 };
  var run = null;   // {id, questions, i, answers: [{response, correct, ms}], startedAt}

  function store(k, v) { try { if (v === undefined) return JSON.parse(window.localStorage.getItem(k) || 'null'); if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function show(id) { ['pr-setup', 'pr-run', 'pr-summary'].forEach(function (x) { $('#' + x).hidden = x !== id; }); window.scrollTo && window.scrollTo(0, 0); }
  function math(el) {
    if (window.renderMathInElement) {
      try { window.renderMathInElement(el, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); } catch (e) {}
    }
  }
  /* text with \( \) math, \$ money, {s1}..{/s1} underline, *italic* in passages */
  function rich(s, passage) {
    var h = esc(s).replace(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])|\\\$/g, function (m, mm) { return mm ? m : '$'; });
    h = h.replace(/\{s\d+\}/g, '<u class="pr-u">').replace(/\{\/s\d+\}/g, '</u>');
    if (passage) h = h.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    return h;
  }
  function figure(f, small) {
    if (!f) return '';
    var spec = f.spec || f;
    if (!window.SQFigures || !spec.kind) return '';
    var svg;
    try { svg = window.SQFigures.render(spec); } catch (e) { return ''; }
    var alt = f.alt || (window.SQFigures.describe ? window.SQFigures.describe(spec) : '');
    return '<figure class="pr-fig' + (small ? ' pr-fig-sm' : '') + '" role="img" aria-label="' + esc(alt) + '">' + svg + '</figure>';
  }
  function table(t) {
    if (!t) return '';
    return '<table class="data pr-table">' + (t.caption ? '<caption>' + esc(t.caption) + '</caption>' : '') +
      '<tr>' + t.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>' +
      t.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  }
  /* one-line preview of a stem: math flattened to plain text */
  function plainText(s) {
    return String(s || '').replace(/\\\$/g, '$').replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
      .replace(/\\sqrt\{([^{}]*)\}/g, '\u221a$1').replace(/\\(cdot|times)/g, '\u00d7').replace(/\\(le|leq)\b/g, '\u2264').replace(/\\(ge|geq)\b/g, '\u2265')
      .replace(/\\(pi)\b/g, '\u03c0').replace(/\^\{?\\circ\}?/g, '\u00b0').replace(/\\[()[\]]/g, ' ').replace(/\\(text|mathrm)\{([^{}]*)\}/g, '$2')
      .replace(/\\begin\{[a-z]+\}|\\end\{[a-z]+\}|&|\\\\/g, ' ').replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  }
  function slip(tag) {   // kebab-case trap tag -> a gentle hint
    if (!tag) return '';
    var t = String(tag).replace(/-/g, ' ');
    return 'Common slip: ' + t + '.';
  }

  /* ---------------- setup ---------------- */
  function seg(id, val) {
    Array.prototype.forEach.call(document.querySelectorAll('#' + id + ' button'), function (b) {
      var on = b.getAttribute('data-v') === String(val);
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  function renderDomains() {
    var list = window.SQQuestions.domains(opts.section || null);
    var names = list.map(function (d) { return d.domain; });
    opts.domains = opts.domains.filter(function (d) { return names.indexOf(d) >= 0; });
    $('#pr-domains').innerHTML = list.map(function (d) {
      var on = !opts.domains.length || opts.domains.indexOf(d.domain) >= 0;
      return '<button type="button" class="pr-chip' + (on ? ' on' : '') + '" data-d="' + esc(d.domain) + '" aria-pressed="' + on + '">' + esc(d.domain) + '</button>';
    }).join('');
    updateAvail();
  }
  function selectedDomains() {
    return Array.prototype.filter.call(document.querySelectorAll('#pr-domains .pr-chip'), function (b) { return b.classList.contains('on'); })
      .map(function (b) { return b.getAttribute('data-d'); });
  }
  function filterOpts() { return { section: opts.section || null, domains: selectedDomains(), difficulty: opts.difficulty || null, skills: opts.skills || null }; }
  function updateAvail() {
    var n = window.SQQuestions.filter(filterOpts()).length;
    $('#pr-avail').textContent = n ? n + ' question' + (n === 1 ? '' : 's') + ' match' : 'No questions match yet. Try another difficulty.';
    $('#pr-start').disabled = !n;
  }

  function start(qs) {
    if (!qs.length) return;
    run = { id: 'p' + Date.now().toString(36), questions: qs.map(function (q) { return q.id; }), i: 0, answers: [], startedAt: Date.now() };
    store(SAVE, run);
    show('pr-run');
    renderQuestion();
  }

  /* ---------------- one question ---------------- */
  var current = null, picked = null, checked = false, shownAt = 0;
  function renderDots() {
    $('#pr-dots').innerHTML = run.questions.map(function (id, k) {
      var a = run.answers[k];
      return '<span class="pr-dot' + (k === run.i ? ' cur' : '') + (a ? (a.correct ? ' ok' : ' miss') : '') + '"></span>';
    }).join('');
    $('#pr-count').textContent = 'Question ' + (run.i + 1) + ' of ' + run.questions.length;
  }
  function renderQuestion() {
    current = window.SQQuestions.get(run.questions[run.i]);
    picked = null; checked = false; shownAt = Date.now();
    renderDots();
    var q = current, p = q.passage;
    var pane = $('#pr-passage');
    if (p) {
      var h = p.intro ? '<p class="pr-intro">' + rich(p.intro) + '</p>' : '';
      (p.parts || []).forEach(function (pt) {
        if (pt.label) h += '<h4 class="pr-part">' + esc(pt.label) + '</h4>';
        var cls = p.kind === 'notes' ? 'pr-note' : p.kind === 'poem' ? 'pr-line' : '';
        h += (p.kind === 'notes' ? '<ul class="pr-notes">' : '') +
          pt.paragraphs.map(function (x) { return p.kind === 'notes' ? '<li>' + rich(x, true) + '</li>' : '<p class="' + cls + '">' + rich(x, true) + '</p>'; }).join('') +
          (p.kind === 'notes' ? '</ul>' : '');
      });
      (p.figures || []).forEach(function (f) { h += figure(f); });
      pane.innerHTML = h; pane.hidden = false;
    } else { pane.innerHTML = ''; pane.hidden = true; }
    $('#pr-stage').classList.toggle('two', !!p);

    var meta = '<div class="pr-meta type-utility">' + esc(q.domain) + ' · ' + esc(q.skill) + ' · ' + esc(LV[q.difficulty] || '') + '</div>';
    var body = meta + '<div class="pr-stem">' + rich(q.stem) + '</div>' + table(q.table) + figure(q.figure);
    if (q.type === 'mcq') {
      body += '<ol class="pr-choices" role="listbox" aria-label="Answer choices">' + q.choices.map(function (c) {
        return '<li><button type="button" class="pr-choice" data-k="' + c.key + '" role="option" aria-selected="false">' +
          '<span class="pr-key">' + c.key + '</span><span class="pr-ctext">' + (c.figure ? figure(c.figure, true) : rich(c.text)) + '</span></button></li>';
      }).join('') + '</ol>';
    } else {
      body += '<div class="pr-spr"><label for="pr-spr-in" class="type-utility">Your answer</label>' +
        '<input id="pr-spr-in" class="un-input pr-spr-in" inputmode="decimal" autocomplete="off" maxlength="6" spellcheck="false" />' +
        '<p class="pr-hint">Enter a number, decimal or fraction, like 12, 0.75 or 3/4.</p></div>';
    }
    body += '<p class="pr-msg" id="pr-msg" role="status"></p><div class="pr-feedback" id="pr-feedback" hidden></div>' +
      '<div class="pr-nav"><button class="btn btn-gold" id="pr-check" type="button">Check</button>' +
      '<button class="btn btn-gold" id="pr-next" type="button" hidden>' + (run.i + 1 < run.questions.length ? 'Next question' : 'See results') + '</button></div>';
    var qe = $('#pr-q');
    qe.innerHTML = body;
    math(pane); math(qe);
    wire();
  }
  function wire() {
    Array.prototype.forEach.call(document.querySelectorAll('.pr-choice'), function (b) {
      b.addEventListener('click', function () { if (!checked) pick(b.getAttribute('data-k')); });
    });
    $('#pr-check').addEventListener('click', doCheck);
    $('#pr-next').addEventListener('click', next);
    var inp = $('#pr-spr-in');
    if (inp) {
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); checked ? next() : doCheck(); } });
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 0);
    }
  }
  function pick(k) {
    picked = k;
    Array.prototype.forEach.call(document.querySelectorAll('.pr-choice'), function (b) {
      var on = b.getAttribute('data-k') === k;
      b.classList.toggle('sel', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('#pr-msg').textContent = '';
  }
  function doCheck() {
    if (checked) return;
    var q = current, resp = q.type === 'mcq' ? picked : ($('#pr-spr-in').value || '').trim();
    var r = window.SQQuestions.check(q, resp);
    if (r.status !== 'checked') { $('#pr-msg').textContent = r.message; return; }
    checked = true;
    var ms = Date.now() - shownAt;
    run.answers[run.i] = { response: resp, correct: r.correct, ms: ms };
    store(SAVE, run);
    window.SQAttempts.record({ question_id: q.id, correct: r.correct, response: resp, ms: ms, skill: q.skill, domain: q.domain, difficulty: q.difficulty, session_id: run.id });

    var fb = '';
    if (q.type === 'mcq') {
      var key = r.key, pickedChoice = q.choices.filter(function (c) { return c.key === resp; })[0];
      Array.prototype.forEach.call(document.querySelectorAll('.pr-choice'), function (b) {
        var k = b.getAttribute('data-k');
        b.disabled = true;
        if (k === key) b.classList.add('right');
        else if (k === resp) b.classList.add('missed');
      });
      fb = r.correct ? '<p class="pr-verdict ok">Correct.</p>'
        : '<p class="pr-verdict miss">Not quite. The answer is ' + esc(key) + '.</p>' + (pickedChoice && pickedChoice.trap ? '<p class="pr-slip">' + esc(slip(pickedChoice.trap)) + '</p>' : '');
    } else {
      $('#pr-spr-in').disabled = true;
      $('#pr-spr-in').classList.add(r.correct ? 'right' : 'missed');
      fb = r.correct ? '<p class="pr-verdict ok">Correct.</p>'
        : '<p class="pr-verdict miss">Not quite. One correct answer is ' + rich(q.accepted[0]) + '.</p>';
      if (q.accepted.length > 1) fb += '<p class="pr-slip">Accepted forms: ' + q.accepted.map(esc).join(', ') + '</p>';
    }
    fb += '<div class="pr-explain"><h4>Explanation</h4>' + String(q.explanation || '').split(/\n+/).map(function (x) { return '<p>' + rich(x) + '</p>'; }).join('') + '</div>';
    var box = $('#pr-feedback');
    box.innerHTML = fb; box.hidden = false;
    math(box);
    $('#pr-msg').textContent = '';
    $('#pr-check').hidden = true;
    $('#pr-next').hidden = false;
    try { $('#pr-next').focus(); } catch (e) {}
    renderDots();
  }
  function next() {
    if (!checked) return;
    if (run.i + 1 < run.questions.length) { run.i++; store(SAVE, run); renderQuestion(); }
    else finish();
  }

  /* ---------------- summary ---------------- */
  function finish() {
    store(SAVE, null);
    var qs = run.questions.map(window.SQQuestions.get);
    var right = run.answers.filter(function (a) { return a && a.correct; }).length, n = run.answers.filter(Boolean).length;
    $('#pr-sum-title').textContent = n === run.questions.length ? 'Session complete' : 'Session ended';
    $('#pr-score').innerHTML = '<span class="pr-big">' + right + '</span> of ' + n + ' correct';
    var by = {};
    qs.forEach(function (q, k) {
      var a = run.answers[k]; if (!a) return;
      var s = by[q.skill] || (by[q.skill] = { skill: q.skill, domain: q.domain, n: 0, ok: 0 });
      s.n++; if (a.correct) s.ok++;
    });
    $('#pr-skills').innerHTML = Object.keys(by).map(function (k) {
      var s = by[k], pct = Math.round(100 * s.ok / s.n);
      return '<div class="pr-skill"><span class="pr-skill-name">' + esc(s.skill) + '</span>' +
        '<span class="pr-bar"><span style="width:' + pct + '%"></span></span><span class="pr-skill-n type-utility">' + s.ok + '/' + s.n + '</span></div>';
    }).join('');
    var missed = [];
    qs.forEach(function (q, k) { var a = run.answers[k]; if (a && !a.correct) missed.push({ q: q, a: a, k: k }); });
    $('#pr-missed-card').hidden = !missed.length;
    $('#pr-missed').innerHTML = missed.map(function (m) {
      var plain = plainText(m.q.stem);
      return '<li><button type="button" class="pr-review" data-k="' + m.k + '">' + esc(plain.length > 110 ? plain.slice(0, 108).replace(/\s+\S*$/, '') + '…' : plain) + '</button></li>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.pr-review'), function (b) {
      b.addEventListener('click', function () { review(+b.getAttribute('data-k')); });
    });
    $('#pr-again-missed').hidden = !missed.length;
    run.missedSkills = missed.map(function (m) { return m.q.skill; });
    show('pr-summary');
  }
  /* reopen a missed question read-only, with the player's answer and the explanation */
  function review(k) {
    var keep = run;
    run = { id: keep.id, questions: keep.questions, i: k, answers: keep.answers, review: true, back: keep };
    show('pr-run');
    renderQuestion();
    var a = keep.answers[k];
    if (current.type === 'mcq') pick(a.response); else $('#pr-spr-in').value = a.response;
    checked = false;
    var rec = window.SQAttempts.record;
    window.SQAttempts.record = function () {};      // reviewing is not a new attempt
    doCheck();
    window.SQAttempts.record = rec;
    $('#pr-next').textContent = 'Back to results';
    $('#pr-next').onclick = null;
    var nb = $('#pr-next').cloneNode(true);
    $('#pr-next').replaceWith(nb);
    nb.addEventListener('click', function () { run = keep; show('pr-summary'); });
    $('#pr-count').textContent = 'Reviewing question ' + (k + 1);
  }

  /* ---------------- wiring ---------------- */
  function init() {
    if (!window.SQQuestions || !window.SQQuestions.all().length) {
      $('#pr-setup').innerHTML = '<h1 class="pf-page-title">Practice</h1><p class="pr-lede">Questions are on their way. Check back soon.</p>';
      return;
    }
    var u = new URLSearchParams(window.location.search);
    if (u.has('section')) opts.section = u.get('section');
    if (u.getAll('domain').length) opts.domains = u.getAll('domain');
    if (u.getAll('skill').length) opts.skills = u.getAll('skill');
    if (u.has('difficulty')) opts.difficulty = u.get('difficulty');
    if (u.has('n')) opts.n = Math.max(1, Math.min(40, +u.get('n') || 10));
    seg('pr-section', opts.section); seg('pr-diff', opts.difficulty); seg('pr-len', opts.n);
    renderDomains();

    $('#pr-section').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      opts.section = b.getAttribute('data-v'); opts.domains = []; opts.skills = null;
      seg('pr-section', opts.section); renderDomains();
    });
    $('#pr-domains').addEventListener('click', function (e) {
      var b = e.target.closest('.pr-chip'); if (!b) return;
      var on = !b.classList.contains('on');
      if (!on && selectedDomains().length === 1) return;     // keep at least one
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      opts.skills = null; updateAvail();
    });
    $('#pr-diff').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      opts.difficulty = b.getAttribute('data-v'); seg('pr-diff', opts.difficulty); updateAvail();
    });
    $('#pr-len').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      opts.n = +b.getAttribute('data-v'); seg('pr-len', opts.n);
    });
    $('#pr-start').addEventListener('click', function () { start(window.SQQuestions.session(filterOpts(), opts.n)); });
    $('#pr-end').addEventListener('click', function () {
      if (run && run.review) { run = run.back; show('pr-summary'); return; }
      if (run) finish();
    });
    $('#pr-new').addEventListener('click', function () { opts.skills = null; renderDomains(); show('pr-setup'); });
    $('#pr-again-missed').addEventListener('click', function () {
      var skills = (run && run.missedSkills) || [];
      start(window.SQQuestions.session({ skills: skills, exclude: run ? run.questions : [] }, opts.n));
    });
    document.addEventListener('keydown', function (e) {
      if ($('#pr-run').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      var k = e.key.toUpperCase(), map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
      if (current && current.type === 'mcq' && !checked && ('ABCD'.indexOf(k) >= 0 || map[k])) { e.preventDefault(); pick(map[k] || k); }
      else if (e.key === 'Enter') { e.preventDefault(); checked ? $('#pr-next').click() : doCheck(); }
    });

    // an unfinished session on this device: offer to resume
    var saved = store(SAVE);
    if (saved && saved.questions && saved.answers.filter(Boolean).length < saved.questions.length && saved.questions.every(window.SQQuestions.get)) {
      $('#pr-resume').hidden = false;
      $('#pr-resume-text').textContent = 'You have a session in progress (' + saved.answers.filter(Boolean).length + ' of ' + saved.questions.length + ' answered).';
      $('#pr-resume-go').addEventListener('click', function () {
        run = saved; run.i = Math.min(saved.answers.filter(Boolean).length, saved.questions.length - 1);
        show('pr-run'); renderQuestion();
      });
    }
    if (u.get('go') === '1') start(window.SQQuestions.session(filterOpts(), opts.n));
    window.__SQ_PRACTICE = { get run() { return run; }, get current() { return current; }, start: start, check: doCheck, next: next, pick: pick };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
