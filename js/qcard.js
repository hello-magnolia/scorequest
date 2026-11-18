/* ============================================================
   ScoreQuest: question card helpers, shared by clash.html and the
   realm overlay (js/clash-overlay.js).
   SQCard.math(el)        typeset \( \) with KaTeX if loaded
   SQCard.rich(s, pass)   text -> html: math kept, {s1} underline, *em*
   SQCard.figure(f)       figure spec -> <figure> via SQFigures
   SQCard.table(t)        table spec -> <table class="data">
   SQCard.gridIn(t)       '' or the rule a grid-in entry breaks
   SQCard.questionHTML(q, n, total)   the stem, figure/table and choices
   SQCard.passageHTML(q)              the passage block, or ''
   SQCard.px(...), LANTERN, LEAF, lairIcon(id)   tiny pixel art
   ============================================================ */
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var LV = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
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
    if (window.SQQuestions && window.SQQuestions.check) {
      var r = window.SQQuestions.check(q, resp);
      return { correct: !!r.correct, key: q.type === 'mcq' ? r.key : (q.accepted || [])[0] };
    }
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
  function passageHTML(q) {
    var p = q.passage;
    if (!p) return '';
    var h = '<div class="passage">' + (p.intro ? '<p class="intro">' + rich(p.intro) + '</p>' : '');
    (p.parts || []).forEach(function (pt) {
      if (pt.label) h += '<div class="partlabel">' + esc(pt.label) + '</div>';
      if (p.kind === 'notes') h += '<ul>' + pt.paragraphs.map(function (x) { return '<li>' + rich(x, true) + '</li>'; }).join('') + '</ul>';
      else h += pt.paragraphs.map(function (x) { return '<p>' + rich(x, true) + '</p>'; }).join('');
    });
    (p.figures || []).forEach(function (f) { h += figure(f); });
    return h + '</div>';
  }
  /* where a question comes from: a ScoreQuest original or an official SAT item */
  function sourceChip(q) {
    var label = (window.SQQuestions && window.SQQuestions.sourceLabel) ? window.SQQuestions.sourceLabel(q) : ((q && q.source_label) || 'ScoreQuest original');
    var official = !!(q && q.source && q.source !== 'original');
    return '<span class="qsrc' + (official ? ' official' : '') + '" title="' + (official ? 'An official College Board question' : 'Written for ScoreQuest') + '">' + esc(label) + '</span>';
  }
  function questionHTML(q, n, total, meta) {
    var h = '<div class="qbox"><div class="qmeta">' + (meta != null ? meta : 'Question ' + n + ' of ' + total + ' \u00b7 ' + esc(q.skill) + ' \u00b7 ' + LV[q.difficulty]) + sourceChip(q) + '</div>' +
      '<div class="stem">' + rich(q.stem) + '</div>' + table(q.table) + figure(q.figure) + '</div><div class="answers">';
    if (q.type === 'mcq') {
      h += '<ol class="choices" aria-label="Answer choices">' + q.choices.map(function (c) {
        return '<li><button type="button" data-k="' + c.key + '"><span class="k">' + c.key + '</span><span>' + (c.figure ? figure(c.figure) : rich(c.text)) + '</span></button></li>';
      }).join('') + '</ol>';
    } else {
      h += '<div class="spr"><label for="spr-in">Your answer</label><input id="spr-in" inputmode="decimal" autocomplete="off" maxlength="6" spellcheck="false">' +
        '<p class="hint">A number, decimal or fraction, like 12, 0.75 or 3/4.</p></div>';
    }
    return h;   /* caller closes .answers after its buttons */
  }
  /* sideVisuals: once a card is rendered, move its tables and figures (from the passage or
     the question box) into a side column next to the text, so a tall table no longer pushes
     the answers off the screen. Returns true when it built the grid; the CSS (.read-grid)
     folds it back to one column on narrow windows. */
  function sideVisuals(root) {
    if (!root || root.querySelector('.read-grid')) return false;
    var vis = Array.prototype.filter.call(root.querySelectorAll('.passage .fig-built, .passage table.data, .qbox .fig-built, .qbox table.data'),
      function (v) { return !(v.parentElement && v.parentElement.closest('.fig-built, table.data')); });   /* a table inside a figure moves with its figure */
    var qbox = root.querySelector('.qbox');
    if (!vis.length || !qbox) return false;
    var passage = root.querySelector('.passage');
    var grid = document.createElement('div'); grid.className = 'read-grid';
    var text = document.createElement('div'); text.className = 'read-text';
    var aside = document.createElement('aside'); aside.className = 'read-vis';
    root.insertBefore(grid, passage || qbox);
    if (passage) text.appendChild(passage);
    text.appendChild(qbox);
    grid.appendChild(text); grid.appendChild(aside);
    Array.prototype.forEach.call(vis, function (v) { aside.appendChild(v); });
    root.classList.add('has-vis');
    return true;
  }
  /* whyboxHTML: the explanation panel lives INSIDE the card, right where the answers were,
     so it never lands under the fold (Magnolia, Nov 18). reveal(root, q, resp, r) collapses
     the choice grid into a one-line recap (your pick, the answer, a "Show choices" toggle)
     and fills the panel. */
  function whyboxHTML() {
    return '<section class="whybox" id="whybox" aria-live="polite" hidden><h3>Explanation</h3><div id="why"></div></section>';
  }
  function reveal(root, q, resp, r, opts) {
    opts = opts || {};
    var card = root.closest ? (root.closest('.card') || root) : root;
    var choices = root.querySelector('.choices'), spr = root.querySelector('.spr');
    var old = root.querySelector('.recap'); if (old) old.remove();
    var recap = document.createElement('div'); recap.className = 'recap';
    var keyText = '';
    if (q.type === 'mcq') {
      var kc = (q.choices || []).filter(function (c) { return c.key === r.key; })[0];
      keyText = kc && !kc.figure ? rich(kc.text) : '';
      recap.innerHTML = '<span class="pick ' + (r.correct ? 'good' : 'bad') + '"><span class="lbl">You chose</span><span class="k">' + esc(resp) + '</span></span>' +
        (r.correct ? '' : '<span class="pick good"><span class="lbl">Answer</span><span class="k">' + esc(r.key) + '</span></span>') +
        (keyText ? '<span class="keytext">' + keyText + '</span>' : '') +
        '<button type="button" class="linkish" data-toggle-choices>Show choices</button>';
    } else {
      recap.innerHTML = '<span class="pick ' + (r.correct ? 'good' : 'bad') + '"><span class="lbl">You answered</span><span class="k wide">' + esc(resp) + '</span></span>' +
        (r.correct ? '' : '<span class="pick good"><span class="lbl">Answer</span><span class="k wide">' + esc(r.key) + '</span></span>');
    }
    var anchor = choices || spr;
    if (anchor) anchor.parentNode.insertBefore(recap, anchor);
    var tog = recap.querySelector('[data-toggle-choices]');
    if (tog) tog.addEventListener('click', function () {
      var on = card.classList.toggle('show-choices'); tog.textContent = on ? 'Hide choices' : 'Show choices';
    });
    var why = root.querySelector('#why'), box = root.querySelector('#whybox');
    if (why) {
      why.innerHTML = '<p class="verdict ' + (r.correct ? 'won' : 'missed') + '">' + (opts.verdict || (r.correct ? 'Correct! A hit.' : 'Not this time. The answer is ' + esc(r.key) + '.')) + '</p>' +
        (opts.slip ? '<p class="slip">' + esc(opts.slip) + '</p>' : '') +
        '<div class="body">' + String(r.explanation || '').split(/\n+/).map(function (x) { return '<p>' + rich(x) + '</p>'; }).join('') + '</div>';
      math(why);
    }
    if (box) box.hidden = false;
    card.classList.add('is-reviewed'); card.classList.remove('show-choices');
  }
  /* enter(root): a light arrival for a freshly rendered card. The passage, question box and
     answers fade and rise in (CSS, transform + opacity only, staggered), and the stem is
     typed out: plain-text stems letter by letter on requestAnimationFrame (height reserved
     first, so nothing below jumps), stems holding math or markup get a left-to-right wipe
     instead. Skipped under reduced motion or sq_motion 'off'. Cancels any typing in flight. */
  var typing = null;
  function motionOff() {
    var m = null; try { m = window.localStorage.getItem('sq_motion'); } catch (e) {}
    if (m === 'off') return true;
    if (m === 'full' || m === 'calm') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function enter(root) {
    if (!root) return;
    if (typing) { typing.cancel(); typing = null; }
    if (motionOff()) return;
    root.classList.remove('is-entering'); void root.offsetWidth; root.classList.add('is-entering');
    var stem = root.querySelector('.stem');
    if (!stem) return;
    if (stem.querySelector('*') || !stem.textContent.trim()) { stem.classList.add('is-wipe'); return; }
    var full = stem.textContent, h = stem.getBoundingClientRect().height;
    var dur = Math.min(1100, 120 + full.length * 9), t0 = null, raf = 0;
    stem.style.minHeight = h + 'px'; stem.classList.add('is-typing'); stem.textContent = '';
    var finish = function () { stem.textContent = full; stem.style.minHeight = ''; stem.classList.remove('is-typing'); typing = null; };
    var step = function (t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      stem.textContent = full.slice(0, Math.ceil(full.length * k));
      if (k < 1) raf = requestAnimationFrame(step); else finish();
    };
    raf = requestAnimationFrame(step);
    typing = { cancel: function () { cancelAnimationFrame(raf); finish(); } };
  }
  window.SQCard = { esc: esc, LV: LV, math: math, rich: rich, figure: figure, table: table, value: value, gridIn: gridIn, check: check,
    px: px, LANTERN: LANTERN, LEAF: LEAF, lairIcon: lairIcon, passageHTML: passageHTML, questionHTML: questionHTML, sourceChip: sourceChip,
    sideVisuals: sideVisuals, whyboxHTML: whyboxHTML, reveal: reveal, enter: enter };
})();
