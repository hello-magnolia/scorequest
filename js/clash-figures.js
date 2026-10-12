/*
 * ScoreQuest figure renderer (v0.1)
 *
 * Turns a small JSON description of a figure into SVG (or an HTML table), so
 * figures are rebuilt from data instead of shipped as images. Works in the
 * browser (window.SQFigures) and in Node (require), with no dependencies.
 *
 *   SQFigures.render(spec)    -> HTML string (an <svg> or a <table>)
 *   SQFigures.describe(spec)  -> plain-text alt text generated from the spec
 *   SQFigures.validate(spec)  -> array of problems (empty when the spec is fine)
 *
 * Kinds: graph (coordinate plane: functions, lines, points, scatterplots),
 *        bar, linechart, boxplot, geometry, table.
 * Colors come from CSS variables (--fig-ink, --fig-grid, --fig-fill-1/2,
 * --fig-bg, --fig-font), so figures follow the page theme, including dark mode.
 * Spec reference: FIGURES.md next to this file's project root.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SQFigures = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ------------------------------------------------------------------ utils
  const INK = "var(--fig-ink, currentColor)";
  const GRID = "var(--fig-grid, #c8c5bd)";
  const BG = "var(--fig-bg, #fff)";
  const FILL = ["var(--fig-fill-1, #c4c4c4)", "var(--fig-fill-2, #5a5a5a)", "var(--fig-fill-3, #8f8f8f)"];
  const FONT = "var(--fig-font, 'Iowan Old Style', Palatino, Georgia, serif)";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const r2 = (v) => Math.round(v * 100) / 100;
  const num = (v) => (v < 0 ? "−" + fmt(-v) : fmt(v));          // true minus sign, like the SAT
  function fmt(v) { return Number.isInteger(v) ? String(v) : String(r2(v)); }
  function steps(min, max, step) {
    const out = [], eps = step * 1e-6;
    for (let v = Math.ceil((min - eps) / step) * step; v <= max + eps; v += step) out.push(Math.abs(v) < eps ? 0 : r2(v));
    return out;
  }
  // *italic* and plain runs inside one SVG text element
  function tspans(text) {
    return String(text).split(/(\*[^*]+\*)/).filter(Boolean)
      .map((t) => t[0] === "*" && t.length > 2 ? `<tspan font-style="italic">${esc(t.slice(1, -1))}</tspan>` : esc(t)).join("");
  }
  function txt(x, y, text, o = {}) {
    const a = o.anchor || "middle", size = o.size || 13, it = o.italic ? ' font-style="italic"' : "", w = o.bold ? ' font-weight="700"' : "";
    return `<text x="${r2(x)}" y="${r2(y)}" text-anchor="${a}" font-size="${size}"${it}${w} fill="${INK}">${tspans(text)}</text>`;
  }
  const isVar = (s) => /^[a-zA-Z]$/.test(String(s));                  // single-letter labels are italic (x, y, O)
  function svg(w, h, body, alt) {
    return `<svg class="sq-fig" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(w)} ${r2(h)}" width="${r2(w)}" style="max-width:100%;height:auto;font-family:${FONT}" role="img" aria-label="${esc(alt)}">${body}</svg>`;
  }
  function arrowDefs(id) {
    return `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="${INK}"/></marker></defs>`;
  }
  let uid = 0;
  const nextId = (p) => `${p}${++uid}`;

  // ------------------------------------------------- expression evaluation
  // A small, safe parser for function strings such as "2^(-x)+1", "10*2^(x/12)",
  // "-(x+3)^2+4", "1.5x - 8", "sqrt(x)", "abs(x-1)". Implicit multiplication is
  // allowed ("2x", "3(x+1)"). Returns a function of x.
  function compile(src) {
    const s = String(src).replace(/\s+/g, "").replace(/−/g, "-");
    let i = 0;
    const FN = { sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan, ln: Math.log, log: Math.log10, exp: Math.exp };
    const peek = () => s[i];
    function expr() { let f = term(); while (peek() === "+" || peek() === "-") { const op = s[i++], a = f, b = term(); f = op === "+" ? (x) => a(x) + b(x) : (x) => a(x) - b(x); } return f; }
    function term() {
      let f = unary();
      for (;;) {
        const c = peek();
        if (c === "*" || c === "/") { i++; const a = f, b = unary(); f = c === "*" ? (x) => a(x) * b(x) : (x) => a(x) / b(x); }
        else if (c && /[a-z(0-9.]/i.test(c)) { const a = f, b = unary(); f = (x) => a(x) * b(x); } // implicit multiplication
        else return f;
      }
    }
    function unary() { if (peek() === "-") { i++; const a = unary(); return (x) => -a(x); } if (peek() === "+") { i++; return unary(); } return power(); }
    function power() { const base = atom(); if (peek() === "^") { i++; const e = unary(); return (x) => Math.pow(base(x), e(x)); } return base; }
    function atom() {
      const c = peek();
      if (c === "(") { i++; const f = expr(); if (s[i++] !== ")") throw new Error("missing ) in " + src); return f; }
      const n = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
      if (n) { i += n[0].length; const v = parseFloat(n[0]); return () => v; }
      const w = s.slice(i).match(/^[a-z]+/i);
      if (w) {
        const name = w[0];
        if (FN[name.toLowerCase()] && s[i + name.length] === "(") { i += name.length; const g = FN[name.toLowerCase()], a = atom(); return (x) => g(a(x)); }
        if (name === "pi") { i += 2; return () => Math.PI; }
        if (name === "e") { i += 1; return () => Math.E; }
        if (name[0] === "x") { i += 1; return (x) => x; }
        throw new Error(`unknown name "${name}" in ${src}`);
      }
      throw new Error(`unexpected "${c || "end"}" in ${src}`);
    }
    const f = expr();
    if (i < s.length) throw new Error(`unexpected "${s[i]}" in ${src}`);
    return f;
  }

  // ------------------------------------------------------------- graph
  function graph(spec) {
    const X = spec.x, Y = spec.y;
    const titleLines = [].concat(spec.title || []);
    const pad = { l: 30 + (Y.title ? 22 : 0), r: spec.arrows === false ? 14 : 30, t: (spec.arrows === false ? 14 : 28) + titleLines.length * 17, b: 22 + (X.title ? 22 : 0) };
    let pw, ph;
    if (spec.size) { pw = spec.size[0] - pad.l - pad.r; ph = spec.size[1] - pad.t - pad.b; }
    else {
      pw = (spec.width || 280);
      ph = Math.min(pw * 1.6, Math.max(pw * 0.4, pw * (Y.max - Y.min) / (X.max - X.min)));
    }
    const W = pw + pad.l + pad.r, H = ph + pad.t + pad.b;
    const px = (x) => pad.l + (x - X.min) / (X.max - X.min) * pw;
    const py = (y) => pad.t + (Y.max - y) / (Y.max - Y.min) * ph;
    const clip = nextId("c"), arrow = nextId("a");
    const ox = Math.min(Math.max(0, X.min), X.max), oy = Math.min(Math.max(0, Y.min), Y.max);
    let b = arrowDefs(arrow) + `<defs><clipPath id="${clip}"><rect x="${px(X.min)}" y="${py(Y.max)}" width="${pw}" height="${ph}"/></clipPath></defs>`;
    // grid
    if (X.grid) steps(X.min, X.max, X.grid).forEach((v) => (b += `<line x1="${r2(px(v))}" y1="${r2(py(Y.min))}" x2="${r2(px(v))}" y2="${r2(py(Y.max))}" stroke="${GRID}" stroke-width="0.8"/>`));
    if (Y.grid) steps(Y.min, Y.max, Y.grid).forEach((v) => (b += `<line x1="${r2(px(X.min))}" y1="${r2(py(v))}" x2="${r2(px(X.max))}" y2="${r2(py(v))}" stroke="${GRID}" stroke-width="0.8"/>`));
    // axes, with arrows on the positive ends (SAT style)
    const arrows = spec.arrows !== false;
    const xEnd = px(X.max) + (arrows ? 10 : 0), yEnd = py(Y.max) - (arrows ? 10 : 0);
    b += `<line x1="${r2(px(X.min))}" y1="${r2(py(oy))}" x2="${r2(xEnd)}" y2="${r2(py(oy))}" stroke="${INK}" stroke-width="1.2"${arrows ? ` marker-end="url(#${arrow})"` : ""}/>`;
    b += `<line x1="${r2(px(ox))}" y1="${r2(py(Y.min))}" x2="${r2(px(ox))}" y2="${r2(yEnd)}" stroke="${INK}" stroke-width="1.2"${arrows ? ` marker-end="url(#${arrow})"` : ""}/>`;
    if (X.label !== null) b += txt(xEnd + 5, py(oy) + 4, X.label || "x", { anchor: "start", italic: true });
    if (Y.label !== null) b += txt(px(ox), yEnd - 5, Y.label || "y", { italic: true });
    // tick labels
    const lab = (v) => (Array.isArray(v) ? v : [v, num(v)]);
    (X.labels || []).map(lab).forEach(([v, t]) => {
      b += `<line x1="${r2(px(v))}" y1="${r2(py(oy) - 3)}" x2="${r2(px(v))}" y2="${r2(py(oy) + 3)}" stroke="${INK}"/>`;
      b += txt(px(v), py(oy) + 15, t, { size: 12 });
    });
    (Y.labels || []).map(lab).forEach(([v, t]) => {
      b += `<line x1="${r2(px(ox) - 3)}" y1="${r2(py(v))}" x2="${r2(px(ox) + 3)}" y2="${r2(py(v))}" stroke="${INK}"/>`;
      b += txt(px(ox) - 6, py(v) + 4, t, { size: 12, anchor: "end" });
    });
    const showO = spec.origin !== undefined ? spec.origin : (ox === 0 && oy === 0);
    if (showO) b += txt(px(0) - 5, py(0) + 14, "O", { anchor: "end", italic: true });
    titleLines.forEach((t, k) => (b += txt(pad.l + pw / 2, 14 + k * 17, t, { size: 13 })));   // chart title, above the plot
    if (X.title) b += txt(pad.l + pw / 2, H - 6, X.title, { size: 13 });
    if (Y.title) b += `<g transform="translate(14 ${r2(pad.t + ph / 2)}) rotate(-90)">${txt(0, 0, Y.title, { size: 13 })}</g>`;
    // elements
    let els = "";
    (spec.elements || []).forEach((e) => {
      const dash = e.dash ? ' stroke-dasharray="6 4"' : "";
      const sw = e.width || 1.8;
      if (e.type === "function") {
        const f = compile(e.fn), [a, z] = e.domain || [X.min, X.max];
        const n = 400, span = (Y.max - Y.min) * 4;
        let d = "", pen = false;
        for (let k = 0; k <= n; k++) {
          const x = a + (z - a) * k / n, y = f(x);
          if (!isFinite(y) || y > Y.max + span || y < Y.min - span) { pen = false; continue; }
          d += (pen ? "L" : "M") + r2(px(x)) + "," + r2(py(y)); pen = true;
        }
        els += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${sw}"${dash}/>`;
      } else if (e.type === "polyline" || e.type === "line") {
        els += `<polyline points="${e.points.map(([x, y]) => r2(px(x)) + "," + r2(py(y))).join(" ")}" fill="none" stroke="${INK}" stroke-width="${sw}"${dash} stroke-linejoin="round"/>`;
      } else if (e.type === "points") {
        const rr = e.r || 3.2;
        e.data.forEach(([x, y]) => (els += `<circle cx="${r2(px(x))}" cy="${r2(py(y))}" r="${rr}" fill="${e.open ? BG : INK}" stroke="${INK}" stroke-width="1.2"/>`));
      } else if (e.type === "region") {
        els += `<polygon points="${e.points.map(([x, y]) => r2(px(x)) + "," + r2(py(y))).join(" ")}" fill="${INK}" fill-opacity="0.12" stroke="none"/>`;
      }
    });
    b += `<g clip-path="url(#${clip})">${els}</g>`;
    // labels go on top and are not clipped
    (spec.elements || []).filter((e) => e.type === "label").forEach((e) => {
      b += txt(px(e.at[0]), py(e.at[1]), e.text, { anchor: e.anchor || "middle", italic: e.italic, size: e.size || 13 });
    });
    return svg(W, H, b, describe(spec));
  }

  // ---------------------------------------------------- bar and line charts
  function titleBlock(lines, cx, y0) {
    let b = "", y = y0;
    (lines || []).forEach((l) => { b += txt(cx, y, l, { size: 14 }); y += 18; });
    return [b, y];
  }
  function wrap(text, width) {
    const out = [""];
    String(text).split(/\s+/).forEach((w) => { if ((out[out.length - 1] + " " + w).trim().length > width) out.push(w); else out[out.length - 1] = (out[out.length - 1] + " " + w).trim(); });
    return out;
  }
  function catLabel(text, x, y) { return String(text).split("\n").map((l, k) => txt(x, y + k * 15, l, { size: 13 })).join(""); }

  function chartFrame(spec, plotH) {
    const Y = spec.y, cats = spec.categories;
    const W = spec.width || 340;
    const pad = { l: 44 + (Y.title ? 20 : 0), r: 14 };
    const titleH = (spec.title || []).length * 18 + 8;
    const catLines = Math.max(...cats.map((c) => String(c).split("\n").length));
    const pw = W - pad.l - pad.r, ph = plotH || 210;
    const top = titleH + 6, bottom = top + ph;
    const H = bottom + 10 + catLines * 15 + (spec.x && spec.x.title ? 26 : 0) + 6;
    const py = (v) => bottom - (v - Y.min) / (Y.max - Y.min) * ph;
    let b = titleBlock(spec.title, W / 2 + (pad.l - pad.r) / 4, 16)[0];
    steps(Y.min, Y.max, Y.step).forEach((v) => {
      b += `<line x1="${pad.l}" y1="${r2(py(v))}" x2="${pad.l + pw}" y2="${r2(py(v))}" stroke="${v === Y.min ? INK : GRID}" stroke-width="${v === Y.min ? 1.2 : 0.9}"/>`;
      b += txt(pad.l - 6, py(v) + 4, fmt(v), { size: 12, anchor: "end" });
    });
    b += `<line x1="${pad.l}" y1="${r2(py(Y.min))}" x2="${pad.l}" y2="${r2(py(Y.max))}" stroke="${INK}" stroke-width="1.2"/>`;
    if (Y.title) b += `<g transform="translate(16 ${r2((top + bottom) / 2)}) rotate(-90)">${txt(0, 0, Y.title, { size: 13 })}</g>`;
    if (spec.x && spec.x.title) b += txt(pad.l + pw / 2, H - 8, spec.x.title, { size: 13 });
    const slot = pw / cats.length;
    cats.forEach((c, k) => (b += catLabel(c, pad.l + slot * (k + 0.5), bottom + 18)));
    return { W, H, pad, pw, top, bottom, py, slot, b };
  }

  function legend(series, x, y, swatch) {
    let b = "", w = 0;
    series.forEach((s) => (w = Math.max(w, String(s.name).length * 6.6 + 34)));
    b += `<rect x="${r2(x - w)}" y="${r2(y)}" width="${r2(w)}" height="${series.length * 20 + 8}" fill="${BG}" stroke="${INK}" stroke-width="0.8"/>`;
    series.forEach((s, k) => { b += swatch(s, k, x - w + 10, y + 14 + k * 20); b += txt(x - w + 30, y + 18 + k * 20, s.name, { anchor: "start", size: 13 }); });
    return b;
  }

  function bar(spec) {
    const f = chartFrame(spec);
    let b = f.b;
    const n = spec.series.length, groupW = f.slot * (n > 1 ? 0.62 : 0.42), bw = groupW / n;
    spec.series.forEach((s, si) => s.values.forEach((v, ci) => {
      const x = f.pad.l + f.slot * (ci + 0.5) - groupW / 2 + si * bw;
      b += `<rect x="${r2(x)}" y="${r2(f.py(v))}" width="${r2(bw)}" height="${r2(f.py(spec.y.min) - f.py(v))}" fill="${s.fill || FILL[si % FILL.length]}" stroke="${INK}" stroke-width="1"/>`;
    }));
    if (n > 1 && spec.legend !== false) b += legend(spec.series, f.pad.l + f.pw - 6, f.top + 4, (s, k, x, y) => `<rect x="${x}" y="${y - 10}" width="13" height="13" fill="${s.fill || FILL[k % FILL.length]}" stroke="${INK}"/>`);
    let H = f.H;
    if (spec.note) wrap(spec.note, Math.floor(f.W / 6.4)).forEach((line) => { b += txt(10, H + 10, line, { anchor: "start", size: 12 }); H += 16; });
    return svg(f.W, H, b, describe(spec));
  }

  function marker(s, x, y) {
    const fill = s.filled === false ? BG : INK;
    if (s.marker === "triangle") return `<path d="M${r2(x)},${r2(y - 5)} L${r2(x + 5)},${r2(y + 4)} L${r2(x - 5)},${r2(y + 4)} z" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>`;
    if (s.marker === "square") return `<rect x="${r2(x - 4)}" y="${r2(y - 4)}" width="8" height="8" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>`;
    return `<circle cx="${r2(x)}" cy="${r2(y)}" r="4" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>`;
  }

  function linechart(spec) {
    const f = chartFrame(spec);
    let b = f.b;
    f.top; // categories get a tick on the axis
    spec.categories.forEach((c, k) => { const x = f.pad.l + f.slot * (k + 0.5); b += `<line x1="${r2(x)}" y1="${r2(f.bottom)}" x2="${r2(x)}" y2="${r2(f.bottom + 5)}" stroke="${INK}"/>`; });
    spec.series.forEach((s) => {
      const pts = s.values.map((v, k) => [f.pad.l + f.slot * (k + 0.5), f.py(v)]);
      b += `<polyline points="${pts.map((p) => p.map(r2).join(",")).join(" ")}" fill="none" stroke="${INK}" stroke-width="1.6"${s.dash ? ' stroke-dasharray="6 4"' : ""}/>`;
      pts.forEach(([x, y]) => (b += marker(s, x, y)));
    });
    // legend: one row per series, sample line with its marker
    let H = f.H + 6;
    spec.series.forEach((s) => {
      b += `<line x1="${f.pad.l + 10}" y1="${H + 6}" x2="${f.pad.l + 50}" y2="${H + 6}" stroke="${INK}" stroke-width="1.6"${s.dash ? ' stroke-dasharray="6 4"' : ""}/>` + marker(s, f.pad.l + 30, H + 6);
      b += txt(f.pad.l + 60, H + 10, s.name, { anchor: "start", size: 13 });
      H += 20;
    });
    return svg(f.W, H + 4, b, describe(spec));
  }

  // ------------------------------------------------------------- box plots
  function boxplot(spec) {
    const A = spec.axis, W = spec.width || 340;
    const labelW = Math.max(...spec.plots.map((p) => String(p.label || "").length)) * 7 + 12;
    const l = labelW + 10, r = W - 16, rowH = spec.rowHeight || 34;
    const px = (v) => l + (v - A.min) / (A.max - A.min) * (r - l);
    let b = "", y = 18;
    spec.plots.forEach((p) => {
      b += txt(10, y + 4, p.label, { anchor: "start", size: 13 });
      const bh = 8;
      b += `<line x1="${r2(px(p.min))}" y1="${y}" x2="${r2(px(p.q1))}" y2="${y}" stroke="${INK}" stroke-width="1.2"/>`;
      b += `<line x1="${r2(px(p.q3))}" y1="${y}" x2="${r2(px(p.max))}" y2="${y}" stroke="${INK}" stroke-width="1.2"/>`;
      [p.min, p.max].forEach((v) => (b += `<line x1="${r2(px(v))}" y1="${y - bh}" x2="${r2(px(v))}" y2="${y + bh}" stroke="${INK}" stroke-width="1.2"/>`));
      b += `<rect x="${r2(px(p.q1))}" y="${y - bh}" width="${r2(px(p.q3) - px(p.q1))}" height="${bh * 2}" fill="${BG}" stroke="${INK}" stroke-width="1.2"/>`;
      b += `<line x1="${r2(px(p.median))}" y1="${y - bh}" x2="${r2(px(p.median))}" y2="${y + bh}" stroke="${INK}" stroke-width="1.2"/>`;
      y += rowH;
    });
    b += `<line x1="${l}" y1="${y}" x2="${r}" y2="${y}" stroke="${INK}" stroke-width="1.2"/>`;
    steps(A.min, A.max, A.step || 1).forEach((v) => (b += `<line x1="${r2(px(v))}" y1="${y - 4}" x2="${r2(px(v))}" y2="${y + 4}" stroke="${INK}"/>`));
    (A.labels || steps(A.min, A.max, A.step || 1)).forEach((v) => (b += txt(px(v), y + 18, num(v), { size: 12 })));
    if (A.title) { b += txt((l + r) / 2, y + 40, A.title, { size: 13 }); y += 22; }   // axis title under the numbers
    return svg(W, y + 26, b, describe(spec));
  }

  // -------------------------------------------------------------- geometry
  function geometry(spec) {
    const P = spec.points, names = Object.keys(P);
    const xs = names.map((n) => P[n][0]), ys = names.map((n) => P[n][1]);
    // circles: { center: "O", radius: 5 } or { center: "O", through: "P" }; optional "dash": true
    const circR = (c) => (c.radius !== undefined ? c.radius : Math.hypot(P[c.through][0] - P[c.center][0], P[c.through][1] - P[c.center][1]));
    const bx = xs.slice(), by = ys.slice();
    (spec.circles || []).forEach((c) => { const r = circR(c), [ox, oy] = P[c.center]; bx.push(ox - r, ox + r); by.push(oy - r, oy + r); });
    const minX = Math.min(...bx), maxX = Math.max(...bx), minY = Math.min(...by), maxY = Math.max(...by);
    const W = spec.width || 320, pad = 30, extraTop = (spec.dims || []).length ? 28 : 0;
    const s = (W - 2 * pad) / Math.max(maxX - minX, 1e-9);
    const H = Math.max(60, (maxY - minY) * s + 2 * pad + extraTop) + (spec.notToScale ? 18 : 0);
    const X = (n) => pad + (P[n][0] - minX) * s, Yp = (n) => pad + extraTop + (maxY - P[n][1]) * s;
    const cx = xs.reduce((a, v) => a + v, 0) / xs.length, cy = ys.reduce((a, v) => a + v, 0) / ys.length;
    const seg = (sg) => (Array.isArray(sg) ? sg : [sg[0], sg.slice(1)]);
    let b = arrowDefs(nextId("a"));
    const arrowId = b.match(/id="([^"]+)"/)[1];
    (spec.segments || []).map(seg).forEach(([a, z]) => (b += `<line x1="${r2(X(a))}" y1="${r2(Yp(a))}" x2="${r2(X(z))}" y2="${r2(Yp(z))}" stroke="${INK}" stroke-width="1.6"/>`));
    (spec.circles || []).forEach((c) => (b += `<circle cx="${r2(X(c.center))}" cy="${r2(Yp(c.center))}" r="${r2(circR(c) * s)}" fill="none" stroke="${INK}" stroke-width="1.6"${c.dash ? ' stroke-dasharray="5 4"' : ""}/>`));
    (spec.dots || []).forEach((n) => (b += `<circle cx="${r2(X(n))}" cy="${r2(Yp(n))}" r="3.6" fill="${INK}"/>`));
    // point labels, pushed away from the figure's center unless a direction is given
    const DIR = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [0.7, -0.7], nw: [-0.7, -0.7], se: [0.7, 0.7], sw: [-0.7, 0.7] };
    (spec.labels || names.map((n) => ({ point: n }))).forEach((L) => {
      let d = DIR[L.pos];
      if (!d) { const vx = P[L.point][0] - cx, vy = -(P[L.point][1] - cy), m = Math.hypot(vx, vy) || 1; d = [vx / m, vy / m]; }
      const t = L.text || L.point;
      b += txt(X(L.point) + d[0] * 13, Yp(L.point) + d[1] * 13 + 5, t, { size: 14, italic: isVar(t) });
    });
    // angle labels sit on the bisector of the angle at the vertex
    (spec.angles || []).forEach((A) => {
      const v = A.vertex, [p1, p2] = A.between;
      const u1 = [X(p1) - X(v), Yp(p1) - Yp(v)], u2 = [X(p2) - X(v), Yp(p2) - Yp(v)];
      const n1 = Math.hypot(...u1), n2 = Math.hypot(...u2);
      let bx = u1[0] / n1 + u2[0] / n2, by = u1[1] / n1 + u2[1] / n2; const m = Math.hypot(bx, by) || 1;
      const dist = A.distance || 30;
      b += txt(X(v) + bx / m * dist, Yp(v) + by / m * dist + 4, A.text, { size: 12 });
      if (A.arc !== false) {
        const rr = 16, a1 = Math.atan2(u1[1], u1[0]), a2 = Math.atan2(u2[1], u2[0]);
        let da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        b += `<path d="M${r2(X(v) + rr * Math.cos(a1))},${r2(Yp(v) + rr * Math.sin(a1))} A${rr},${rr} 0 0 ${da > 0 ? 1 : 0} ${r2(X(v) + rr * Math.cos(a2))},${r2(Yp(v) + rr * Math.sin(a2))}" fill="none" stroke="${INK}" stroke-width="1"/>`;
      }
    });
    // labels along a segment (lengths, "x")
    (spec.segmentLabels || []).forEach((L) => {
      const [a, z] = seg(L.seg), mx = (X(a) + X(z)) / 2, my = (Yp(a) + Yp(z)) / 2;
      let nx = -(Yp(z) - Yp(a)), ny = X(z) - X(a); const m = Math.hypot(nx, ny) || 1; const side = L.side || 1;
      b += txt(mx + nx / m * 13 * side, my + ny / m * 13 * side + 4, L.text, { size: 13, italic: isVar(L.text) });
    });
    // dimension lines drawn above the figure, with arrows at both ends
    (spec.dims || []).forEach((D) => {
      const y = pad + extraTop - 22, x1 = X(D.from), x2 = X(D.to);
      b += `<line x1="${r2(x1)}" y1="${y - 6}" x2="${r2(x1)}" y2="${y + 6}" stroke="${INK}"/><line x1="${r2(x2)}" y1="${y - 6}" x2="${r2(x2)}" y2="${y + 6}" stroke="${INK}"/>`;
      b += `<line x1="${r2(x1)}" y1="${y}" x2="${r2(x2)}" y2="${y}" stroke="${INK}" marker-start="url(#${arrowId})" marker-end="url(#${arrowId})"/>`;
      const tw = String(D.text).length * 8 + 8, mx = (x1 + x2) / 2;
      b += `<rect x="${r2(mx - tw / 2)}" y="${y - 9}" width="${tw}" height="18" fill="${BG}"/>` + txt(mx, y + 5, D.text, { size: 14, italic: isVar(D.text) });
    });
    if (spec.notToScale) b += txt(W / 2, H - 6, "Note: Figure not drawn to scale.", { size: 11 });
    return svg(W, H, b, describe(spec));
  }

  // ----------------------------------------------------------------- table
  function table(spec) {
    let h = `<table class="data sq-fig-table">`;
    if (spec.title) h += `<caption>${esc(spec.title)}</caption>`;
    const head = spec.header || [spec.columns.map((c) => ({ text: c }))];
    head.forEach((row) => (h += "<tr>" + row.map((c) => `<th${c.span ? ` colspan="${c.span}"` : ""}${c.rowspan ? ` rowspan="${c.rowspan}"` : ""}>${esc(c.text)}</th>`).join("") + "</tr>"));
    spec.rows.forEach((r) => (h += "<tr>" + r.map((c, k) => (k === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join("") + "</tr>"));
    if (spec.note) h += `<tr><td colspan="99" class="sq-fig-note">${esc(spec.note)}</td></tr>`;
    return h + "</table>";
  }

  // -------------------------------------------------------------- describe
  function describe(spec) {
    if (spec.alt) return spec.alt;
    const t = [].concat(spec.title || []).join(" ").replace(/\*/g, "");
    switch (spec.kind) {
      case "graph": {
        const parts = (spec.elements || []).map((e) =>
          e.type === "function" ? `the graph of y = ${e.fn}` :
          e.type === "points" ? `${e.data.length} plotted points` :
          e.type === "line" || e.type === "polyline" ? `a line through ${e.points.map((p) => "(" + p.map(fmt).join(", ") + ")").join(", ")}` : null).filter(Boolean);
        return `Graph in the xy-plane, x from ${fmt(spec.x.min)} to ${fmt(spec.x.max)}, y from ${fmt(spec.y.min)} to ${fmt(spec.y.max)}${spec.x.title ? `, x-axis: ${spec.x.title}` : ""}${spec.y.title ? `, y-axis: ${spec.y.title}` : ""}, showing ${parts.join(" and ") || "the axes"}.`;
      }
      case "bar": return `Bar graph${t ? " titled " + t : ""}: ` + spec.categories.map((c, k) => `${String(c).replace(/\n/g, " ")}: ${spec.series.map((s) => (spec.series.length > 1 ? s.name + " " : "") + s.values[k]).join(", ")}`).join("; ") + ".";
      case "linechart": return `Line graph${t ? " titled " + t : ""}: ` + spec.series.map((s) => `${s.name}: ${s.values.map((v, k) => spec.categories[k] + " " + v).join(", ")}`).join("; ") + ".";
      case "boxplot": return "Box plots: " + spec.plots.map((p) => `${p.label} min ${p.min}, Q1 ${p.q1}, median ${p.median}, Q3 ${p.q3}, max ${p.max}`).join("; ") + ".";
      case "geometry": return ((spec.circles || []).length ? `Circle${spec.circles.length > 1 ? "s" : ""} with center ${spec.circles.map((c) => c.center).join(", ")}. ` : "") + `Figure with points ${Object.keys(spec.points).join(", ")}` + ((spec.angles || []).length ? `; angles ${spec.angles.map((a) => a.vertex + " " + a.text).join(", ")}` : "") + ((spec.segmentLabels || []).length ? `; ${spec.segmentLabels.map((l) => (Array.isArray(l.seg) ? l.seg.join("") : l.seg) + " = " + l.text).join(", ")}` : "") + ".";
      case "table": return `Table${spec.title ? " titled " + spec.title : ""}.`;
      default: return "Figure";
    }
  }

  // -------------------------------------------------------------- validate
  function validate(spec) {
    const issues = [], need = (cond, msg) => { if (!cond) issues.push(msg); };
    need(spec && typeof spec === "object", "spec is not an object");
    if (!spec) return issues;
    need(KINDS[spec.kind], `unknown kind "${spec.kind}"`);
    try {
      if (spec.kind === "graph") {
        ["x", "y"].forEach((a) => need(spec[a] && spec[a].max > spec[a].min, `${a} range missing or empty`));
        (spec.elements || []).forEach((e, k) => {
          if (e.type === "function") {
            const f = compile(e.fn), [a, z] = e.domain || [spec.x.min, spec.x.max];
            let ok = 0; for (let i = 0; i <= 50; i++) { const y = f(a + (z - a) * i / 50); if (isFinite(y) && y >= spec.y.min && y <= spec.y.max) ok++; }
            need(ok > 0, `element ${k} (${e.fn}) never appears inside the plotted range`);
          }
          const pts = e.points || e.data || (e.at ? [e.at] : []);
          pts.forEach((p) => need(p[0] >= spec.x.min - 1e-9 && p[0] <= spec.x.max + 1e-9 && p[1] >= spec.y.min - 1e-9 && p[1] <= spec.y.max + 1e-9 || e.type === "label", `element ${k} point (${p}) is outside the plotted range`));
        });
      } else if (spec.kind === "bar" || spec.kind === "linechart") {
        spec.series.forEach((s) => need(s.values.length === spec.categories.length, `series "${s.name}" has ${s.values.length} values for ${spec.categories.length} categories`));
        spec.series.forEach((s) => s.values.forEach((v) => need(v >= spec.y.min && v <= spec.y.max, `series "${s.name}" value ${v} outside the y range`)));
      } else if (spec.kind === "boxplot") {
        spec.plots.forEach((p) => need(p.min <= p.q1 && p.q1 <= p.median && p.median <= p.q3 && p.q3 <= p.max, `box plot "${p.label}" is not ordered min <= Q1 <= median <= Q3 <= max`));
      } else if (spec.kind === "geometry") {
        const has = (n) => spec.points[n] !== undefined;
        (spec.segments || []).forEach((sg) => { const [a, z] = Array.isArray(sg) ? sg : [sg[0], sg.slice(1)]; need(has(a) && has(z), `segment ${a}${z} uses an unknown point`); });
        (spec.angles || []).forEach((A) => need(has(A.vertex) && A.between.every(has), `angle at ${A.vertex} uses an unknown point`));
        (spec.circles || []).forEach((c, k) => need(has(c.center) && (c.radius > 0 || has(c.through)), `circle ${k + 1} needs a known center and a radius > 0 or a "through" point`));
      }
      render(spec);
      describe(spec);
    } catch (e) { issues.push(String(e.message || e)); }
    return issues;
  }

  const KINDS = { graph, bar, linechart, boxplot, geometry, table };
  function render(spec) {
    const k = KINDS[spec && spec.kind];
    if (!k) throw new Error(`unknown figure kind "${spec && spec.kind}"`);
    return k(spec);
  }

  // Facts computed from a spec, for checking answer keys against figures.
  const facts = {
    boxRange: (spec, label) => { const p = spec.plots.find((q) => q.label === label); return p.max - p.min; },
    evalFn: (fn, x) => compile(fn)(x),
    lineAt: (pts, x) => { const [[x1, y1], [x2, y2]] = pts; return y1 + (y2 - y1) * (x - x1) / (x2 - x1); }
  };

  return { render, describe, validate, compile, facts, version: "0.1" };
});
