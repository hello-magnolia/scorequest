/* Verify the question bank itself (data/questions.js): every shipped question is a
   ScoreQuest Original with a unique id, a known domain and skill, exactly one correct
   choice (or accepted grid-in answers), an explanation, balanced math delimiters, no
   em dashes, no leftover source or calibration fields, and figures that validate and
   render. Pure Node, no browser: run alone or with the gate. */
const fs = require('fs');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  (' + d + ')' : '')); };

const src = fs.readFileSync('data/questions.js', 'utf8');
const window = {}; new Function('window', src)(window);
const bank = window.SQ_QUESTION_BANK || {};
const qs = bank.questions || [];
const SQFigures = require('./js/figures.js');

const DOMAINS = {
  math: ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'],
  rw: ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions']
};
const text = (q) => {
  const parts = [q.stem, q.explanation];
  (q.choices || []).forEach(c => parts.push(c.text));
  if (q.passage) { parts.push(q.passage.intro); (q.passage.parts || []).forEach(p => parts.push(p.label, ...(p.paragraphs || []))); }
  if (q.table) { parts.push(q.table.caption, ...(q.table.columns || [])); (q.table.rows || []).forEach(r => parts.push(...r)); }
  return parts.filter(Boolean).join('\n');
};
const balanced = (s) => {
  const open = (s.match(/\\\(/g) || []).length, close = (s.match(/\\\)/g) || []).length;
  const dopen = (s.match(/\\\[/g) || []).length, dclose = (s.match(/\\\]/g) || []).length;
  return open === close && dopen === dclose;
};
const bad = (name, list) => check(name, list.length === 0, list.length ? list.slice(0, 5).join(', ') + (list.length > 5 ? ' +' + (list.length - 5) : '') : '');

check('Bank present with meta', !!bank.meta && qs.length > 0, qs.length + ' questions, exported ' + (bank.meta && bank.meta.exported));
check('Enough questions to launch (150+)', qs.length >= 150, String(qs.length));
check('Source is ScoreQuest Originals only', bank.meta && /Originals/.test(bank.meta.source) && qs.every(q => /^SQ-[A-Z]{3}-\d{3}$/.test(q.id)));
bad('Unique ids', qs.map(q => q.id).filter((id, i, a) => a.indexOf(id) !== i));
bad('Section and domain agree', qs.filter(q => !(DOMAINS[q.section] || []).includes(q.domain)).map(q => q.id));
bad('Skill named', qs.filter(q => !q.skill || !q.skill.trim()).map(q => q.id));
bad('Difficulty is 1, 2 or 3', qs.filter(q => ![1, 2, 3].includes(q.difficulty)).map(q => q.id));
bad('Type is mcq or spr', qs.filter(q => q.type !== 'mcq' && q.type !== 'spr').map(q => q.id));
bad('Stem present', qs.filter(q => !q.stem || !q.stem.trim()).map(q => q.id));
bad('Explanation present (40+ chars)', qs.filter(q => !q.explanation || q.explanation.trim().length < 40).map(q => q.id));
const mcq = qs.filter(q => q.type === 'mcq'), spr = qs.filter(q => q.type === 'spr');
bad('MCQ has four choices A-D', mcq.filter(q => !q.choices || q.choices.length !== 4 || q.choices.map(c => c.key).join('') !== 'ABCD').map(q => q.id));
bad('MCQ has exactly one correct choice', mcq.filter(q => (q.choices || []).filter(c => c.correct).length !== 1).map(q => q.id));
bad('MCQ choices non-empty (text or figure) and distinct', mcq.filter(q => { const cs = q.choices || []; if (cs.some(c => !(c.text || '').trim() && !c.figure)) return true; const t = cs.filter(c => !c.figure).map(c => c.text.trim()); return new Set(t).size !== t.length; }).map(q => q.id));
bad('Wrong choices carry a trap tag', mcq.filter(q => (q.choices || []).some(c => !c.correct && !c.trap)).map(q => q.id));
bad('Grid-in lists accepted answers', spr.filter(q => !Array.isArray(q.accepted) || !q.accepted.length).map(q => q.id));
bad('Grid-in answers are valid SAT entries', spr.filter(q => (q.accepted || []).some(a => !/^-?(\d+\.?\d*|\.\d+|\d+\/\d+)$/.test(String(a)) || String(a).length > (String(a)[0] === '-' ? 6 : 5))).map(q => q.id));
bad('Math delimiters balanced', qs.filter(q => !balanced(text(q))).map(q => q.id));
bad('No bare $ math (use \\( \\))', qs.filter(q => /(^|[^\\])\$[^$]*\$/.test(text(q).replace(/\\\$/g, ''))).map(q => q.id));
bad('No em dashes in copy', qs.filter(q => /—/.test(text(q))).map(q => q.id));
bad('No leftover source, scan or review fields', qs.filter(q => ['source', 'provenance', 'scans', 'review_flags', 'review_note', 'qb_id', 'verify'].some(k => k in q)).map(q => q.id));
bad('Passage spans close', qs.filter(q => { const t = text(q); return (t.match(/\{s\d+\}/g) || []).length !== (t.match(/\{\/s\d+\}/g) || []).length; }).map(q => q.id));
bad('R&W questions carry a passage', qs.filter(q => q.section === 'rw' && !q.passage).map(q => q.id));

/* figures: every spec validates and renders to an SVG */
const figs = [];
qs.forEach(q => {
  if (q.figure) figs.push({ id: q.id, f: q.figure });
  (q.choices || []).forEach(c => { if (c.figure) figs.push({ id: q.id + ':' + c.key, f: c.figure }); });
  ((q.passage && q.passage.figures) || []).forEach((f, i) => figs.push({ id: q.id + ':p' + i, f }));
});
const figProblems = [], figRender = [];
figs.forEach(({ id, f }) => {
  const spec = f.spec || f;
  if (!spec.kind) { figProblems.push(id + ' (no kind)'); return; }
  let probs = [];
  try { probs = SQFigures.validate(spec) || []; } catch (e) { probs = [String(e)]; }
  if (probs.length) figProblems.push(id + ' ' + probs[0]);
  try { const out = SQFigures.render(spec); if (!/^<(svg|table)/.test(out)) figRender.push(id); } catch (e) { figRender.push(id); }
});
check('Figures present', figs.length > 0, figs.length + ' figures');
bad('Figure specs validate', figProblems);
bad('Figure specs render (SVG, or an HTML table for table figures)', figRender);

/* coverage: every domain has enough questions for a clash ward of 3+ and some spread */
const byDomain = {};
qs.forEach(q => { byDomain[q.domain] = byDomain[q.domain] || []; byDomain[q.domain].push(q); });
bad('Every SAT domain has 10+ questions', Object.values(DOMAINS).flat().filter(dn => !(byDomain[dn] && byDomain[dn].length >= 10)));
bad('Every domain spans all three difficulties', Object.keys(byDomain).filter(dn => new Set(byDomain[dn].map(q => q.difficulty)).size < 3));

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
