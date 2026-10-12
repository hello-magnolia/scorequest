/* ============================================================
   ScoreQuest: Critter Clash practice (clash.html)
   ------------------------------------------------------------
   One biome at a time. Left: a 4:3 battle screen (Pomelo vs the
   biome's boss critter) and the explanation panel. Right: the
   passage, the question and the answers. Across the top: the
   trail, which only says where you are and how each question went.

   Health lives only in the battle screen:
     boss WARD  one pip per correct answer needed (60% of the biome, 3..10);
                misses never heal it; at zero the boss is dispelled for good.
     Pomelo HP  a miss drains one segment. Empty is never a loss: Pomelo
                retreats to rest, comes back full, and the boss keeps its cracks.

   Calm options: Focus (F) hides the battle screen and leaves two quiet bars;
   Motion full / calm / off (also on the Settings page, localStorage sq_motion).
   Questions: data/clash-bank.js (ScoreQuest Originals). Figures: js/clash-figures.js.
   Answers stay in this browser: localStorage sq_clash_<biome>.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var BANK = (window.SQ_QUESTION_BANK && window.SQ_QUESTION_BANK.questions) || [];
  var ARENA = window.SQArena;
  var LV = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
  var POM_HP = 5;

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
  var diff = '', qs = [], cur = 0, picked = null, progress = {}, pomHp = POM_HP;

  /* ---------- text helpers ---------- */
  function math(el) {
    if (el && window.renderMathInElement) {
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

  /* ---------- tiny pixel art for the trail: one character per pixel ---------- */
  function px(rows, pal, s) {
    var w = rows[0].length, h = rows.length, r = '';
    rows.forEach(function (row, y) { for (var x = 0; x < w; x++) { var c = pal[row[x]]; if (c) r += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + c + '"/>'; } });
    return '<svg class="px" viewBox="0 0 ' + w + ' ' + h + '" width="' + w * s + '" height="' + h * s + '" aria-hidden="true">' + r + '</svg>';
  }
  var LANTERN = px(['...k...', '..kkk..', '.kkkkk.', '.kyyyk.', '.kyoyk.', '.kyyyk.', '..kkk..', '...k...', '.kkkkk.'], { k: '#2b2118', y: '#f2c84b', o: '#e8742a' }, 3);
  var LEAF = px(['...gg', '..ggg', '.ggg.', 'ggg..', 'k....'], { g: '#6f9a5a', k: '#2b2118' }, 2);
  var TORII = px(['kkkkkkkkkkkkkk', 'krrrrrrrrrrrrk', '.kkkkkkkkkkkk.', '..kr......kr..', '.krrrrrrrrrrk.', '..kr......kr..', '..kr......kr..', '..kr......kr..', '..kr......kr..', '..kk......kk..'], { k: '#2b2118', r: '#b5473a' }, 3);
  var LAIR_TINT = { storyforge: '#d9803a', inkreef: '#4fa3b5', syntaxcitadel: '#c9b25a', mirrormines: '#9a7ae0', infinityisles: '#d98ab5', datadocks: '#6a90b0', prismpeaks: '#8fd3f0' };
  function lairIcon(id) {
    if (id === 'lorewood') return TORII;
    return px(['k.k.k.k.k', 'kkkkkkkkk', 'ksssssssk', 'ksssfsssk', 'ksssssssk', 'kssdddssk', 'ksdddddsk', 'ksdddddsk', 'kkkkkkkkk'],
      { k: '#2b2118', s: '#cfc4ab', f: LAIR_TINT[id] || '#f2c84b', d: '#2b2118' }, 3);
  }

  /* ---------- ward and HP ---------- */
  function wardMax() {
    var n = BANK.filter(function (q) { return q.domain === biome.domain; }).length;
    return Math.max(3, Math.min(10, Math.ceil(n * 0.6)));
  }
  function hits() { return Object.keys(progress).filter(function (id) { return progress[id] && progress[id].result === 'won'; }).length; }
  function wardLeft() { return Math.max(0, wardMax() - hits()); }
  function segs(n, on) { var h = ''; for (var i = 0; i < n; i++) h += '<i class="' + (i < on ? 'on' : '') + '"></i>'; return h; }
  function bars() {
    var hp = $('#me-hp'), w = wardLeft(), m = wardMax();
    hp.innerHTML = segs(POM_HP, pomHp);
    hp.classList.toggle('low', pomHp <= 2);
    hp.setAttribute('aria-label', 'Pomelo HP ' + pomHp + ' of ' + POM_HP);
    $('#cx-ward').classList.toggle('low', w <= 1);
    $('#mini-hp').innerHTML = segs(POM_HP, pomHp);
    $('#mini-hp').classList.toggle('low', pomHp <= 2);
    $('#mini-ward').innerHTML = segs(m, w);
    $('#mini-ward').classList.toggle('low', w <= 1);
    $('#mini-boss').textContent = biome.bossName;
    var all = BANK.filter(function (q) { return q.domain === biome.domain; }).length;
    var pct = all ? Math.round(100 * hits() / all) : 0;
    $('#doneFill').style.width = pct + '%';
    $('#donePct').textContent = pct + '%';
  }
  function pomOuch() {
    pomHp = Math.max(0, pomHp - 1); bars();
    if (pomHp > 0) return;
    var el = $('#me-hp');
    $('#cx-log').textContent = 'Pomelo retreats for a quick rest and bounces back, fully restored. The ' + biome.bossName + "'s cracks stay put.";
    el.classList.add('rest');
    setTimeout(function () { pomHp = POM_HP; bars(); el.classList.remove('rest'); }, 1500);
  }

  /* ---------- biome ---------- */
  function loadBiome() {
    progress = store('sq_clash_' + biome.id) || {};
    pomHp = POM_HP;
    qs = BANK.filter(function (q) { return q.domain === biome.domain && (!diff || +diff === q.difficulty); })
      .sort(function (a, b) { return (a.difficulty - b.difficulty) || (a.id < b.id ? -1 : 1); });
    store('sq_clash_last', biome.id);
    document.title = 'Critter Clash: ' + biome.name + ' · ScoreQuest';
    ARENA.enter(biome.id, biome.boss, biome.bossName, wardLeft(), wardMax()).then(bars);
    var firstOpen = qs.findIndex(function (q) { return !progress[q.id]; });
    cur = firstOpen < 0 ? 0 : firstOpen;
    bars(); open(cur);
  }
  function trail() {
    var h = '';
    qs.forEach(function (q, i) {
      var st = progress[q.id] ? progress[q.id].result : '';
      h += (i ? '<span class="seg"></span>' : '') + '<button type="button" class="node ' + st + (i === cur ? ' cur' : '') + '" data-i="' + i + '" aria-label="Question ' + (i + 1) +
        (st ? (st === 'won' ? ', correct' : ', revisit') : '') + '"' + (i === cur ? ' aria-current="step"' : '') + '>' +
        (st === 'won' ? '✓' : st === 'missed' ? '!' : '') + (i === cur ? '<span class="here">' + LANTERN + '</span>' : '') + '</button>';
    });
    h += '<span class="seg"></span><span class="lair" title="The ' + esc(biome.bossName) + "'s lair" + '">' + lairIcon(biome.id) + '</span>';
    $('#trail').innerHTML = h;
    Array.prototype.forEach.call(document.querySelectorAll('#trail .node'), function (b) {
      b.addEventListener('click', function () { open(+b.getAttribute('data-i')); });
    });
  }

  /* ---------- one question ---------- */
  function open(i) {
    if (!qs.length) { $('#read').innerHTML = '<div class="empty">No questions match. Try another difficulty.</div>'; $('#trail').innerHTML = ''; return; }
    cur = Math.max(0, Math.min(qs.length - 1, i));
    picked = null;
    var q = qs[cur], p = q.passage, prev = progress[q.id];
    var h = '';
    if (p) {
      h += '<div class="passage">' + (p.intro ? '<p class="intro">' + rich(p.intro) + '</p>' : '');
      (p.parts || []).forEach(function (pt) {
        if (pt.label) h += '<div class="partlabel">' + esc(pt.label) + '</div>';
        if (p.kind === 'notes') h += '<ul>' + pt.paragraphs.map(function (x) { return '<li>' + rich(x, true) + '</li>'; }).join('') + '</ul>';
        else h += pt.paragraphs.map(function (x) { return '<p>' + rich(x, true) + '</p>'; }).join('');
      });
      (p.figures || []).forEach(function (f) { h += figure(f); });
      h += '</div>';
    }
    h += '<div class="qbox"><div class="qmeta">Question ' + (cur + 1) + ' of ' + qs.length + ' · ' + esc(q.skill) + ' · ' + LV[q.difficulty] + '</div>' +
      '<div class="stem">' + rich(q.stem) + '</div>' + table(q.table) + figure(q.figure) + '</div><div class="answers">';
    if (q.type === 'mcq') {
      h += '<ol class="choices" aria-label="Answer choices">' + q.choices.map(function (c) {
        return '<li><button type="button" data-k="' + c.key + '"><span class="k">' + c.key + '</span><span>' + (c.figure ? figure(c.figure) : rich(c.text)) + '</span></button></li>';
      }).join('') + '</ol>';
    } else {
      h += '<div class="spr"><label for="spr-in">Your answer</label><input id="spr-in" inputmode="decimal" autocomplete="off" maxlength="6" spellcheck="false">' +
        '<p class="hint">A number, decimal or fraction, like 12, 0.75 or 3/4.</p></div>';
    }
    h += '<p class="msg" id="msg" role="status"></p><div class="acts"><button class="btn main" id="bCheck" type="button" disabled>Check</button>' +
      '<button class="btn" id="bRetry" type="button" hidden>Try again</button>' +
      '<button class="btn" id="bNext" type="button" hidden>' + (cur + 1 < qs.length ? 'Next ▶' : 'Back to 1 ▶') + '</button></div></div>';
    $('#read').innerHTML = h;
    $('#why').innerHTML = ''; $('#whybox').hidden = true;
    math($('#read'));
    wire(q);
    if (prev) showResult(q, prev.response, prev.result === 'won', false);
    trail();
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
    $('#bCheck').addEventListener('click', doCheck);
    $('#bNext').addEventListener('click', function () { open(cur + 1 < qs.length ? cur + 1 : 0); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $('#bRetry').addEventListener('click', function () { delete progress[q.id]; save(); open(cur); });
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
    showResult(q, picked, r.correct, true);
    trail(); bars();
    if (r.correct) ARENA.hit().then(bars); else ARENA.miss().then(pomOuch);
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
    $('#why').innerHTML = '<p class="verdict ' + (won ? 'won' : 'missed') + '">' +
      (won ? 'Correct! A hit on the ' + esc(biome.bossName) + '.' : 'Not this time. The answer is ' + esc(r.key) + '.') + '</p>' +
      (slip ? '<p class="slip">' + esc(slip) + '</p>' : '') +
      '<div class="body">' + String(q.explanation || '').split(/\n+/).map(function (x) { return '<p>' + rich(x) + '</p>'; }).join('') + '</div>';
    $('#whybox').hidden = false;
    math($('#why'));
    $('#bCheck').hidden = true;
    $('#bNext').hidden = false;
    $('#bRetry').hidden = won;
    if (fresh) setTimeout(function () { try { $('#bNext').focus({ preventScroll: true }); } catch (e) {} }, 0);
  }
  function save() { store('sq_clash_' + biome.id, progress); }

  /* ---------- calm options: focus and motion ---------- */
  function setFocus(on) {
    document.body.classList.toggle('focus', on);
    $('#bFocus').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('#bFocus').textContent = on ? 'Focus: on' : 'Focus';
    $('#mini').setAttribute('aria-hidden', on ? 'false' : 'true');
    store('sq_clash_focus', on);
  }
  var MOTIONS = ['full', 'calm', 'off'];
  function motionPref() {
    var m = null;
    try { m = window.localStorage.getItem('sq_motion'); } catch (e) {}
    if (MOTIONS.indexOf(m) >= 0) return m;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full';
  }
  function setMotion(m, save) {
    ARENA.setMotion(m);
    $('#bMotion').textContent = 'Motion: ' + m;
    if (save) try { window.localStorage.setItem('sq_motion', m); } catch (e) {}
  }

  /* ---------- header + keys ---------- */
  var sel = $('#biome');
  sel.innerHTML = BIOMES.map(function (b) { return '<option value="' + b.id + '" title="' + esc(b.domain) + '">' + esc(b.name) + '</option>'; }).join('');
  sel.value = biome.id;
  sel.addEventListener('change', function () {
    biome = BIOMES.filter(function (b) { return b.id === sel.value; })[0];
    history.replaceState(null, '', '?realm=' + biome.id);
    loadBiome();
  });
  $('#fDiff').addEventListener('change', function () { diff = this.value; loadBiome(); });
  $('#bReset').addEventListener('click', function () { progress = {}; save(); loadBiome(); });
  $('#bFocus').addEventListener('click', function () { setFocus(!document.body.classList.contains('focus')); });
  $('#bMotion').addEventListener('click', function () { setMotion(MOTIONS[(MOTIONS.indexOf(ARENA.motion) + 1) % MOTIONS.length], true); });
  $('#me-name').insertAdjacentHTML('afterbegin', LEAF);

  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    var q = qs[cur];
    if (!q) return;
    var k = e.key.toUpperCase();
    if (k === 'F') { setFocus(!document.body.classList.contains('focus')); e.preventDefault(); }
    else if (q.type === 'mcq' && /^[A-D]$/.test(k)) { pick(k); e.preventDefault(); }
    else if (e.key === 'Enter' && !(t && t.tagName === 'BUTTON')) {
      e.preventDefault();
      if (progress[q.id]) $('#bNext').click(); else doCheck();
    }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (cur + 1 < qs.length) open(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (cur > 0) open(cur - 1); }
  });

  /* KaTeX loads deferred; set math once it lands */
  window.addEventListener('load', function () { math($('#read')); math($('#why')); });

  window.__SQ_CLASH = { get state() { return { biome: biome.id, cur: cur, count: qs.length, progress: progress, pomHp: pomHp, ward: wardLeft(), focus: document.body.classList.contains('focus'), motion: ARENA.motion }; }, open: open, arena: ARENA };
  history.replaceState(null, '', '?realm=' + biome.id);
  setMotion(motionPref(), false);
  setFocus(!!store('sq_clash_focus'));
  ARENA.ready.then(loadBiome, loadBiome);
})();
