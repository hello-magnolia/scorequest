/* ============================================================
   ScoreQuest - question engine (no UI)
   ------------------------------------------------------------
   Reads window.SQ_QUESTION_BANK (data/questions.js, exported from the
   research pipeline: ScoreQuest Originals only) and offers:

     SQQuestions.all()                          every question
     SQQuestions.domains(section)               [{domain, skills:[..], count}]
     SQQuestions.filter({section, domains, skills, difficulty})
     SQQuestions.session(opts, n)               n questions, spread across skills, shuffled
     SQQuestions.check(q, response)             {correct, status, message}
     SQQuestions.gridIn(text)                   {ok, message} for student-produced answers

     SQQuestions.grade(q, response, opts)        async: grades on the server when signed in
                                                (the key never reaches the browser), else
                                                locally; records the attempt either way
     SQQuestions.ready                          resolves once the bank source is settled
     SQQuestions.source                         'supabase' or 'static'

     SQAttempts.record({...})                   keeps every answer locally and, when signed
                                                in, in the Supabase attempts table
     SQAttempts.list()

   Bank source: the Supabase questions table when the player is signed in and
   it answers (live rows, no answer keys), otherwise the static
   data/questions.js. Supabase rows are cached in localStorage sq_bank_cache
   so a bad connection does not block a session.

   Grid-in rules follow the Digital SAT: up to 5 characters (6 with a
   leading minus), digits, one decimal point or one fraction bar, no
   mixed numbers, no commas, no percent or dollar signs. Equivalent forms
   (1/2, .5, 0.5) all count.
   ============================================================ */
