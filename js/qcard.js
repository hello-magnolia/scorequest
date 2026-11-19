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
    /* the meta row carries only the source chip and the report flag: position, skill and
       tier already sit in the page header (Magnolia: the long label was excessive) */
    var h = '<div class="qbox"><div class="qmeta">' + (meta != null ? meta : '') + sourceChip(q) + flagButton(q) + '</div>' +
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
    return '<section class="whybox" id="whybox" aria-live="polite" hidden><div id="why"></div></section>';
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
    /* the recap already says hit or miss and names the answer, so the panel is just the why */
    if (why) {
      why.innerHTML = (opts.slip ? '<p class="slip">' + esc(opts.slip) + '</p>' : '') +
        '<div class="body">' + String(r.explanation || '').split(/\n+/).map(function (x) { return '<p>' + rich(x) + '</p>'; }).join('') + '</div>';
      math(why);
    }
    recap.classList.add(r.correct ? 'won' : 'missed');
    recap.hidden = true;
    card.classList.remove('is-entering'); card.classList.remove('show-choices');
    /* the marked grid holds while the fight plays out (the hit or the strike), then folds */
    var fold = function () {
      if (!recap.isConnected) return;
      recap.hidden = false;
      if (box) box.hidden = false;
      card.classList.add('is-reviewed');
    };
    var wait = motionOff() ? 0 : (opts.delay != null ? opts.delay : reveal.DELAY);
    if (wait) setTimeout(fold, wait); else fold();
  }
  /* enter(root): the arrival of a freshly rendered card, in order: the passage types out
     (fast, all paragraphs as one stream, capped ~1s), then the stem types (capped ~0.9s),
     then the answers rise in one by one, then Check. Plain text types letter by letter on
     requestAnimationFrame with heights reserved first so nothing below jumps; text holding
     math or markup fades in instead. The timings are handed to the CSS as --q-at / --a-at.
     Skipped under reduced motion or sq_motion 'off'. Cancels any arrival in flight. */
  var running = null;
  function motionOff() {
    var m = null; try { m = window.localStorage.getItem('sq_motion'); } catch (e) {}
    if (m === 'off') return true;
    if (m === 'full' || m === 'calm') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function plain(el) { return !!el && !el.querySelector('*') && el.textContent.trim().length > 0; }
  /* type the blocks (elements holding plain text) in sequence over about dur ms, old
     RPG style: the text advances on a fixed TICK (not per frame), a block cursor sits at the
     end, and a soft blip sounds on every other tick (SQSfx.textBlip). Returns cancel(). */
  var TICK = 30;
  function typeBlocks(blocks, dur, after, onDone) {
    var texts = blocks.map(function (b) { return b.textContent; }), total = texts.join('').length || 1;
    var ticks = Math.max(1, Math.round(dur / TICK)), per = Math.max(1, Math.ceil(total / ticks));
    blocks.forEach(function (b) { b.style.minHeight = b.getBoundingClientRect().height + 'px'; b.textContent = ''; });
    var timer = 0, done = false, n = 0, tick = 0;
    var finish = function () {
      if (done) return; done = true; clearTimeout(timer);
      blocks.forEach(function (b, i) { b.textContent = texts[i]; b.style.minHeight = ''; b.classList.remove('is-typing'); });
      if (onDone) onDone();
    };
    var step = function () {
      n = Math.min(total, n + per); tick++;
      var left = n, typingSet = false, grew = false;
      blocks.forEach(function (b, i) {
        var take = Math.max(0, Math.min(texts[i].length, left)); left -= take;
        if (take !== b.textContent.length) { b.textContent = texts[i].slice(0, take); grew = true; }
        var active = !typingSet && take < texts[i].length; if (active) typingSet = true;
        b.classList.toggle('is-typing', active);
      });
      if (grew && tick % 2 === 0 && window.SQSfx && window.SQSfx.textBlip) { try { window.SQSfx.textBlip(); } catch (e) {} }
      if (n < total) timer = setTimeout(step, TICK); else finish();
    };
    timer = setTimeout(step, after || 0);
    return function () { finish(); };
  }
  function enter(root) {
    if (!root) return;
    if (running) { running(); running = null; }
    if (motionOff()) return;
    var card = root.closest ? (root.closest('.card') || root) : root;
    card.classList.remove('is-entering'); void card.offsetWidth; card.classList.add('is-entering');
    var paras = Array.prototype.slice.call(root.querySelectorAll('.passage p, .passage li')).filter(plain);
    var stem = root.querySelector('.stem');
    var qAt = 0, stemDur = 0, cancels = [];
    if (paras.length) qAt = Math.min(1000, 150 + paras.reduce(function (a, b) { return a + b.textContent.length; }, 0) * 2.2);
    else if (root.querySelector('.passage')) qAt = 450;
    if (plain(stem)) stemDur = Math.min(900, 100 + stem.textContent.length * 8);
    else if (stem) { stemDur = 500; stem.classList.add('is-wipe'); }
    card.style.setProperty('--q-at', qAt + 'ms');
    card.style.setProperty('--a-at', (qAt + stemDur) + 'ms');
    if (paras.length) cancels.push(typeBlocks(paras, qAt, 0));
    if (plain(stem)) cancels.push(typeBlocks([stem], stemDur, qAt));
    running = function () { cancels.forEach(function (c) { c(); }); };
  }
  reveal.DELAY = 1300;   /* ms the marked grid holds before the recap and explanation take over */

  /* ---------- report a problem ----------
     A small flag on every question (clash, overlay, practice). It opens a one-line form
     under the question: four quick reasons and an optional note. Reports go to the
     Supabase question_reports table through SQAuth.reportQuestion when the player is signed
     in; every report is also kept in localStorage sq_reports and the unsent ones are
     flushed on the next page that calls bindReports while signed in (three tries each; an
     official item has no row in questions, so its report stays local for the review pass). */
  var REASONS = ['Typo', 'Answer seems wrong', 'Confusing', 'Something else'];
  var RKEY = 'sq_reports';
  function flagButton(q) {
    return '<button type="button" class="qflag" data-report="' + esc(q.id) + '" aria-label="Report a problem with this question" title="Report a problem">\u2691</button>';
  }
  function reports() { try { return JSON.parse(window.localStorage.getItem(RKEY) || '[]'); } catch (e) { return []; } }
  function saveReports(list) { try { window.localStorage.setItem(RKEY, JSON.stringify(list.slice(-200))); } catch (e) {} }
  function send(rep) {
    var A = window.SQAuth;
    if (!A || !A.reportQuestion) return Promise.resolve(false);
    return A.reportQuestion(rep.question_id, rep.page, rep.note).then(function (ok) { return !!ok; }, function () { return false; });
  }
  function flushReports() {
    var list = reports(), pending = list.filter(function (r) { return !r.sent && (r.tries || 0) < 3; });
    if (!pending.length) return Promise.resolve(0);
    return Promise.all(pending.map(function (r) {
      return send(r).then(function (ok) { r.tries = (r.tries || 0) + 1; if (ok) r.sent = true; return ok; });
    })).then(function (oks) { saveReports(list); return oks.filter(Boolean).length; });
  }
  function fileReport(qid, page, reason, note) {
    var rep = { question_id: qid, page: page, note: (reason + (note ? ': ' + note : '')).slice(0, 400), at: new Date().toISOString(), sent: false, tries: 0 };
    var list = reports(); list.push(rep); saveReports(list);
    return send(rep).then(function (ok) { rep.tries = 1; rep.sent = ok; saveReports(list); return ok; });
  }
  function openReport(btn, page) {
    var meta = btn.closest('.qmeta, .pr-meta') || btn.parentNode;
    var host = meta.parentNode;
    var old = host.querySelector('.qreport'); if (old) { old.remove(); btn.classList.remove('is-open'); return; }
    btn.classList.add('is-open');
    var f = document.createElement('form'); f.className = 'qreport'; f.setAttribute('aria-label', 'Report a problem');
    f.innerHTML = '<p class="qreport-lead">Something off with this question? Tell us and we will take a look.</p>' +
      '<div class="qreport-reasons">' + REASONS.map(function (r, i) { return '<label><input type="radio" name="reason" value="' + esc(r) + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(r) + '</span></label>'; }).join('') + '</div>' +
      '<div class="qreport-row"><input type="text" name="note" maxlength="200" placeholder="Anything else (optional)" aria-label="Details (optional)">' +
      '<button type="submit" class="btn">Send</button><button type="button" class="btn ghost" data-cancel>Cancel</button></div>';
    meta.insertAdjacentElement('afterend', f);
    f.querySelector('[data-cancel]').addEventListener('click', function () { f.remove(); btn.classList.remove('is-open'); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var reason = (f.querySelector('input[name=reason]:checked') || {}).value || REASONS[0];
      var note = f.querySelector('input[name=note]').value.trim();
      f.querySelector('[type=submit]').disabled = true;
      fileReport(btn.getAttribute('data-report'), page, reason, note).then(function () {
        f.innerHTML = '<p class="qreport-lead qreport-done">Thanks, noted. Carry on!</p>';
        btn.classList.remove('is-open'); btn.classList.add('is-sent'); btn.setAttribute('title', 'Reported, thanks');
        setTimeout(function () { if (f.isConnected) f.remove(); }, 2200);
      });
    });
    f.querySelector('input[name=note]').focus();
  }
  function bindReports(root, page) {
    if (!root || root.__sqReports) return;
    root.__sqReports = true;
    root.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.qflag[data-report]');
      if (!b || !root.contains(b)) return;
      e.preventDefault(); openReport(b, page);
    });
    if (window.SQAuth && window.SQAuth.onChange) window.SQAuth.onChange(function (st) { if (st && st.user && !st.demo) flushReports(); });
  }
  window.SQCard = { esc: esc, LV: LV, math: math, rich: rich, figure: figure, table: table, value: value, gridIn: gridIn, check: check,
    px: px, LANTERN: LANTERN, LEAF: LEAF, lairIcon: lairIcon, passageHTML: passageHTML, questionHTML: questionHTML, sourceChip: sourceChip,
    sideVisuals: sideVisuals, whyboxHTML: whyboxHTML, reveal: reveal, enter: enter,
    flagButton: flagButton, bindReports: bindReports, fileReport: fileReport, flushReports: flushReports, reports: reports };
})();
