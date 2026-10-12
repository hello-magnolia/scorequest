/* ============================================================
   ScoreQuest: Critter Clash practice (clash.html)
   ------------------------------------------------------------
   The research question viewer's layout (list on the left, passage
   and question side by side) for one biome at a time, with a boss
   critter per question fighting Pomelo in the corner arena.

   Questions: data/clash-bank.js (window.SQ_QUESTION_BANK, ScoreQuest
   Originals only). Figures: js/clash-figures.js. Arena: js/clash-arena.js.
   Answers stay in this browser: localStorage sq_clash_<biome>.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var BANK = (window.SQ_QUESTION_BANK && window.SQ_QUESTION_BANK.questions) || [];
  var ARENA = window.SQArena;
  var LV = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

  /* the eight biomes, in map order, each with its SAT domain */
  var BIOMES = [
    { id: 'lorewood', name: 'Lorewood', domain: 'Information and Ideas', boss: 'rabbit', bossName: 'Lantern Rabbit' },
    { id: 'storyforge', name: 'Story Forge', domain: 'Craft and Structure', boss: 'hedgehog', bossName: 'Forge Hedgehog' },
    { id: 'inkreef', name: 'Ink Reef', domain: 'Expression of Ideas', boss: 'turtle', bossName: 'Reef Turtle' },
    { id: 'syntaxcitadel', name: 'Syntax Citadel', domain: 'Standard English Conventions', boss: 'frog', bossName: 'Citadel Frog King' },
    { id: 'mirrormines', name: 'Mirror Mines', domain: 'Algebra', boss: 'bear', bossName: 'Crystal Bear' },
    { id: 'infinityisles', name: 'Infinity Isles', domain: 'Advanced Math', boss: 'rabbit', bossName: 'Doubling Rabbit' },
    { id: 'datadocks', name: 'Data Docks', domain: 'Problem-Solving and Data Analysis', boss: 'turtle', bossName: 'Dockside Turtle' },
    { id: 'prismpeaks', name: 'Prism Peaks', domain: 'Geometry and Trigonometry', boss: 'bear', bossName: 'Summit Bear' }
  ];

  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(window.localStorage.getItem(k) || 'null');
      window.localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  var params = new URLSearchParams(location.search);
  var biome = BIOMES.filter(function (b) { return b.id === (params.get('realm') || store('sq_clash_last')); })[0] || BIOMES[0];
  var diff = '';
  var qs = [], cur = 0, picked = null, progress = {};

  /* ---------- text helpers (same rules as the practice room) ---------- */
  function math(el) {
    if (window.renderMathInElement) {
      try { window.renderMathInElement(el, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); } catch (e) {}
    }
  }
  function rich(s, passage) {
    var h = esc(s).replace(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])|\\\$/g, function (m, mm) { return mm ? m : '$'; });
    h = h.replace(/\{s\d+\}/g, '<u>').replace(/\{\/s\d+\}/g, '</u>');
    if (passage) h = h.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    return h;
  }
  function figure(f) {
    if (!f) return '';
    var spec = f.spec || f;
    if (!window.SQFigures || !spec.kind) return '';
    var svg;
    try { svg = window.SQFigures.render(spec); } catch (e) { return ''; }
    var alt = f.alt || (window.SQFigures.describe ? window.SQFigures.describe(spec) : '');
    return '<figure class="fig-built" role="img" aria-label="' + esc(alt) + '">' + svg + '</figure>';
  }
  function table(t) {
    if (!t) return '';
    return '<table class="data">' + (t.caption ? '<caption>' + esc(t.caption) + '</caption>' : '') +
      '<tr>' + t.columns.map(function (c) { return '<th>' + rich(c) + '</th>'; }).join('') + '</tr>' +
      t.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + rich(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  }
  function plainText(s) {
    return String(s || '').replace(/\\\$/g, '$').replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
      .replace(/\\sqrt\{([^{}]*)\}/g, '√$1').replace(/\\(cdot|times)/g, '×').replace(/\\(le|leq)\b/g, '≤').replace(/\\(ge|geq)\b/g, '≥')
      .replace(/\\(pi)\b/g, 'π').replace(/\^\{?\\circ\}?/g, '°').replace(/\\[()[\]]/g, ' ').replace(/\\(text|mathrm)\{([^{}]*)\}/g, '$2')
      .replace(/\\begin\{[a-z]+\}|\\end\{[a-z]+\}|&|\\\\/g, ' ').replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  }
  function preview(q) {
    var p = q.passage && q.passage.parts && q.passage.parts[0] && q.passage.parts[0].paragraphs[0];
    var s = plainText(q.stem);
    if (p && /^Which choice/.test(s)) s = plainText(p).replace(/\{\/?s\d+\}/g, '');
    return s;
  }

  /* ---------- answer checking (Digital SAT grid-in rules) ---------- */
  function value(t) {
    t = String(t).trim().replace(/−/g, '-');
    if (/^-?\d+\/\d+$/.test(t)) { var p = t.split('/'); return +p[0] / +p[1]; }
    var v = parseFloat(t);
    return isNaN(v) ? null : v;
  }
  function gridIn(t) {
    t = String(t == null ? '' : t).trim();
    if (!t) return 'Type an answer first.';
    if (/\d\s+\d+\/\d/.test(t)) return 'Mixed numbers are not allowed. Enter 3 1/2 as 7/2 or 3.5.';
    if (/[,%$]/.test(t)) return 'Leave out commas, percent signs and dollar signs.';
    if (!/^-?(\d+\.?\d*|\.\d+|\d+\/\d+)$/.test(t)) return 'Use digits with at most one decimal point or one fraction bar, like 12, 0.75 or 3/4.';
    if (t.length > (t.charAt(0) === '-' ? 6 : 5)) return 'Answers fit in 5 characters (6 with a minus sign). Round or use a fraction.';
    if (/\/0+$/.test(t)) return 'A fraction cannot have 0 on the bottom.';
    return '';
  }
  function check(q, resp) {
    if (q.type === 'mcq') {
      var key = q.choices.filter(function (c) { return c.correct; })[0];
      return { correct: !!key && key.key === resp, key: key && key.key };
    }
    var acc = q.accepted || (q.answer && q.answer.accepted) || [], v = value(resp);
    var ok = acc.some(function (a) { var av = value(a); return String(a).trim() === String(resp).trim() || (av !== null && v !== null && Math.abs(av - v) < 1e-9); });
    return { correct: ok, key: acc[0] };
  }

  /* ---------- the biome's boss: its ward has one pip per correct answer needed ----------
     about 60% of the biome's questions, never more than 10, so one sitting can clear it */
  function wardMax() {
    var n = BANK.filter(function (q) { return q.domain === biome.domain; }).length;
    return Math.max(3, Math.min(10, Math.ceil(n * 0.6)));
  }
  function hits() {
    return Object.keys(progress).filter(function (id) { return progress[id] && progress[id].result === 'won'; }).length;
  }
  function wardLeft() { return Math.max(0, wardMax() - hits()); }
  function critImg(key, h) {
    var sp = ARENA.sprite(key);
    return '<img src="' + sp.src + '" alt="" width="' + Math.round(sp.w * h / sp.h) + '" height="' + h + '">';
  }

  /* ---------- state ---------- */
  function loadBiome() {
    progress = store('sq_clash_' + biome.id) || {};
    qs = BANK.filter(function (q) { return q.domain === biome.domain && (!diff || +diff === q.difficulty); })
      .sort(function (a, b) { return (a.difficulty - b.difficulty) || (a.id < b.id ? -1 : 1); });
    store('sq_clash_last', biome.id);
    ARENA.enter(biome.id, biome.boss, biome.bossName, wardLeft(), wardMax());
    document.title = 'Critter Clash: ' + biome.name + ' · ScoreQuest';
    var firstOpen = qs.findIndex(function (q) { return !progress[q.id]; });
    cur = firstOpen < 0 ? 0 : firstOpen;
    renderList(); open(cur);
  }
  function stats() {
    var won = qs.filter(function (q) { return progress[q.id] && progress[q.id].result === 'won'; }).length;
    var left = wardLeft();
    $('#stats').textContent = biome.domain + ' · ' + won + ' of ' + qs.length + ' correct · ' +
      (left ? biome.bossName + ': ' + left + ' to go' : biome.bossName + ' dispelled');
  }
  function renderList() {
    var h = '<h3>' + esc(biome.name) + ' · ' + qs.length + ' questions</h3>' +
      '<p class="bossline">' + critImg(biome.boss, 18) + '<span>Boss: <b>' + esc(biome.bossName) + '</b></span></p>';
    h += qs.map(function (q, i) {
      var p = progress[q.id], st = p ? p.result : '';
      return '<button type="button" class="row' + (i === cur ? ' sel' : '') + (st ? ' ' + st : '') + '" data-i="' + i + '">' +
        '<span class="num">' + (i + 1) + '</span>' +
        '<span class="prev">' + esc(preview(q)) + '</span>' +
        (st === 'won' ? '<span class="mark won" title="Correct">&#10003;</span>' : st === 'missed' ? '<span class="mark missed" title="Revisit">&#8635;</span>' : '') +
        '<span class="dot d' + q.difficulty + '" title="' + LV[q.difficulty] + '"></span></button>';
    }).join('');
    h += '<div class="keys"><kbd>A</kbd>&ndash;<kbd>D</kbd> pick &nbsp; <kbd>Enter</kbd> check / next<br><kbd>&larr;</kbd> <kbd>&rarr;</kbd> move between questions</div>';
    $('#list').innerHTML = h;
    Array.prototype.forEach.call(document.querySelectorAll('#list .row'), function (b) {
      b.addEventListener('click', function () { open(+b.getAttribute('data-i')); });
    });
    stats();
  }
  function markList() {
    Array.prototype.forEach.call(document.querySelectorAll('#list .row'), function (b) {
      b.classList.toggle('sel', +b.getAttribute('data-i') === cur);
    });
    var sel = $('#list .row.sel');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- one question ---------- */
  function open(i) {
    if (!qs.length) { $('#view').innerHTML = '<div class="empty">No questions match. Try another difficulty.</div>'; return; }
    cur = Math.max(0, Math.min(qs.length - 1, i));
    picked = null;
    var q = qs[cur], p = q.passage, prev = progress[q.id];
    markList();
    var h = '';
    var visual = !p && (q.figure || q.table);
    h += '<div class="pane passage mid"><div id="arena-slot"></div>';
    if (p) {
      h += (p.intro ? '<p class="intro">' + rich(p.intro) + '</p>' : '');
      (p.parts || []).forEach(function (pt) {
        if (pt.label) h += '<div class="partlabel">' + esc(pt.label) + '</div>';
        if (p.kind === 'notes') h += '<ul>' + pt.paragraphs.map(function (x) { return '<li>' + rich(x, true) + '</li>'; }).join('') + '</ul>';
        else h += pt.paragraphs.map(function (x) { return '<p>' + rich(x, true) + '</p>'; }).join('');
      });
      (p.figures || []).forEach(function (f) { h += figure(f); });
    } else if (visual) {
      h += table(q.table) + figure(q.figure);
    }
    h += '</div>';
    h += '<div class="pane qpane"><div class="question">' +
      '<div class="qnum">Question ' + (cur + 1) + ' of ' + qs.length + '</div>' +
      '<div class="chips"><span class="chip">' + esc(q.skill) + '</span><span class="chip">' + LV[q.difficulty] + '</span></div>' +
      '<div class="stem">' + rich(q.stem) + '</div>' + (visual ? '' : table(q.table) + figure(q.figure));
    if (q.type === 'mcq') {
      h += '<ol class="choices" aria-label="Answer choices">' + q.choices.map(function (c) {
        return '<li><button type="button" data-k="' + c.key + '"><span class="k">' + c.key + '</span><span>' +
          (c.figure ? figure(c.figure) : rich(c.text)) + '</span></button></li>';
      }).join('') + '</ol>';
    } else {
      h += '<div class="spr"><label for="spr-in">Your answer</label><input id="spr-in" inputmode="decimal" autocomplete="off" maxlength="6" spellcheck="false">' +
        '<p class="hint">A number, decimal or fraction, like 12, 0.75 or 3/4.</p></div>';
    }
    h += '<p class="msg" id="msg" role="status"></p><div id="feedback"></div>' +
      '<div class="acts"><button class="btn-main" id="bCheck" type="button">Check</button>' +
      '<button id="bRetry" type="button" hidden>Try this one again</button>' +
      '<button class="btn-main" id="bNext" type="button" hidden>' + (cur + 1 < qs.length ? 'Next question' : 'Back to question 1') + '</button></div>' +
      '</div></div>';
    var view = $('#view'), arena = $('#arena');
    $('#arena-park').appendChild(arena);   // keep the live arena out of the way while the view is rebuilt
    view.innerHTML = h;
    $('#arena-slot').appendChild(arena);
    view.scrollTop = 0;
    Array.prototype.forEach.call(view.querySelectorAll('.pane'), function (el) { el.scrollTop = 0; math(el); });
    wire(q);
    if (prev) showResult(q, prev.response, prev.result === 'won', false);
  }
  function wire(q) {
    Array.prototype.forEach.call(document.querySelectorAll('.choices button'), function (b) {
      b.addEventListener('click', function () { pick(b.getAttribute('data-k')); });
    });
    var inp = $('#spr-in');
    if (inp) {
      inp.addEventListener('input', function () { picked = inp.value; $('#bCheck').disabled = !inp.value.trim(); $('#msg').textContent = ''; });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); doCheck(); } });
    }
    $('#bCheck').disabled = true;
    $('#bCheck').addEventListener('click', doCheck);
    $('#bNext').addEventListener('click', function () { open(cur + 1 < qs.length ? cur + 1 : 0); });
    $('#bRetry').addEventListener('click', function () { delete progress[q.id]; save(); renderList(); open(cur); });
  }
  function pick(k) {
    if (progress[qs[cur].id]) return;
    picked = k;
    Array.prototype.forEach.call(document.querySelectorAll('.choices button'), function (b) {
      b.classList.toggle('picked', b.getAttribute('data-k') === k);
    });
    $('#bCheck').disabled = false;
  }
  function doCheck() {
    var q = qs[cur];
    if (progress[q.id] || picked == null || picked === '') return;
    if (q.type !== 'mcq') { var bad = gridIn(picked); if (bad) { $('#msg').textContent = bad; return; } }
    var r = check(q, picked);
    progress[q.id] = { result: r.correct ? 'won' : 'missed', response: picked, at: Date.now() };
    save();
    renderList(); markList();
    showResult(q, picked, r.correct, true);
    if (r.correct) ARENA.hit(); else ARENA.miss();
  }
  function showResult(q, resp, won, fresh) {
    var r = check(q, resp), slip = '';
    if (q.type === 'mcq') {
      Array.prototype.forEach.call(document.querySelectorAll('.choices button'), function (b) {
        var k = b.getAttribute('data-k');
        b.disabled = true; b.classList.remove('picked');
        if (k === r.key) b.classList.add('correct');
        else if (k === resp) b.classList.add('wrong');
      });
      var pc = q.choices.filter(function (c) { return c.key === resp; })[0];
      if (!won && pc && pc.trap) slip = 'Common slip: ' + String(pc.trap).replace(/-/g, ' ') + '.';
    } else {
      var inp = $('#spr-in'); inp.value = resp; inp.disabled = true;
    }
    var verdict = won ? 'Correct. Pomelo lands a hit on the ' + esc(biome.bossName) + '.'
      : 'Not this time. The answer is ' + esc(r.key) + '.';
    $('#feedback').innerHTML = '<p class="verdict ' + (won ? 'won' : 'missed') + '">' + verdict + '</p>' +
      (slip ? '<p class="slip">' + esc(slip) + '</p>' : '') +
      '<div class="explain"><h4>Explanation</h4>' + String(q.explanation || '').split(/\n+/).map(function (x) { return '<p>' + rich(x) + '</p>'; }).join('') + '</div>';
    math($('#feedback'));
    $('#bCheck').hidden = true;
    $('#bNext').hidden = false;
    $('#bRetry').hidden = won;
    if (fresh) setTimeout(function () { try { $('#bNext').focus({ preventScroll: true }); } catch (e) {} }, 0);
  }
  function save() { store('sq_clash_' + biome.id, progress); }

  /* ---------- header + keys ---------- */
  var sel = $('#biome');
  sel.innerHTML = BIOMES.map(function (b) { return '<option value="' + b.id + '">' + esc(b.name) + ' (' + esc(b.domain) + ')</option>'; }).join('');
  sel.value = biome.id;
  sel.addEventListener('change', function () {
    biome = BIOMES.filter(function (b) { return b.id === sel.value; })[0];
    history.replaceState(null, '', '?realm=' + biome.id);
    loadBiome();
  });
  $('#fDiff').addEventListener('change', function () { diff = this.value; loadBiome(); });
  $('#bReset').addEventListener('click', function () {
    progress = {}; save(); loadBiome();
  });
  $('#cx-min').addEventListener('click', function () {
    var a = $('#arena'), m = a.classList.toggle('min');
    this.setAttribute('aria-expanded', m ? 'false' : 'true');
    document.body.classList.toggle('arena-hidden', m);
    this.textContent = m ? '+' : '_';
    this.title = m ? 'Show the arena' : 'Hide the arena';
    store('sq_clash_min', m);
  });
  if (store('sq_clash_min')) $('#cx-min').click();

  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    var q = qs[cur];
    if (!q) return;
    var k = e.key.toUpperCase();
    if (q.type === 'mcq' && /^[A-D]$/.test(k)) { pick(k); e.preventDefault(); }
    else if (e.key === 'Enter' && !(t && t.tagName === 'BUTTON')) {
      e.preventDefault();
      if (progress[q.id]) $('#bNext').click(); else doCheck();
    }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); if (cur + 1 < qs.length) open(cur + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); if (cur > 0) open(cur - 1); }
  });

  /* KaTeX loads deferred; set math once it lands */
  window.addEventListener('load', function () { Array.prototype.forEach.call(document.querySelectorAll('.pane, #feedback'), math); });

  window.__SQ_CLASH = { get state() { return { biome: biome.id, cur: cur, count: qs.length, progress: progress }; }, open: open, arena: ARENA };
  history.replaceState(null, '', '?realm=' + biome.id);
  ARENA.ready.then(loadBiome, loadBiome);
})();