(function () {
  'use strict';
  var bank = (window.SQ_QUESTION_BANK && window.SQ_QUESTION_BANK.questions) || [];
  var source = 'static', CACHE = 'sq_bank_cache';
  var listeners = [];
  var DOMAIN_ORDER = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry',
    'Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'];

  function shuffle(a, rnd) {
    a = a.slice(); rnd = rnd || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function domains(section) {
    var map = {};
    bank.forEach(function (q) {
      if (section && q.section !== section) return;
      var d = map[q.domain] || (map[q.domain] = { domain: q.domain, section: q.section, skills: [], count: 0 });
      d.count++;
      if (d.skills.indexOf(q.skill) < 0) d.skills.push(q.skill);
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain); });
  }

  function filter(o) {
    o = o || {};
    return bank.filter(function (q) {
      if (o.section && q.section !== o.section) return false;
      if (o.domains && o.domains.length && o.domains.indexOf(q.domain) < 0) return false;
      if (o.skills && o.skills.length && o.skills.indexOf(q.skill) < 0) return false;
      if (o.difficulty && +o.difficulty !== q.difficulty) return false;
      if (o.exclude && o.exclude.indexOf(q.id) >= 0) return false;
      return true;
    });
  }

  /* n questions, round-robin across skills so a session is not five of the same kind,
     preferring questions this player has not seen yet */
  function session(o, n, rnd) {
    var pool = filter(o);
    var seen = {};
    SQAttempts.list().forEach(function (a) { seen[a.question_id] = true; });
    var bySkill = {};
    shuffle(pool, rnd).sort(function (a, b) { return (seen[a.id] ? 1 : 0) - (seen[b.id] ? 1 : 0); })
      .forEach(function (q) { (bySkill[q.skill] = bySkill[q.skill] || []).push(q); });
    var skills = shuffle(Object.keys(bySkill), rnd), out = [];
    while (out.length < n && skills.some(function (s) { return bySkill[s].length; })) {
      skills.forEach(function (s) { if (out.length < n && bySkill[s].length) out.push(bySkill[s].shift()); });
    }
    return shuffle(out, rnd);
  }

  /* ---------- student-produced response ---------- */
  function gridIn(text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) return { ok: false, message: 'Type an answer first.' };
    if (/\s/.test(t) && /\d\s+\d+\/\d/.test(t)) return { ok: false, message: 'Mixed numbers are not allowed. Enter 3 1/2 as 7/2 or 3.5.' };
    if (/[,%$]/.test(t)) return { ok: false, message: 'Leave out commas, percent signs and dollar signs.' };
    if (!/^-?(\d+\.?\d*|\.\d+|\d+\/\d+)$/.test(t)) return { ok: false, message: 'Use digits with at most one decimal point or one fraction bar, like 12, 0.75 or 3/4.' };
    var max = t.charAt(0) === '-' ? 6 : 5;
    if (t.length > max) return { ok: false, message: 'Answers fit in 5 characters (6 with a minus sign). Round or use a fraction.' };
    if (/\/0+$/.test(t)) return { ok: false, message: 'A fraction cannot have 0 on the bottom.' };
    return { ok: true, message: '' };
  }
  function value(t) {
    t = String(t).trim().replace(/−/g, '-');
    if (/^-?\d+\/\d+$/.test(t)) { var p = t.split('/'); return +p[0] / +p[1]; }
    var v = parseFloat(t);
    return isNaN(v) ? null : v;
  }

  function check(q, response) {
    if (!q) return { correct: false, status: 'error', message: 'No question.' };
    if (q.type === 'mcq') {
      var key = (q.choices || []).filter(function (c) { return c.correct; })[0];
      if (!response) return { correct: false, status: 'empty', message: 'Pick an answer first.' };
      return { correct: !!key && key.key === response, status: 'checked', key: key && key.key, message: '' };
    }
    var g = gridIn(response);
    if (!g.ok) return { correct: false, status: 'invalid', message: g.message };
    var v = value(response), acc = q.accepted || [];
    var ok = acc.some(function (a) {
      if (String(a).trim() === String(response).trim()) return true;
      var av = value(a);
      return av !== null && v !== null && Math.abs(av - v) < 1e-9;
    });
    return { correct: ok, status: 'checked', key: acc[0], message: '' };
  }

  /* grade: the server when it can (signed in, Supabase up), else the local check.
     Resolves {correct, status, key, explanation, trap, message, remote}. Records the
     attempt once: the server does it inside check_answer, the fallback goes through
     SQAttempts.record. */
  function grade(q, response, opts) {
    opts = opts || {};
    var local = check(q, response);
    if (local.status !== 'checked') return Promise.resolve(local);
    var done = function (r) {
      return { correct: !!r.correct, status: 'checked', key: r.key, message: '',
        explanation: r.explanation != null ? r.explanation : q.explanation, trap: r.trap || null, remote: !!r.remote };
    };
    var fallback = function () {
      var pc = q.type === 'mcq' ? (q.choices || []).filter(function (c) { return c.key === response; })[0] : null;
      if (opts.record !== false) window.SQAttempts.record({ question_id: q.id, correct: local.correct, response: response, ms: opts.ms, skill: q.skill, domain: q.domain, difficulty: q.difficulty, session_id: opts.session_id });
      return done({ correct: local.correct, key: local.key, trap: pc && !local.correct ? pc.trap : null });
    };
    if (opts.record === false || source !== 'supabase' || !window.SQAuth || !window.SQAuth.checkAnswer) return Promise.resolve(fallback());
    return window.SQAuth.checkAnswer(q.id, response, opts.ms, opts.session_id).then(function (r) {
      if (!r) return fallback();
      r.remote = true;
      /* keep the local list in step so per-skill summaries work offline */
      var all = list(); all.push({ question_id: q.id, correct: !!r.correct, response: String(response), ms: Math.max(0, Math.round(opts.ms || 0)), skill: q.skill, domain: q.domain, difficulty: q.difficulty, session_id: opts.session_id || null, created_at: new Date().toISOString() });
      try { window.localStorage.setItem(KEY, JSON.stringify(all.slice(-2000))); } catch (e) {}
      return done(r);
    }, fallback);
  }

  /* swap in the Supabase bank once the player is signed in and it answers */
  function adopt(rows, from) {
    if (!rows || !rows.length) return false;
    bank = rows; source = 'supabase';
    if (from !== 'cache') { try { window.localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), rows: rows })); } catch (e) {} }
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
    return true;
  }
  var ready = new Promise(function (resolve) {
    var settle = function () { resolve(source); };
    if (!window.SQAuth || !window.SQAuth.onChange) return settle();
    var asked = false;
    window.SQAuth.onChange(function (st) {
      if (asked || !st || !st.user) return;
      asked = true;
      try { var c = JSON.parse(window.localStorage.getItem(CACHE) || 'null'); if (c && c.rows && Date.now() - c.at < 7 * 864e5) adopt(c.rows, 'cache'); } catch (e) {}
      window.SQAuth.fetchBank().then(function (rows) { adopt(rows, 'live'); settle(); }, settle);
    });
    setTimeout(settle, 4000);   /* signed out, or Supabase slow: the static bank it is */
  });

  window.SQQuestions = {
    all: function () { return bank.slice(); },
    get: function (id) { return bank.filter(function (q) { return q.id === id; })[0] || null; },
    domains: domains, filter: filter, session: session, check: check, grade: grade, gridIn: gridIn, value: value,
    ready: ready, onBankChange: function (fn) { listeners.push(fn); },
    get source() { return source; },
    meta: (window.SQ_QUESTION_BANK && window.SQ_QUESTION_BANK.meta) || {},
  };

  /* ---------- attempts ---------- */
  var KEY = 'sq_attempts';
  function list() { try { return JSON.parse(window.localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  window.SQAttempts = {
    list: list,
    record: function (a) {
      var row = {
        question_id: a.question_id, correct: !!a.correct, response: a.response == null ? null : String(a.response),
        ms: Math.max(0, Math.round(a.ms || 0)), skill: a.skill || null, domain: a.domain || null,
        difficulty: a.difficulty || null, session_id: a.session_id || null, created_at: new Date().toISOString(),
      };
      var all = list(); all.push(row);
      try { window.localStorage.setItem(KEY, JSON.stringify(all.slice(-2000))); } catch (e) {}
      if (window.SQAuth && typeof window.SQAuth.recordAttempt === 'function') {
        try { window.SQAuth.recordAttempt(row); } catch (e) {}
      }
      return row;
    },
  };
})();
