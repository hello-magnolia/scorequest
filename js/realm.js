/* ============================================================
   ScoreQuest — realm walkabout v2: paths, markers, editor
   ------------------------------------------------------------
   Movement is now a polyline: each realm may carry `path` — a
   list of [x, y] waypoints normalized to world width/height —
   and Pomelo walks ALONG it: down stairs, across terraces,
   up to the shrine. Taps project to the nearest point on the
   path; node markers sit on it and light up as he reaches them.
   Realms without a path fall back to a flat ground line (the
   same polyline machinery with two points).

   PATH EDITOR — realm.html?realm=<id>&edit=1
   The path in this file for Lorewood is an educated guess made
   without seeing the art; the editor exists so a human can trace
   the truth. In edit mode: click along the walkable path from
   left to right to drop waypoints (the line draws as you go),
   press N (or the Markers button) to switch to dropping node
   markers, Z undoes, C clears. "Save preview" stores the trace in
   localStorage so removing &edit=1 walks it immediately; "Copy
   JSON" yields the snippet to commit into REALMS below.

   If the art fails to load entirely (expired placeholder CDN),
   the realm stays functional on a dark stage with a synthetic
   world width — walkable, editable, just invisible.
   ============================================================ */
(function () {
  'use strict';
  if (!document.body.classList.contains('page-realm')) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01';

  var REALMS = [
    { id: 'lorewood', name: 'Lorewood', domain: 'Information & Ideas', fight: true,
      ui: 'shrinewood',   /* popups and text boxes wear the wooden shrine frame */
      boss: 'The shrine doors are sealed. Whatever twists the old texts is waiting behind them.',
      img: ['assets/realms/lorewood.png', CDN + '/hf_20260711_215833_948a0475-28db-41fa-94bf-14fca55664f1.png'],
      /* hand-traced in the editor: terrace -> stairs -> terrace 2 -> stairs ->
         torii walk -> stairs up -> the shrine approach */
      path: [[0.127, 0.352], [0.127, 0.355], [0.158, 0.348], [0.192, 0.347], [0.24, 0.349],
             [0.292, 0.478], [0.314, 0.499], [0.335, 0.501], [0.363, 0.503], [0.39, 0.504],
             [0.414, 0.507], [0.466, 0.633], [0.481, 0.65], [0.501, 0.663], [0.524, 0.663],
             [0.554, 0.667], [0.595, 0.668], [0.613, 0.666], [0.657, 0.664], [0.699, 0.664],
             [0.717, 0.666], [0.767, 0.547], [0.794, 0.538], [0.817, 0.534], [0.833, 0.527],
             [0.853, 0.495], [0.869, 0.457]],
      start: [0.127, 0.355],
      stairs: [[0.241, 0.351], [0.292, 0.478], [0.414, 0.507], [0.466, 0.633],
               [0.717, 0.666], [0.767, 0.547]],
      bossArea: [[0.869, 0.444], [0.851, 0.431], [0.854, 0.313], [0.899, 0.339], [0.898, 0.456]],
      fx: { leaves: 10, lamps: [
        [0.072, 0.606, 3.5], [0.11, 0.469, 3.5], [0.129, 0.531, 3], [0.134, 0.675, 4],
        [0.242, 0.573, 3], [0.709, 0.682, 3.5], [0.764, 0.502, 3], [0.85, 0.649, 4]
      ] },
      nodes: [[0.363, 0.503], [0.501, 0.663], [0.613, 0.666], [0.817, 0.534]] },
    { id: 'storyforge', name: 'Story Forge', domain: 'Craft & Structure', fight: true, ground: 0.80,
      boss: 'The forge-hall doors are barred. Inside, something is bolting itself together in the wrong order.',
      img: ['assets/realms/storyforge.png', CDN + '/hf_20260711_230052_cd161907-7401-47e7-a33c-42b70abe3904.png'],
      /* traced by Magnolia in the graph editor: a smithy tour with real
         crossroads — spur trials, a mezzanine run, and the forge approach */
      path: { nodes: [[0.09,0.257],[0.125,0.302],[0.174,0.308],[0.233,0.247],[0.227,0.303],[0.265,0.345],[0.324,0.487],[0.344,0.559],[0.201,0.57],[0.125,0.572],[0.097,0.58],[0.097,0.63],[0.128,0.659],[0.197,0.815],[0.281,0.819],[0.298,0.819],[0.345,0.868],[0.424,0.874],[0.555,0.866],[0.595,0.799],[0.63,0.818],[0.862,0.834],[0.884,0.831],[0.628,0.772],[0.628,0.615],[0.623,0.548],[0.627,0.492],[0.439,0.469],[0.658,0.539],[0.692,0.538],[0.727,0.555],[0.76,0.554],[0.782,0.535],[0.855,0.531],[0.888,0.526],[0.893,0.461],[0.432,0.555]],
        edges: [[0,1],[1,2],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[23,24],[24,25],[25,26],[28,29],[29,30],[30,31],[31,32],[32,33],[33,34],[34,35],[2,4],[36,7],[27,36],[36,25],[25,28],[23,20]],
        stairs: [3,4,10,11,13,14,17,18,21] },
      nodes: [[0.236,0.248],[0.158,0.571],[0.281,0.819],[0.433,0.874],[0.439,0.469],[0.627,0.491],[0.884,0.831]],
      start: [0.091,0.258],
      bossArea: [[0.862,0.451],[0.859,0.323],[0.88,0.279],[0.902,0.278],[0.929,0.32],[0.928,0.449]] },
    { id: 'inkreef', name: 'Ink Reef', domain: 'Expression of Ideas', fight: true, ground: 0.82,
      boss: 'The grotto is dark with drifting ink. The water will not clear on its own.',
      img: ['assets/realms/inkreef.png', CDN + '/hf_20260711_230540_3f451865-ff4e-41ca-a71a-fe4aacf6705a.png'],
      /* traced by Magnolia in the graph editor: the reef is a true ring —
         two closed loops, stair descents, and the Sophist's grotto spur */
      path: { nodes: [[0.086,0.652],[0.099,0.627],[0.122,0.535],[0.165,0.484],[0.28,0.497],[0.315,0.487],[0.359,0.498],[0.468,0.465],[0.555,0.479],[0.593,0.536],[0.687,0.541],[0.704,0.589],[0.717,0.662],[0.731,0.708],[0.691,0.732],[0.661,0.768],[0.592,0.777],[0.558,0.812],[0.445,0.803],[0.41,0.78],[0.271,0.854],[0.347,0.796],[0.37,0.792],[0.809,0.692],[0.859,0.637],[0.915,0.56],[0.213,0.855],[0.13,0.789],[0.099,0.708]],
        edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[20,21],[21,22],[22,19],[23,24],[24,25],[20,26],[23,13],[26,27],[27,28],[28,0]],
        stairs: [0,1,8,10,11,12,13,14,16] },
      nodes: [[0.164,0.485],[0.469,0.465],[0.688,0.543],[0.509,0.808],[0.269,0.852],[0.731,0.708]],
      start: [0.086,0.652],
      bossArea: [[0.878,0.557],[0.876,0.451],[0.909,0.382],[0.922,0.438],[0.934,0.438],[0.94,0.425],[0.952,0.548],[0.942,0.592]] },
    { id: 'syntaxcitadel', name: 'Syntax Citadel', domain: 'Conventions', fight: true, ground: 0.80,
      boss: 'The keep gate opens only for a complete sentence. The one on the throne is in pieces.',
      img: ['assets/realms/syntaxcitadel.png', CDN + '/hf_20260711_232640_5add5ec2-516c-4675-b10c-7c7242441029.png'],
      /* traced by Magnolia in the graph editor (v2): cloud stairways,
         three bridge junctions, the keep loop, and a hanging under-spur */
      path: { nodes: [[0.138,0.466],[0.173,0.514],[0.201,0.599],[0.239,0.642],[0.293,0.818],[0.317,0.848],[0.402,0.739],[0.444,0.689],[0.496,0.747],[0.577,0.856],[0.597,0.888],[0.623,0.843],[0.674,0.736],[0.596,0.487],[0.726,0.661],[0.803,0.534],[0.857,0.499],[0.878,0.473],[0.528,0.584],[0.551,0.961]],
        edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[13,14],[14,15],[15,16],[16,17],[14,12],[13,18],[18,7],[19,10]],
        stairs: [3,4,11,13] },
      nodes: [[0.219,0.62],[0.317,0.848],[0.444,0.689],[0.597,0.888],[0.528,0.571],[0.655,0.567]],
      start: [0.138,0.467],
      bossArea: [[0.851,0.438],[0.851,0.241],[0.882,0.172],[0.91,0.273],[0.911,0.511]] },
    { id: 'mirrormines', name: 'Mirror Mines', domain: 'Algebra', fight: true, ground: 0.81,
      boss: 'The mirror chamber. Whatever is done on one side happens on the other.',
      img: ['assets/realms/mirrormines.png', CDN + '/hf_20260711_233112_1b52ca12-d9d4-4d93-99c7-8ad6befb0545.png'],
      /* traced by Magnolia in the graph editor (v2): a four-junction maze
         of drifts, two loops around the central gallery, and dead-end
         trials deep in the workings */
      path: { nodes: [[0.092,0.556],[0.164,0.649],[0.212,0.695],[0.292,0.705],[0.403,0.585],[0.21,0.278],[0.174,0.291],[0.122,0.234],[0.3,0.21],[0.416,0.398],[0.481,0.321],[0.471,0.27],[0.413,0.852],[0.461,0.89],[0.533,0.89],[0.599,0.842],[0.704,0.696],[0.819,0.806],[0.862,0.784],[0.687,0.668],[0.708,0.641],[0.751,0.497],[0.865,0.357],[0.334,0.496],[0.307,0.47],[0.247,0.277],[0.79,0.803]],
        edges: [[0,1],[1,2],[2,3],[3,4],[5,6],[6,7],[9,10],[10,11],[12,13],[13,14],[14,15],[15,16],[17,18],[19,20],[20,21],[21,22],[12,3],[4,23],[9,23],[24,25],[16,19],[16,26],[26,17],[24,23],[25,5],[8,25]],
        stairs: [13,14] },
      nodes: [[0.122,0.234],[0.3,0.21],[0.471,0.276],[0.534,0.89],[0.862,0.784]],
      start: [0.092,0.557],
      bossArea: [[0.844,0.333],[0.842,0.178],[0.858,0.137],[0.879,0.158],[0.892,0.225],[0.89,0.387]] },
    { id: 'infinityisles', name: 'Infinity Isles', domain: 'Advanced Math', fight: true, ground: 0.78,
      boss: 'The archway hums. Something on the far side keeps doubling.',
      img: ['assets/realms/infinityisles.png', CDN + '/hf_20260712_030318_cb25b618-de99-4606-abc4-0c021da75913.png'],
      /* traced by Magnolia in the graph editor: island hops with two crossings and long open water */
      path: { nodes: [[0.07,0.511],[0.093,0.534],[0.22,0.671],[0.265,0.683],[0.305,0.675],[0.357,0.629],[0.459,0.511],[0.414,0.169],[0.523,0.434],[0.708,0.655],[0.883,0.427],[0.432,0.876],[0.451,0.252],[0.403,0.368],[0.396,0.15]],
        edges: [[0,1],[1,2],[2,3],[3,4],[5,6],[6,8],[8,9],[4,5],[5,11],[7,12],[12,13],[13,6],[7,14],[9,10]],
        stairs: [] },
      nodes: [[0.266,0.683],[0.432,0.878],[0.403,0.375],[0.454,0.258],[0.396,0.151],[0.711,0.651]],
      start: [0.066,0.497],
      bossArea: [[0.873,0.411],[0.872,0.283],[0.874,0.252],[0.889,0.229],[0.903,0.264],[0.906,0.299],[0.905,0.399],[0.903,0.436]] },
    { id: 'datadocks', name: 'Data Docks', domain: 'Problem-Solving & Data', fight: true, ground: 0.80,
      boss: 'The gangplank is up. The captain\u2019s charts never quite add up.',
      img: ['assets/realms/datadocks.png', CDN + '/hf_20260712_000405_578c3562-4fdd-4209-9609-3de599f599d3.png'],
      /* traced by Magnolia in the graph editor: the pier promenade with a
         crane-top spur, a lower gantry loop, and the long eastern quay */
      path: { nodes: [[0.078,0.604],[0.195,0.32],[0.162,0.603],[0.205,0.61],[0.219,0.621],[0.259,0.653],[0.295,0.658],[0.329,0.648],[0.361,0.621],[0.387,0.623],[0.47,0.734],[0.434,0.738],[0.49,0.628],[0.522,0.611],[0.581,0.49],[0.59,0.484],[0.697,0.487],[0.735,0.466],[0.811,0.46],[0.879,0.464],[0.908,0.487],[0.932,0.49],[0.497,0.722],[0.413,0.621]],
        edges: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[10,11],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[19,20],[20,21],[0,2],[10,22],[22,12],[9,23],[23,12]],
        stairs: [9,10,11] },
      nodes: [[0.435,0.737],[0.195,0.321],[0.412,0.622],[0.646,0.485],[0.808,0.46]],
      start: [0.078,0.603],
      bossArea: [[0.915,0.473],[0.915,0.32],[0.931,0.274],[0.947,0.33],[0.945,0.504]] },
    { id: 'prismpeaks', name: 'Prism Peaks', domain: 'Geometry & Trigonometry', fight: true, ground: 0.80, vertical: true,
      boss: 'The nest at the summit. You know who it belongs to \u2014 and who is waiting in it.',
      img: ['assets/realms/prismpeaks.png', CDN + '/hf_20260712_030734_4484dc45-3614-4e52-9af2-b4813c9f6499.png'],
      /* traced by Magnolia in the graph editor: the valley road, an eastern
         shelf, and the long summit climb splitting away at the col */
      path: { nodes: [[0.043,0.813],[0.145,0.816],[0.191,0.768],[0.239,0.811],[0.329,0.796],[0.381,0.779],[0.429,0.676],[0.456,0.637],[0.473,0.619],[0.504,0.619],[0.543,0.595],[0.596,0.547],[0.627,0.643],[0.682,0.703],[0.74,0.757],[0.79,0.731],[0.893,0.773],[0.855,0.772],[0.615,0.616],[0.613,0.527],[0.638,0.493],[0.665,0.487],[0.693,0.447],[0.733,0.381],[0.745,0.36],[0.765,0.33],[0.791,0.304],[0.817,0.303],[0.848,0.33],[0.862,0.323],[0.892,0.207]],
        edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[12,13],[13,14],[16,17],[19,20],[20,21],[21,22],[22,23],[23,24],[24,25],[25,26],[26,27],[27,28],[28,29],[29,30],[11,19],[11,18],[12,18],[15,14],[17,15]],
        stairs: [] },
      nodes: [[0.191,0.768],[0.333,0.795],[0.548,0.603],[0.893,0.773],[0.74,0.756],[0.789,0.306]],
      start: [0.044,0.813],
      bossArea: [[0.861,0.21],[0.865,0.158],[0.901,0.148],[0.937,0.181],[0.915,0.234]] }
  ];

  var params = new URLSearchParams(window.location.search);
  var idx = Math.max(0, REALMS.findIndex(function (r) { return r.id === params.get('realm'); }));
  var realm = REALMS[idx];
  var editing = params.get('edit') === '1';
  var PREVIEW_KEY = 'sq_realm_trace_' + realm.id;

  // a human-saved trace beats the manifest — but say so, and offer a way back
  var traceOverride = false;
  try {
    var saved = JSON.parse(window.localStorage.getItem(PREVIEW_KEY));
    if (saved && (saved.path || saved.nodes)) {
      realm = Object.assign({}, realm);
      if (saved.path && (saved.path.nodes || saved.path.length >= 2)) realm.path = saved.path;
      if (saved.nodes) realm.nodes = saved.nodes;
      if (saved.start && saved.start.length === 2) realm.start = saved.start;
      if (saved.stairs) realm.stairs = saved.stairs;
      if (saved.bossArea && saved.bossArea.length >= 3) realm.bossArea = saved.bossArea;
      traceOverride = true;
    }
  } catch (e) {}

  var stage = document.getElementById('rw-stage');
  var world = document.getElementById('rw-world');
  var bg = document.getElementById('rw-bg');
  var bossZoneEl = document.getElementById('rw-bosszone');
  var capy = document.getElementById('rw-capy');
  var veil = document.getElementById('rw-veil');
  var hint = document.getElementById('rw-hint');

  /* ---------- forward-only progression ----------
     Pomelo advances waypoint by waypoint (space, or clicking the next
     node). Each waypoint asks a question; passing unlocks the next leg.
     Passed nodes reopen as extra practice. He never walks backward. */
  var PROG_KEY = 'sq_realm_prog_' + realm.id;
  var passed = {};                 // markerIdx -> true (order-free waypoints)
  try {
    var rawProg = window.localStorage.getItem(PROG_KEY);
    if (rawProg && rawProg.charAt(0) === '[') {
      JSON.parse(rawProg).forEach(function (i) { passed[i] = true; });
    } else {
      var n0 = Math.max(0, parseInt(rawProg, 10) || 0);
      for (var pi = 0; pi < n0; pi++) passed[pi] = true;   // legacy counter
    }
  } catch (e) {}
  function passedCount() { return Object.keys(passed).length; }
  function savePassed() {
    try { window.localStorage.setItem(PROG_KEY, JSON.stringify(
      Object.keys(passed).map(Number))); } catch (e) {}
  }
  var quizOpen = false;
  var PRACTICE = [       // placeholder items until the real banks arrive
    { q: 'Which of these is a complete sentence?',
      choices: ['Running through the trees.', 'The lanterns glow.', 'Because the path turned.', 'After the second gate.'], a: 1 },
    { q: 'Pomelo reads 12 pages a day. At that pace, how many pages in a week?',
      choices: ['74', '84', '96', '112'], a: 1 },
    { q: 'Which word best replaces the vague word in: \u201CThe view from the peak was nice\u201D?',
      choices: ['good', 'fine', 'breathtaking', 'okay'], a: 2 },
    { q: 'If 3x + 5 = 20, then x equals\u2026',
      choices: ['3', '5', '15', '25'], a: 1 },
    { q: 'An author lists three examples right after a claim. The examples mainly serve to\u2026',
      choices: ['contradict the claim', 'support the claim', 'summarize the passage', 'introduce a new topic'], a: 1 },
    { q: 'A recipe doubles. If it needed 3/4 cup before, it now needs\u2026',
      choices: ['1 cup', '1 1/4 cups', '1 1/2 cups', '2 cups'], a: 2 }
  ];
  var qOffset = 0;
  var popup = document.getElementById('rw-popup');
  var trace = document.getElementById('rw-trace');

  /* ---------- HUD ---------- */
  document.title = realm.name + ', ScoreQuest';
  document.getElementById('rw-title').textContent = realm.name;
  if (realm.ui) document.body.classList.add('rw-ui-' + realm.ui);   // per-realm ui skin
  document.getElementById('rw-meta').textContent =
    'Realm ' + (idx + 1) + ' of ' + REALMS.length + ' \u00B7 ' + realm.domain;
  if (traceOverride) {
    var metaEl = document.getElementById('rw-meta');
    metaEl.appendChild(document.createTextNode(' \u00B7 custom trace '));
    var clearLink = document.createElement('a');
    clearLink.href = '#';
    clearLink.className = 'rw-trace-clear';
    clearLink.textContent = '(clear)';
    clearLink.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      try { window.localStorage.removeItem(PREVIEW_KEY); } catch (err) {}
      window.location.reload();
    });
    metaEl.appendChild(clearLink);
  }
  var prev = document.getElementById('rw-prev');
  var next = document.getElementById('rw-next');
  if (idx > 0) prev.href = 'realm.html?realm=' + REALMS[idx - 1].id;
  else prev.classList.add('is-off');
  if (idx < REALMS.length - 1) next.href = 'realm.html?realm=' + REALMS[idx + 1].id;
  else next.classList.add('is-off');
  document.getElementById('rw-popup-text').textContent = realm.boss;
  var popupNext = document.getElementById('rw-popup-next');
  if (idx < REALMS.length - 1) {
    popupNext.href = 'realm.html?realm=' + REALMS[idx + 1].id;
    popupNext.textContent = 'Onward to ' + REALMS[idx + 1].name + ' \u2192';
  } else {
    popupNext.hidden = true;
  }
  if (realm.fight) {
    var fightBtn = document.createElement('a');
    fightBtn.className = 'btn btn-gold';
    fightBtn.id = 'rw-fight';
    fightBtn.href = 'boss.html?realm=' + realm.id;
    fightBtn.textContent = '\u2694 Face the guardian';
    var row = popup.querySelector('.rw-popup-row');
    row.insertBefore(fightBtn, row.firstChild);
    popupNext.classList.remove('btn-gold');
    popupNext.classList.add('btn-outline');
  }

  /* ---------- world & path state ---------- */
  var stageW = 0, stageH = 0, worldW = 0, worldH = 0;
  var capyW = 0, capyH = 0;
  var ready = false, bossShown = false, prefetched = false;
  var facing = 1, walking = false;

  /* ---------- the walk graph ----------
     realm.path is a graph {nodes:[[x,y]..], edges:[[a,b]..], stairs:[edgeIdx..]}
     (normalized). Legacy array-of-points chains migrate automatically:
     repeated coordinates merge into one node, so old snap-closed loops
     become true junctions. Pomelo's position is {e, t}: edge + fraction. */
  function migratePath() {
    var p = realm.path;
    if (p && p.nodes) {
      return { nodes: p.nodes.map(function (n) { return n.slice(); }),
               edges: (p.edges || []).map(function (e) { return e.slice(); }),
               stairs: (p.stairs || []).slice() };
    }
    var chain = (p && p.length >= 2) ? p
      : [[0.02, realm.ground || 0.8], [0.98, realm.ground || 0.8]];
    var nodes = [], map = [];
    chain.forEach(function (q) {
      var f = -1;
      for (var i = 0; i < nodes.length; i++) {
        if (Math.abs(nodes[i][0] - q[0]) < 0.004 &&
            Math.abs(nodes[i][1] - q[1]) < 0.004) { f = i; break; }
      }
      if (f === -1) { nodes.push([q[0], q[1]]); f = nodes.length - 1; }
      map.push(f);
    });
    var edges = [], seen = {};
    for (var k = 1; k < map.length; k++) {
      var a = map[k - 1], b = map[k];
      if (a === b) continue;
      var key = Math.min(a, b) + '-' + Math.max(a, b);
      if (seen[key] !== undefined) continue;
      seen[key] = edges.length;
      edges.push([a, b]);
    }
    // legacy stair PAIRS mark the edges whose midpoints hug the pair's span
    var stairs = [];
    var sp = realm.stairs || [];
    for (var s = 0; s + 1 < sp.length; s += 2) {
      var p1 = sp[s], p2 = sp[s + 1];
      edges.forEach(function (e, ei) {
        var mx = (nodes[e[0]][0] + nodes[e[1]][0]) / 2;
        var my = (nodes[e[0]][1] + nodes[e[1]][1]) / 2;
        var vx = p2[0] - p1[0], vy = p2[1] - p1[1];
        var L2 = vx * vx + vy * vy || 1e-9;
        var t = Math.min(Math.max(((mx - p1[0]) * vx + (my - p1[1]) * vy) / L2, 0), 1);
        var d = Math.hypot(mx - (p1[0] + vx * t), my - (p1[1] + vy * t));
        if (d < 0.03 && stairs.indexOf(ei) === -1) stairs.push(ei);
      });
    }
    return { nodes: nodes, edges: edges, stairs: stairs };
  }
  var GN = migratePath();          // normalized graph (also seeds the editor)
  var G = { pts: [], edges: [], adj: [] };
  function buildGraph() {
    G = { pts: [], edges: [], adj: [] };
    G.pts = GN.nodes.map(function (n) { return [n[0] * worldW, n[1] * worldH]; });
    G.adj = G.pts.map(function () { return []; });
    GN.edges.forEach(function (e, i) {
      var a = e[0], b = e[1];
      if (a === b || !G.pts[a] || !G.pts[b]) return;
      var L = Math.hypot(G.pts[b][0] - G.pts[a][0], G.pts[b][1] - G.pts[a][1]);
      var idx = G.edges.push({ a: a, b: b, len: Math.max(1, L),
        stairs: GN.stairs.indexOf(i) > -1 }) - 1;
      G.adj[a].push(idx); G.adj[b].push(idx);
    });
    if (!G.edges.length) {           // never strand him: a floor to stand on
      G.pts = [[worldW * 0.02, worldH * 0.8], [worldW * 0.98, worldH * 0.8]];
      G.adj = [[0], [0]];
      G.edges = [{ a: 0, b: 1, len: worldW * 0.96, stairs: false }];
    }
  }
  var cur = { e: 0, t: 0 };
  var nodeEls = [];                // the waypoint marker DOM elements
  function posXY(c) {
    c = c || cur;
    var ed = G.edges[c.e];
    var A2 = G.pts[ed.a], B2 = G.pts[ed.b];
    return { x: A2[0] + (B2[0] - A2[0]) * c.t, y: A2[1] + (B2[1] - A2[1]) * c.t,
      dx: B2[0] - A2[0], dy: B2[1] - A2[1] };
  }
  function nearestOnGraph(x, y) {
    var best = null;
    G.edges.forEach(function (ed, ei) {
      var A2 = G.pts[ed.a], B2 = G.pts[ed.b];
      var vx = B2[0] - A2[0], vy = B2[1] - A2[1];
      var L2 = vx * vx + vy * vy || 1;
      var t = Math.min(Math.max(((x - A2[0]) * vx + (y - A2[1]) * vy) / L2, 0), 1);
      var px = A2[0] + vx * t, py = A2[1] + vy * t;
      var d = (x - px) * (x - px) + (y - py) * (y - py);
      if (!best || d < best.d) best = { e: ei, t: t, d: d, x: px, y: py };
    });
    return best || { e: 0, t: 0, d: 0, x: 0, y: 0 };
  }

  /* markers (the waypoint quizzes) live at points projected onto edges */
  var marks = [];                    // [{e, t, x, y}] parallel to realm.nodes
  function layoutMarks() {
    marks = (realm.nodes || []).map(function (n) {
      return nearestOnGraph(n[0] * worldW, n[1] * worldH);
    });
  }
  function markerOnSpan(ei, t0, t1) {          // first LOCKED marker crossed
    var lo = Math.min(t0, t1), hi = Math.max(t0, t1), hit = -1, hd = 2;
    marks.forEach(function (m, i) {
      if (passed[i] || m.e !== ei) return;
      if (m.t > lo + 1e-4 && m.t < hi - 1e-4) {
        var d = Math.abs(m.t - t0);
        if (d < hd) { hd = d; hit = i; }
      }
    });
    return hit;
  }

  /* junction steering: at a node, every branch answers to SOME key.
     The 8 key directions claim branches one-to-one (best matches first),
     so no branch at a fork is ever unreachable; leftover keys then take
     their own best fit. */
  var KEYDIRS = [[1, 0], [-1, 0], [0, -1], [0, 1],
    [0.7071, -0.7071], [-0.7071, -0.7071], [0.7071, 0.7071], [-0.7071, 0.7071]];
  function junctionMap(node) {
    var opts = G.adj[node].map(function (ei) {
      var ed = G.edges[ei];
      var other = ed.a === node ? ed.b : ed.a;
      var dx = G.pts[other][0] - G.pts[node][0];
      var dy = G.pts[other][1] - G.pts[node][1];
      var L = Math.hypot(dx, dy) || 1;
      return { e: ei, dir: ed.a === node ? 1 : -1, ux: dx / L, uy: dy / L };
    });
    var pairs = [];
    KEYDIRS.forEach(function (k, ki) {
      opts.forEach(function (o, oi) {
        pairs.push({ ki: ki, oi: oi, s: k[0] * o.ux + k[1] * o.uy });
      });
    });
    pairs.sort(function (x, y) { return y.s - x.s; });
    var keyOf = {}, claimed = {}, coverage = {};
    pairs.forEach(function (p) {               // pass 1: cover every branch
      if (keyOf[p.ki] === undefined && claimed[p.oi] === undefined) {
        keyOf[p.ki] = p.oi; claimed[p.oi] = true; coverage[p.ki] = true;
      }
    });
    pairs.forEach(function (p) {               // pass 2: leftover keys fit in
      if (keyOf[p.ki] === undefined && p.s > -0.1) keyOf[p.ki] = p.oi;
    });
    return { opts: opts, keyOf: keyOf };
  }
  window.__SQ_JUNCTION = function (node) {     // for the suite: prove coverage
    var jm = junctionMap(node);
    var got = {};
    Object.keys(jm.keyOf).forEach(function (k) { got[jm.opts[jm.keyOf[k]].e] = true; });
    return { branches: jm.opts.map(function (o) { return o.e; }),
      reachable: Object.keys(got).map(Number) };
  };
  function pickAtNode(node, vx, vy) {
    var jm = junctionMap(node);
    if (!jm.opts.length) return null;
    var L = Math.hypot(vx, vy) || 1;
    var nx = vx / L, ny = vy / L;
    var best = -1, bestD = -2;
    KEYDIRS.forEach(function (k, ki) {
      var d = k[0] * nx + k[1] * ny;
      if (d > bestD) { bestD = d; best = ki; }
    });
    var oi = jm.keyOf[best];
    return oi === undefined ? null : jm.opts[oi];
  }

  /* routes: dijkstra over nodes for space auto-walk and marker taps */
  function dijkstra(fromC, toC) {
    var N = G.pts.length;
    var dist = new Array(N).fill(Infinity), prev = new Array(N).fill(-1), prevE = new Array(N).fill(-1);
    var fe = G.edges[fromC.e];
    var seeds = [[fe.a, fromC.t * fe.len], [fe.b, (1 - fromC.t) * fe.len]];
    seeds.forEach(function (s) { if (s[1] < dist[s[0]]) { dist[s[0]] = s[1]; } });
    var done = new Array(N).fill(false);
    for (var it = 0; it < N; it++) {
      var u = -1, ud = Infinity;
      for (var i = 0; i < N; i++) if (!done[i] && dist[i] < ud) { ud = dist[i]; u = i; }
      if (u === -1) break;
      done[u] = true;
      G.adj[u].forEach(function (ei) {
        var ed = G.edges[ei];
        var v = ed.a === u ? ed.b : ed.a;
        if (dist[u] + ed.len < dist[v]) {
          dist[v] = dist[u] + ed.len; prev[v] = u; prevE[v] = ei;
        }
      });
    }
    var te = G.edges[toC.e];
    var endA = dist[te.a] + toC.t * te.len;
    var endB = dist[te.b] + (1 - toC.t) * te.len;
    var enter = endA <= endB ? te.a : te.b;
    if (!isFinite(dist[enter])) return null;   // an island: unreachable
    var nodesR = [enter];
    while (prev[nodesR[0]] !== -1) nodesR.unshift(prev[nodesR[0]]);
    var steps = [];
    for (var k2 = 1; k2 < nodesR.length; k2++) {
      var a2 = nodesR[k2 - 1], b2 = nodesR[k2];
      var ei2 = prevE[nodesR[k2]];
      steps.push({ e: ei2, endT: G.edges[ei2].a === b2 ? 0 : 1 });
    }
    // leave the current edge toward the route's first node
    if (fromC.e !== toC.e || nodesR.length > 1) {
      steps.unshift({ e: fromC.e, endT: G.edges[fromC.e].a === nodesR[0] ? 0 : 1 });
    }
    steps.push({ e: toC.e, endT: toC.t });
    return steps;
  }
  var route = null;                  // active auto-walk: [{e, endT}...]

  /* held keys */
  var held = { fwd: false, back: false, up: false, down: false };
  function heldVec() {
    var vx = (held.fwd ? 1 : 0) - (held.back ? 1 : 0);
    var vy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    return (vx || vy) ? { x: vx, y: vy } : null;
  }

  /* the mover: advance dist along the graph, honoring locked markers.
     Returns what stopped it: 'marker' (idx), 'node' (no branch), or null. */
  function moveAlong(dist, steer) {
    var guard = 12;
    while (dist > 0.5 && guard-- > 0) {
      var ed = G.edges[cur.e];
      var dirT = steer.dirT;                    // +1 toward b, -1 toward a
      var targetT = steer.endT !== undefined ? steer.endT : (dirT > 0 ? 1 : 0);
      var blocked = markerOnSpan(cur.e, cur.t, targetT);
      if (blocked > -1) targetT = marks[blocked].t;
      var span = Math.abs(targetT - cur.t) * ed.len;
      var step = Math.min(dist, span);
      cur.t += (targetT > cur.t ? 1 : -1) * (step / ed.len);
      dist -= step;
      if (Math.abs(cur.t - targetT) * ed.len < 0.6) {
        cur.t = targetT;
        if (blocked > -1) return { stop: 'marker', idx: blocked };
        if (steer.endT !== undefined && steer.atEnd) return { stop: 'target' };
        var node = cur.t <= 0.001 ? ed.a : (cur.t >= 0.999 ? ed.b : null);
        if (node === null) return { stop: 'target' };
        var next = steer.next(node);
        if (!next) return { stop: 'node' };
        cur.e = next.e;
        cur.t = next.dir > 0 ? 0 : 1;
        steer.dirT = next.dir;
        if (next.endT !== undefined) { steer.endT = next.endT; steer.atEnd = next.atEnd; }
        else { steer.endT = undefined; steer.atEnd = false; }
      } else if (step < 0.5) break;
    }
    return null;
  }

  function placeCapy() {
    var p = posXY();
    capy.style.left = Math.round(p.x - capyW / 2) + 'px';
    capy.style.top = Math.round(p.y - capyH * FEET) + 'px';
    return p;
  }

  function renderNodes() {
    nodeEls.forEach(function (el) { el.remove(); });
    nodeEls = [];
    (realm.nodes || []).forEach(function (n, i) {
      var el = document.createElement('div');
      el.className = 'rw-node';
      el.setAttribute('data-node', i + 1);
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        onNodeClick(i);
      });
      world.appendChild(el);
      nodeEls.push(el);
    });
  }
  function layoutNodes() {
    layoutMarks();
    syncNodeStates();
    (realm.nodes || []).forEach(function (n, i) {
      var el = nodeEls[i];
      if (!el) return;
      el.style.left = Math.round(n[0] * worldW) + 'px';
      el.style.top = Math.round(n[1] * worldH) + 'px';
    });
  }
  function syncNodeStates() {
    (realm.nodes || []).forEach(function (_, i) {
      var el = nodeEls[i];
      if (!el) return;
      el.classList.toggle('is-passed', !!passed[i]);
      el.classList.toggle('is-next', !passed[i]);
      el.classList.remove('is-locked');   // order-free: every trial approachable
    });
    window.__SQ_REALM_PROG = passedCount();
  }
  function onNodeClick(i) {
    if (editing) return;
    if (passed[i]) { openQuiz(i, true); return; }   // extra practice
    routeTo(marks[i]);                              // walk to that trial
  }
  function routeTo(target) {
    if (!ready || quizOpen || walking) return;
    if (flop === 'flat') { flopUp(function () { routeTo(target); }); return; }
    if (flop || !target) return;
    route = dijkstra({ e: cur.e, t: cur.t }, { e: target.e, t: target.t });
    hint.classList.add('is-gone');
  }
  function advance() {                 // space: head for the nearest open trial
    var best = null, bd = Infinity;
    var p = posXY();
    marks.forEach(function (m, i) {
      if (passed[i]) return;
      var d = Math.hypot(m.x - p.x, m.y - p.y);   // crow-flies triage
      if (d < bd) { bd = d; best = m; }
    });
    if (!best && realm.bossArea && realm.bossArea.length >= 3) {
      best = nearestOnGraph(
        realm.bossArea.reduce(function (s, q) { return s + q[0]; }, 0) / realm.bossArea.length * worldW,
        realm.bossArea.reduce(function (s, q) { return s + q[1]; }, 0) / realm.bossArea.length * worldH);
    }
    routeTo(best);
  }

  /* ---------- the waypoint quiz ---------- */
  var quizEl = document.getElementById('rw-quiz');
  var quizRank = 0, quizPractice = false;
  function quizItem() {
    var count = (realm.nodes || []).length || 1;
    return PRACTICE[(idx * 2 + quizRank + qOffset) % PRACTICE.length];
  }
  function openQuiz(rank, practice) {
    quizRank = rank;
    quizPractice = practice;
    quizOpen = true;
    renderQuiz();
    quizEl.hidden = false;
  }
  function renderQuiz() {
    var item = quizItem();
    document.getElementById('rw-quiz-kicker').textContent =
      (quizPractice ? 'EXTRA PRACTICE \u00B7 ' : '') + 'Waypoint ' + (quizRank + 1) + ' of ' + (realm.nodes || []).length;
    document.getElementById('rw-quiz-q').textContent = item.q;
    var box = document.getElementById('rw-quiz-choices');
    var feed = document.getElementById('rw-quiz-feedback');
    feed.textContent = '';
    feed.className = 'rw-quiz-feedback';
    document.getElementById('rw-quiz-continue').hidden = true;
    box.innerHTML = '';
    item.choices.forEach(function (choice, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = String.fromCharCode(65 + i) + '.  ' + choice;
      b.addEventListener('click', function (e) { e.stopPropagation(); answerQuiz(i, item); });
      box.appendChild(b);
    });
    window.__SQ_QUIZ = { rank: quizRank, practice: quizPractice, correctIndex: item.a };
  }
  function answerQuiz(i, item) {
    var feed = document.getElementById('rw-quiz-feedback');
    document.getElementById('rw-quiz-choices').querySelectorAll('button')
      .forEach(function (b) { b.disabled = true; });
    if (i === item.a) {
      feed.textContent = quizPractice ? 'Right again. Pomelo approves.' : 'Passed! The way forward is open.';
      feed.className = 'rw-quiz-feedback is-hit';
      if (!quizPractice && !passed[quizRank]) {
        passed[quizRank] = true;
        savePassed();
        syncNodeStates();
      }
      document.getElementById('rw-quiz-continue').hidden = false;
      if (window.SQSfx && window.SQSfx.correct) window.SQSfx.correct();
    } else {
      feed.textContent = 'The answer was ' + String.fromCharCode(65 + item.a) + ': ' +
        item.choices[item.a] + '. Here is another\u2026';
      feed.className = 'rw-quiz-feedback is-miss';
      qOffset += 1;
      setTimeout(function () { if (quizOpen) renderQuiz(); }, 1800);
      if (window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
    }
  }
  function closeQuiz() {
    quizOpen = false;
    quizEl.hidden = true;
    window.__SQ_QUIZ = null;
  }
  /* TEMP-SKIP (testing): a quiet pass; advances the waypoint like a
     correct answer, minus the fanfare */
  document.getElementById('rw-quiz-skip').addEventListener('click', function (e) {
    e.stopPropagation();
    document.getElementById('rw-quiz-choices').querySelectorAll('button')
      .forEach(function (b) { b.disabled = true; });
    var feed = document.getElementById('rw-quiz-feedback');
    feed.textContent = 'Skipped.';
    feed.className = 'rw-quiz-feedback';
    if (!quizPractice && !passed[quizRank]) {
      passed[quizRank] = true;
      savePassed();
      syncNodeStates();
    }
    document.getElementById('rw-quiz-continue').hidden = false;
  });
  document.getElementById('rw-quiz-close').addEventListener('click', function (e) {
    e.stopPropagation(); closeQuiz();
  });
  document.getElementById('rw-quiz-continue').addEventListener('click', function (e) {
    e.stopPropagation(); closeQuiz();
  });


  var ctx = null;
  try { ctx = capy.getContext('2d'); } catch (e) {}
  var FEET = 44 / 45; // the drawn feet row within the padded canvas height
  function drawCapy(frame) {
    if (!ctx || !window.SQCompanion) return;
    // some tween frames paint outside the 43x39 box, so clear the WHOLE
    // canvas under identity first — otherwise slivers persist as stray lines
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, capy.width, capy.height);
    if (facing === 1) ctx.setTransform(1, 0, 0, 1, 3, 6);
    else ctx.setTransform(-1, 0, 0, 1, 54, 6);   // mirror within the padded canvas
    window.SQCompanion.draw(ctx, frame);
  }

  /* ---------- click-to-flop: tap him, he naps ----------
     Frames 9-12 tween relaxed sit -> recline -> lying -> fully flat.
     Tap him again (or ask him to walk) and he gets back up first. */
  var flop = null; // null | 'down' | 'flat' | 'up'
  var flopTimers = [];
  function setFlop(v) { flop = v; window.__SQ_REALM_FLOP = v; }
  function clearFlopTimers() { flopTimers.forEach(clearTimeout); flopTimers = []; }
  function playSeq(frames, ms, done) {
    var i = 0;
    (function step() {
      if (i >= frames.length) { if (done) done(); return; }
      drawCapy(frames[i]);
      i += 1;
      flopTimers.push(setTimeout(step, ms));
    })();
  }
  function flopDown() {
    clearFlopTimers();
    setFlop('down');
    route = null;                         // he is going nowhere
    if (window.SQSfx && window.SQSfx.step) window.SQSfx.step();
    if (reduceMotion) { drawCapy(12); setFlop('flat'); return; }
    playSeq([9, 10, 11, 12], 140, function () { setFlop('flat'); });
  }
  function flopUp(then) {
    clearFlopTimers();
    setFlop('up');
    if (reduceMotion) { drawCapy(0); setFlop(null); idleT = 0; idleStep = 0; if (then) then(); return; }
    playSeq([11, 10, 9, 0], 120, function () {
      setFlop(null);
      idleT = 0; idleStep = 0;
      if (then) then();
    });
  }
  function capyHit(wx, wy) {
    var p = posXY();
    var left = p.x - capyW / 2 - 8;
    var top = p.y - capyH * FEET - 8;
    return wx >= left && wx <= left + capyW + 16 && wy >= top && wy <= top + capyH + 16;
  }

  function layout() {
    stageW = stage.clientWidth || 960;
    stageH = stage.clientHeight || 540;
    worldH = stageH;
    worldW = bg.naturalWidth
      ? Math.round(bg.naturalWidth / bg.naturalHeight * worldH)
      : Math.round(stageH * 21 / 9);          // synthetic width when art is missing
    world.style.width = worldW + 'px';
    capyW = capy.clientWidth || 120;
    capyH = capy.clientHeight || Math.round(capyW * 45 / 57);
    buildGraph();
    drawBossZone();
    layoutNodes();
    drawTrace();
  }

  var camNow = 0;
  var edCam = 0;   // in the editor, YOU drive the camera (arrows / A / D)
  function camera() {
    var camX;
    if (editing) {
      edCam = Math.min(Math.max(edCam, 0), Math.max(0, worldW - stageW));
      camX = edCam;
    } else {
      var p = posXY();
      camX = Math.min(Math.max(p.x - stageW * 0.42, 0), Math.max(0, worldW - stageW));
    }
    camNow = camX;
    world.style.transform = 'translate3d(' + (-camX) + 'px,0,0)';
    return camX;
  }

  function begin() {
    renderNodes();
    layout();
    var st = (realm.start && realm.start.length === 2)
      ? nearestOnGraph(realm.start[0] * worldW, realm.start[1] * worldH)
      : nearestOnGraph(worldW * 0.05, worldH * 0.5);
    cur = { e: st.e, t: st.t };
    route = null;
    placeCapy();
    drawCapy(0);
    camera();
    ready = true;
    veil.classList.add('is-gone');
    dressRealm();
    if (editing) enterEditor();
  }

  (function loadArt() {
    var srcs = realm.img.slice();
    var i = 0;
    bg.onerror = function () {
      if (i < srcs.length) { bg.src = srcs[i++]; return; }
      bg.remove();                              // dark stage, still walkable
      begin();
    };
    bg.onload = begin;
    bg.src = srcs[i++];
  })();

  function prefetchNext() {
    if (prefetched || idx >= REALMS.length - 1) return;
    prefetched = true;
    var srcs = REALMS[idx + 1].img.slice();
    var im = new Image();
    var i = 0;
    im.onerror = function () { if (i < srcs.length) im.src = srcs[i++]; };
    im.src = srcs[i++];
  }

  /* ---------- input ---------- */
  function worldPoint(e) {
    return { x: e.clientX + camNow, y: e.clientY };
  }
  stage.addEventListener('click', function (e) {
    if (e.target.closest('.rw-hud') || e.target.closest('.rw-popup') || e.target.closest('.rw-editor')) return;
    if (!ready) return;
    var w = worldPoint(e);
    if (editing) { editorClick(w, e); return; }
    if (!popup.hidden) { popup.hidden = true; return; }
    if (capyHit(w.x, w.y)) {                       // tapping him toggles the flop
      if (flop === 'flat') flopUp();
      else if (!flop) flopDown();
      return;
    }
    if (flop === 'flat') { flopUp(); return; }     // wake, but walking is space's job now
  });
  var KEYMAP = {
    ArrowRight: 'fwd', d: 'fwd', D: 'fwd',
    ArrowLeft: 'back', a: 'back', A: 'back',
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down'
  };
  document.addEventListener('keydown', function (e) {
    if (editing) { editorKey(e); return; }
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (quizOpen) {
        // space closes a passed quiz (the Continue button), otherwise waits
        if (!document.getElementById('rw-quiz-continue').hidden) closeQuiz();
        return;
      }
      advance();
    }
    var dir = KEYMAP[e.key];
    if (dir) {
      if (e.key.indexOf('Arrow') === 0) e.preventDefault();  // the page must not scroll
      if (quizOpen) return;
      if (flop) { if (flop === 'flat') flopUp(); return; }   // a step wakes him first
      held[dir] = true;
      hint.classList.add('is-gone');
    }
  });
  document.addEventListener('keyup', function (e) {
    var dir = KEYMAP[e.key];
    if (dir) held[dir] = false;
  });
  window.addEventListener('blur', function () {              // no stuck keys
    held.fwd = held.back = held.up = held.down = false;
  });
  window.addEventListener('resize', function () { if (ready) { layout(); placeCapy(); camera(); } });

  /* ---------- the walk (arc-length along the polyline) ---------- */
  var lastT = 0, stepT = 0, walkFrame = 1, idleT = 0, idleStep = 0;
  // stand, blink, and every so often settle in for a proper graze:
  // sit -> crouch -> graze -> chew, chew, a little more grass, back up
  // one-shot idle: stand and blink, settle in, ONE dip for grass, then chew
  // for a very long time (42 slow jaws, ~23s), and finally sit — and stay
  // sitting until asked to move. No second dip: chewing ends in rest.
  var IDLE = [
    [0, 1900], [3, 150], [0, 1250], [3, 150], [0, 900],
    [4, 700], [5, 220], [6, 900],
    [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560], [7, 560], [8, 560],
    [4, 999999]
  ];
  function dressRealm() {
    var cfg = realm.fx;
    var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!cfg || editing || rm) return;
    var fx = document.getElementById('rw-fx');
    if (fx && !fx.childElementCount) {
      (cfg.lamps || []).forEach(function (l) {
        var g = document.createElement('span');
        g.className = 'rw-glow';
        g.style.left = (l[0] * 100) + '%';
        g.style.top = (l[1] * 100) + '%';
        g.style.width = (l[2] * 2) + '%';    // aspect-ratio keeps it round
        fx.appendChild(g);
      });
    }
    var weather = document.getElementById('rw-weather');
    if (weather && !weather.childElementCount) {
      var palette = ['#c23b22', '#d95d39', '#a8341e', '#e07a3f'];
      for (var i = 0; i < (cfg.leaves || 0); i++) {
        var leaf = document.createElement('span');
        leaf.className = 'bf-leaf';
        leaf.style.left = (2 + Math.random() * 94).toFixed(1) + '%';
        leaf.style.color = palette[i % palette.length];
        leaf.style.animationDuration = (11 + Math.random() * 8).toFixed(1) + 's';
        leaf.style.animationDelay = (-Math.random() * 16).toFixed(1) + 's';
        weather.appendChild(leaf);
      }
    }
  }
  var zoneCX = null, zoneCY = null;
  function drawBossZone() {
    if (!bossZoneEl) return;
    bossZoneEl.width = worldW;
    bossZoneEl.height = worldH;
    var zc = null;
    try { zc = bossZoneEl.getContext('2d'); } catch (e) {}
    if (!zc || !realm.bossArea || realm.bossArea.length < 3) return;
    zoneCX = realm.bossArea.reduce(function (s, p) { return s + p[0]; }, 0) / realm.bossArea.length * worldW;
    zoneCY = realm.bossArea.reduce(function (s, p) { return s + p[1]; }, 0) / realm.bossArea.length * worldH;
    zc.beginPath();
    realm.bossArea.forEach(function (p, i) {
      var x = p[0] * worldW, y = p[1] * worldH;
      if (i === 0) zc.moveTo(x, y); else zc.lineTo(x, y);
    });
    zc.closePath();
    zc.fillStyle = 'rgba(242, 182, 60, 0.08)';
    zc.fill();
    zc.lineWidth = 3;
    zc.strokeStyle = 'rgba(242, 182, 60, 0.85)';
    zc.shadowColor = 'rgba(242, 182, 60, 0.8)';
    zc.shadowBlur = 14;
    zc.stroke();
    zc.shadowBlur = 0;
  }

  function tick(t) {
  function pointInBossArea(fx, fy) {
    var inside = false;
    for (var i = 0, k = realm.bossArea.length - 1; i < realm.bossArea.length; k = i++) {
      var a = realm.bossArea[i], b = realm.bossArea[k];
      if ((a[1] > fy) !== (b[1] > fy) &&
          fx < (b[0] - a[0]) * (fy - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  function inBossZone() {
    if (realm.bossArea && realm.bossArea.length >= 3) {
      // Pomelo is "there" when any part of him overlaps the room, not just
      // his soles: his feet ride the path, which often skirts BELOW the
      // room a human outlines around a doorway
      var p = posXY();
      var hw = (capyW * 0.4) / worldW;
      var probes = [
        [p.x / worldW, p.y / worldH],                                  // feet
        [p.x / worldW, (p.y - capyH * 0.5) / worldH],                  // body
        [p.x / worldW, (p.y - capyH * 0.9) / worldH],                  // head
        [p.x / worldW - hw, (p.y - capyH * 0.5) / worldH],             // rump side
        [p.x / worldW + hw, (p.y - capyH * 0.5) / worldH]              // nose side
      ];
      for (var i = 0; i < probes.length; i++) {
        if (pointInBossArea(probes[i][0], probes[i][1])) return true;
      }
      return false;
    }
    return posXY().x > worldW - stageW * 0.22;
  }
  window.requestAnimationFrame(tick);
    if (!ready || editing) return;
    var dt = Math.min(50, t - lastT || 16);
    lastT = t;
    if (flop) {                                    // napping: no walking, no idle
      camera();
      return;
    }
    var speed = stageH * 0.38 * (dt / 1000); // an unhurried capybara pace
    var hv = quizOpen ? null : heldVec();
    if (hv) route = null;                        // hands on: the route yields
    var moving = false, arrivedMarker = -1, dirSignT = 0;
    if (hv) {
      var ed0 = G.edges[cur.e];
      var pp = posXY();
      var eux = pp.dx / (ed0.len || 1), euy = pp.dy / (ed0.len || 1);
      var dt0 = eux * hv.x + euy * hv.y;
      var steer = null;
      if (Math.abs(dt0) > 0.25) {
        steer = { dirT: dt0 > 0 ? 1 : -1,
          next: function (node) { return pickAtNode(node, hv.x, hv.y); } };
      } else {
        var nearNode = cur.t < 0.06 ? ed0.a : (cur.t > 0.94 ? ed0.b : null);
        if (nearNode !== null) {
          var turn = pickAtNode(nearNode, hv.x, hv.y);
          if (turn && turn.e !== cur.e) {
            cur.e = turn.e; cur.t = turn.dir > 0 ? 0 : 1;
            steer = { dirT: turn.dir,
              next: function (node) { return pickAtNode(node, hv.x, hv.y); } };
          }
        }
      }
      if (steer) {
        dirSignT = steer.dirT;
        var res = moveAlong(reduceMotion ? speed * 3 : speed, steer);
        moving = true;
        if (res && res.stop === 'marker') { arrivedMarker = res.idx; moving = false; }
        if (res && res.stop === 'node') moving = false;
      }
    } else if (route && route.length) {
      var step0 = route[0];
      var edR = G.edges[step0.e];
      if (step0.e !== cur.e) { route = null; }   // desynced: stand down
      else {
        var lastStep = route.length === 1;
        var steerR = { dirT: step0.endT > cur.t ? 1 : -1, endT: step0.endT,
          atEnd: lastStep,
          next: function () {
            route.shift();
            if (!route.length) return null;
            var s2 = route[0];
            return { e: s2.e, dir: s2.endT >= 0.5 ? 1 : -1,
              endT: s2.endT, atEnd: route.length === 1 };
          } };
        dirSignT = steerR.dirT;
        var resR = moveAlong(reduceMotion ? speed * 3 : speed, steerR);
        moving = true;
        if (resR) {
          moving = false;
          if (resR.stop === 'marker') arrivedMarker = resR.idx;
          if (resR.stop === 'target' || resR.stop === 'node') {
            route = null;
            marks.forEach(function (m, i) {
              if (!passed[i] && m.e === cur.e &&
                  Math.abs(m.t - cur.t) * G.edges[cur.e].len < 3) arrivedMarker = i;
            });
          }
        }
      }
    }
    if (moving && !reduceMotion) {
      walking = true;
      var p = placeCapy();
      facing = dirSignT >= 0 ? (p.dx >= 0 ? 1 : -1) : (p.dx >= 0 ? -1 : 1);
      stepT += dt;
      if (stepT > 90) {    // busier still: a proper capybara scurry
        stepT = 0;
        walkFrame = walkFrame === 1 ? 2 : 1;
        drawCapy(walkFrame);
        if (window.SQSfx && window.SQSfx.step) window.SQSfx.step();
      }
    } else {
      if (reduceMotion && moving) placeCapy();
      if (arrivedMarker > -1) {
        placeCapy();
        walking = false; idleT = 0; idleStep = 0; drawCapy(0);
        if (!quizOpen) openQuiz(arrivedMarker, false);
      } else if (walking) {
        walking = false; idleT = 0; idleStep = 0; drawCapy(0);
      }
      idleT += dt;
      var fr = IDLE[Math.min(idleStep, IDLE.length - 1)];
      if (idleT > fr[1] && idleStep < IDLE.length - 1) {
        idleT = 0;
        idleStep += 1;
        drawCapy(IDLE[Math.min(idleStep, IDLE.length - 1)][0]);
      }
    }
    camera();
    if (posXY().x > worldW * 0.55) prefetchNext();
    if (!bossShown && inBossZone()) {
      bossShown = true;
      popup.hidden = false;
    }
    if (bossZoneEl && zoneCX !== null) {   // the outline reveals itself as he nears
      var zp = posXY();
      var near = Math.abs(zp.x - zoneCX) < stageW * 0.6 && Math.abs(zp.y - zoneCY) < stageH * 0.8;
      bossZoneEl.classList.toggle('is-near', near);
    }
    window.__SQ_TICKS = (window.__SQ_TICKS || 0) + 1;   // proof the whole tick ran
    var xy = posXY();
    window.__SQ_REALM_XY = [Math.round(xy.x), Math.round(xy.y)];
    window.__SQ_REALM_POS = { e: cur.e, t: Math.round(cur.t * 1000) / 1000 };
  }
  window.requestAnimationFrame(tick);

  /* ============================================================
     PATH EDITOR — a graph of nodes and paths, select-first.
     Click a node or a path: it selects (red). Selected node +
     click another node = connect; selected node + click empty =
     new connected node (tracing). Delete removes a node WITH its
     paths, or just the selected path. Drag moves nodes only.
     Tools: 1 walk graph · 2 trial markers · 3 start · 4 boss.
     S toggles stairs on a selected path. Z = undo. No modes.
     ============================================================ */
  var edG = null, edMk = [], edStart = null, edBossA = [];
  var edMode = 'graph';
  var ED_MODES = ['graph', 'marks', 'start', 'boss'];
  var ED_LABEL = {
    graph: 'Walk graph (1)',
    marks: 'Trial markers (2)',
    start: 'START point (3)',
    boss: 'Boss room (4)'
  };
  var edBar = null;
  var edSel = null;                 // {kind:'gnode'|'gedge'|'mark'|'start'|'boss', i}
  var edHov = null;                 // same shape, aiming feedback
  var GRAB = 12, EDGEGRAB = 8;
  var edUndo = [];
  var edDrag = false, edDragMoved = false, edPendingSnap = null;
  var edDragCand = null;            // armed by mousedown; selection stays untouched
  var edDownX = 0, edDownY = 0;     // real mice jitter: a drag needs >4px

  function edSnapshot() {
    return JSON.stringify({ g: edG, mk: edMk, st: edStart, bo: edBossA });
  }
  function pushUndo(snap) {
    edUndo.push(snap || edSnapshot());
    if (edUndo.length > 60) edUndo.shift();
  }
  function popUndo() {
    var u = edUndo.pop();
    if (!u) return;
    var o = JSON.parse(u);
    edG = o.g; edMk = o.mk; edStart = o.st; edBossA = o.bo;
    edSel = null; edHov = null;
  }

  function gW(i) { return [edG.nodes[i][0] * worldW, edG.nodes[i][1] * worldH]; }
  function edNodeAt(w) {
    var best = -1, bd = GRAB * GRAB;
    edG.nodes.forEach(function (n, i) {
      var d = Math.pow(n[0] * worldW - w.x, 2) + Math.pow(n[1] * worldH - w.y, 2);
      if (d <= bd) { bd = d; best = i; }
    });
    return best;
  }
  function edEdgeAt(w) {
    var best = -1, bd = EDGEGRAB * EDGEGRAB;
    edG.edges.forEach(function (e, i) {
      var a = gW(e[0]), b = gW(e[1]);
      var vx = b[0] - a[0], vy = b[1] - a[1];
      var L2 = vx * vx + vy * vy || 1;
      var t = ((w.x - a[0]) * vx + (w.y - a[1]) * vy) / L2;
      if (t <= 0.04 || t >= 0.96) return;      // node zones aren't the line
      var d = Math.pow(w.x - (a[0] + vx * t), 2) + Math.pow(w.y - (a[1] + vy * t), 2);
      if (d <= bd) { bd = d; best = i; }
    });
    return best;
  }
  function edPointAt(arr, w) {
    var best = -1, bd = GRAB * GRAB;
    arr.forEach(function (p, i) {
      var d = Math.pow(p[0] * worldW - w.x, 2) + Math.pow(p[1] * worldH - w.y, 2);
      if (d <= bd) { bd = d; best = i; }
    });
    return best;
  }
  function edSnapToGraph(w) {       // markers and start ride the walk lines
    var best = null;
    edG.edges.forEach(function (e) {
      var a = gW(e[0]), b = gW(e[1]);
      var vx = b[0] - a[0], vy = b[1] - a[1];
      var L2 = vx * vx + vy * vy || 1;
      var t = Math.min(Math.max(((w.x - a[0]) * vx + (w.y - a[1]) * vy) / L2, 0), 1);
      var px = a[0] + vx * t, py = a[1] + vy * t;
      var d = Math.pow(w.x - px, 2) + Math.pow(w.y - py, 2);
      if (!best || d < best.d) best = { d: d, p: [px / worldW, py / worldH] };
    });
    return best ? best.p : [w.x / worldW, w.y / worldH];
  }
  function edConnect(a, b) {        // add path a-b unless it exists
    if (a === b) return false;
    var dup = edG.edges.some(function (e) {
      return (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a);
    });
    if (!dup) edG.edges.push([a, b]);
    return !dup;
  }
  function edDeleteNode(i) {        // the node goes, and every attached path
    var remap = [];
    edG.edges.forEach(function (e, ei) { if (e[0] === i || e[1] === i) remap.push(ei); });
    edG.stairs = edG.stairs
      .filter(function (s) { return remap.indexOf(s) === -1; })
      .map(function (s) { return s - remap.filter(function (r) { return r < s; }).length; });
    edG.edges = edG.edges.filter(function (e) { return e[0] !== i && e[1] !== i; });
    edG.edges.forEach(function (e) {
      if (e[0] > i) e[0] -= 1;
      if (e[1] > i) e[1] -= 1;
    });
    edG.nodes.splice(i, 1);
  }
  function edDeleteEdge(i) {        // the path only; its nodes remain
    edG.stairs = edG.stairs
      .filter(function (s) { return s !== i; })
      .map(function (s) { return s > i ? s - 1 : s; });
    edG.edges.splice(i, 1);
  }
  function afterEdit() {
    if (window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
    drawTrace(); syncEditorBar();
  }

  function drawTrace() {
    if (!trace) return;
    trace.width = worldW;
    trace.height = worldH;
    var tc = null;
    try { tc = trace.getContext('2d'); } catch (e) {}
    if (!tc || !editing || !edG) return;
    var SELRED = '#ff5148';
    edG.edges.forEach(function (e, i) {
      var a = gW(e[0]), b = gW(e[1]);
      var sel = edSel && edSel.kind === 'gedge' && edSel.i === i;
      tc.lineWidth = sel ? 7 : (edG.stairs.indexOf(i) > -1 ? 6 : 4);
      tc.strokeStyle = sel ? SELRED
        : (edG.stairs.indexOf(i) > -1 ? 'rgba(180,140,232,0.9)' : 'rgba(242,182,60,0.9)');
      tc.beginPath(); tc.moveTo(a[0], a[1]); tc.lineTo(b[0], b[1]); tc.stroke();
    });
    edG.nodes.forEach(function (n, i) {
      var sel = edSel && edSel.kind === 'gnode' && edSel.i === i;
      tc.fillStyle = sel ? SELRED : '#f2d493';
      tc.strokeStyle = sel ? SELRED : '#4b1e09';
      tc.lineWidth = 2;
      tc.fillRect(n[0] * worldW - 6, n[1] * worldH - 6, 12, 12);
      tc.strokeRect(n[0] * worldW - 6, n[1] * worldH - 6, 12, 12);
    });
    edMk.forEach(function (p, i) {
      var sel = edSel && edSel.kind === 'mark' && edSel.i === i;
      tc.fillStyle = sel ? SELRED : '#7FE3C0';
      tc.beginPath();
      tc.arc(p[0] * worldW, p[1] * worldH, 8, 0, Math.PI * 2);
      tc.fill();
    });
    if (edBossA.length) {
      tc.lineWidth = 3;
      tc.strokeStyle = 'rgba(242,182,60,0.8)';
      tc.beginPath();
      edBossA.forEach(function (p, i) {
        if (i === 0) tc.moveTo(p[0] * worldW, p[1] * worldH);
        else tc.lineTo(p[0] * worldW, p[1] * worldH);
      });
      if (edBossA.length > 2) tc.closePath();
      tc.stroke();
      edBossA.forEach(function (p, i) {
        var sel = edSel && edSel.kind === 'boss' && edSel.i === i;
        tc.fillStyle = sel ? SELRED : '#f2b63c';
        tc.fillRect(p[0] * worldW - 5, p[1] * worldH - 5, 10, 10);
      });
    }
    if (edStart) {
      var sel2 = edSel && edSel.kind === 'start';
      tc.fillStyle = sel2 ? SELRED : '#7fd0f2';
      tc.beginPath();
      tc.arc(edStart[0] * worldW, edStart[1] * worldH, 9, 0, Math.PI * 2);
      tc.fill();
    }
    if (edHov && !(edSel && edSel.kind === edHov.kind && edSel.i === edHov.i)) {
      var hp = edHov.kind === 'gnode' ? edG.nodes[edHov.i]
        : edHov.kind === 'mark' ? edMk[edHov.i]
        : edHov.kind === 'boss' ? edBossA[edHov.i]
        : edHov.kind === 'start' ? edStart : null;
      if (hp) {
        tc.lineWidth = 1.5;
        tc.strokeStyle = 'rgba(255,217,122,0.7)';
        tc.beginPath();
        tc.arc(hp[0] * worldW, hp[1] * worldH, 12, 0, Math.PI * 2);
        tc.stroke();
      }
    }
  }

  function hitTest(w) {             // what the active tool sees under the mouse
    if (edMode === 'graph') {
      var n = edNodeAt(w);
      if (n > -1) return { kind: 'gnode', i: n };
      var e = edEdgeAt(w);
      if (e > -1) return { kind: 'gedge', i: e };
      return null;
    }
    if (edMode === 'marks') {
      var m = edPointAt(edMk, w);
      return m > -1 ? { kind: 'mark', i: m } : null;
    }
    if (edMode === 'start') {
      return (edStart && edPointAt([edStart], w) === 0) ? { kind: 'start', i: 0 } : null;
    }
    var b = edPointAt(edBossA, w);
    return b > -1 ? { kind: 'boss', i: b } : null;
  }
  function sameSel(a, b) { return a && b && a.kind === b.kind && a.i === b.i; }

  var hoverRaf = 0;
  stage.addEventListener('mousemove', function (e) {
    if (!editing || !edG) return;
    var w = worldPoint(e);
    if (edDrag) {
      if (!edDragMoved && Math.hypot(w.x - edDownX, w.y - edDownY) <= 4) return;
      if (edPendingSnap) { pushUndo(edPendingSnap); edPendingSnap = null; }
      edDragMoved = true;
      edSel = edDragCand;                       // a real drag selects what it grabs
      if (edSel.kind === 'gnode') {
        edG.nodes[edSel.i] = [w.x / worldW, w.y / worldH];
      } else if (edSel.kind === 'mark') {
        edMk[edSel.i] = edSnapToGraph(w);
      } else if (edSel.kind === 'start') {
        edStart = edSnapToGraph(w);
      } else if (edSel.kind === 'boss') {
        edBossA[edSel.i] = [w.x / worldW, w.y / worldH];
      }
      drawTrace(); syncEditorBar();
      return;
    }
    if (hoverRaf) return;
    hoverRaf = window.requestAnimationFrame(function () {
      hoverRaf = 0;
      var prev = edHov;
      edHov = hitTest(w);
      if (edHov && edHov.kind === 'gedge') edHov = null;   // edges get no ring
      if (JSON.stringify(prev) !== JSON.stringify(edHov)) drawTrace();
    });
  });
  stage.addEventListener('mousedown', function (e) {
    if (!editing || !edG) return;
    if (e.target.closest('.rw-editor') || e.target.closest('.rw-hud')) return;
    var w = worldPoint(e);
    var h = hitTest(w);
    if (h && h.kind !== 'gedge') {              // paths cannot be dragged
      edDragCand = h;                           // armed, but NOT selected yet:
      edDrag = true; edDragMoved = false;       // the click decides selection,
      edDownX = w.x; edDownY = w.y;             // so node -> node connect survives
      edPendingSnap = edSnapshot();             // undo lands only if it moves
    }
  });
  document.addEventListener('mouseup', function () {
    if (edDrag) { edDrag = false; edDragCand = null; edPendingSnap = null; }
  });

  function editorClick(w) {
    if (edDragMoved) { edDragMoved = false; return; }   // that was a drag
    var h = hitTest(w);
    if (edMode === 'graph') {
      if (h && h.kind === 'gnode') {
        if (edSel && edSel.kind === 'gnode') {
          if (edSel.i === h.i) { edSel = null; drawTrace(); return; }  // toggle off
          pushUndo();                            // node -> node: connect them
          edConnect(edSel.i, h.i);
          edSel = h;                             // chaining continues here
          afterEdit();
          return;
        }
        edSel = h; drawTrace(); return;          // select the node
      }
      if (h && h.kind === 'gedge') { edSel = h; drawTrace(); return; }
      pushUndo();                                // empty ground: a new node...
      edG.nodes.push([w.x / worldW, w.y / worldH]);
      var ni = edG.nodes.length - 1;
      if (edSel && edSel.kind === 'gnode') edConnect(edSel.i, ni);  // ...already connected
      edSel = { kind: 'gnode', i: ni };
      afterEdit();
      return;
    }
    if (h) { edSel = h; drawTrace(); return; }   // other tools: select
    pushUndo();
    if (edMode === 'marks') { edMk.push(edSnapToGraph(w)); edSel = { kind: 'mark', i: edMk.length - 1 }; }
    else if (edMode === 'start') { edStart = edSnapToGraph(w); edSel = { kind: 'start', i: 0 }; }
    else { edBossA.push([w.x / worldW, w.y / worldH]); edSel = { kind: 'boss', i: edBossA.length - 1 }; }
    afterEdit();
  }
  function cycleMode() {
    edMode = ED_MODES[(ED_MODES.indexOf(edMode) + 1) % ED_MODES.length];
    edSel = null; edHov = null;
    drawTrace(); syncEditorBar();
  }
  function editorKey(e) {
    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      popUndo();
      drawTrace(); syncEditorBar();
    }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      if (!edSel) return;                        // delete needs a selection
      pushUndo();
      if (edSel.kind === 'gnode') edDeleteNode(edSel.i);
      else if (edSel.kind === 'gedge') edDeleteEdge(edSel.i);
      else if (edSel.kind === 'mark') edMk.splice(edSel.i, 1);
      else if (edSel.kind === 'start') edStart = null;
      else if (edSel.kind === 'boss') edBossA.splice(edSel.i, 1);
      edSel = null;
      drawTrace(); syncEditorBar();
    }
    if (e.key === 's' || e.key === 'S') {        // stairs live on selected paths
      if (edSel && edSel.kind === 'gedge') {
        pushUndo();
        var at = edG.stairs.indexOf(edSel.i);
        if (at > -1) edG.stairs.splice(at, 1); else edG.stairs.push(edSel.i);
        drawTrace(); syncEditorBar();
      }
    }
    if (e.key === 'Escape') { edSel = null; edHov = null; drawTrace(); }
    if (e.key === 'c' || e.key === 'C') {
      pushUndo();
      if (edMode === 'graph') edG = { nodes: [], edges: [], stairs: [] };
      else if (edMode === 'marks') edMk = [];
      else if (edMode === 'start') edStart = null;
      else edBossA = [];
      edSel = null;
      drawTrace(); syncEditorBar();
    }
    if (e.key === 'n' || e.key === 'N') cycleMode();
    var digits = { '1': 'graph', '2': 'marks', '3': 'start', '4': 'boss' };
    if (digits[e.key]) { edMode = digits[e.key]; edSel = null; edHov = null; drawTrace(); syncEditorBar(); }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      edCam += stageW * 0.35; camera(); e.preventDefault();
    }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      edCam -= stageW * 0.35; camera(); e.preventDefault();
    }
  }
  function edJSON() {
    var r3 = function (p) { return [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000]; };
    return JSON.stringify({
      realm: realm.id,
      path: { nodes: edG.nodes.map(r3), edges: edG.edges, stairs: edG.stairs },
      nodes: edMk.map(r3),
      start: edStart ? r3(edStart) : null,
      bossArea: edBossA.map(r3)
    });
  }
  function syncEditorBar() {
    if (!edBar) return;
    edBar.querySelector('#rw-ed-mode').textContent =
      ED_LABEL[edMode] + (edSel ? ' \u00B7 selected: ' +
        (edSel.kind === 'gnode' ? 'node' : edSel.kind === 'gedge' ? 'path' : edSel.kind) : '');
    edBar.querySelector('#rw-ed-count').textContent =
      edG.nodes.length + ' nodes \u00B7 ' + edG.edges.length + ' paths \u00B7 ' +
      edG.stairs.length + ' stairs \u00B7 ' + edMk.length + ' trials \u00B7 ' +
      edBossA.length + ' boss pts \u00B7 start ' + (edStart ? '\u2713' : '\u2014');
    edBar.querySelector('#rw-ed-json').value = edJSON();
  }
  function enterEditor() {
    document.body.classList.add('is-editing');
    // seed from committed data (legacy chains arrive pre-migrated as GN)
    edG = JSON.parse(JSON.stringify(GN));
    edMk = (realm.nodes || []).map(function (p) { return p.slice(); });
    edBossA = (realm.bossArea || []).map(function (p) { return p.slice(); });
    edStart = realm.start ? realm.start.slice() : null;
    edBar = document.createElement('div');
    edBar.className = 'rw-editor pixel-frame';
    edBar.innerHTML =
      '<p class="rw-ed-head type-utility">PATH EDITOR \u00B7 <span id="rw-ed-mode"></span> \u00B7 <span id="rw-ed-count"></span>' +
      '<button class="rw-ed-min type-utility" id="rw-ed-min" type="button" title="Minimize">\u2013</button></p>' +
      '<div class="rw-ed-legend type-utility">' +
        '<span><b>1\u20134</b> tools</span>' +
        '<span><b>click</b> select (red) \u00B7 empty adds</span>' +
        '<span><b>node\u2192node</b> connects</span>' +
        '<span><b>sel+empty</b> extends</span>' +
        '<span><b>drag</b> move node</span>' +
        '<span><b>del</b> node+paths / path only</span>' +
        '<span><b>S</b> stairs on path</span>' +
        '<span><b>Z</b> undo</span>' +
        '<span><b>esc</b> deselect</span>' +
        '<span><b>\u2190\u2192</b> pan</span>' +
      '</div>' +
      '<textarea id="rw-ed-json" class="type-utility" readonly rows="2"></textarea>' +
      '<div class="rw-ed-row">' +
        '<button class="btn btn-outline" id="rw-ed-toggle" type="button">Next tool (N)</button>' +
        '<button class="btn btn-outline" id="rw-ed-copy" type="button">Copy JSON</button>' +
        '<button class="btn btn-gold" id="rw-ed-save" type="button">Save preview &amp; walk it</button>' +
      '</div>';
    stage.appendChild(edBar);
    edBar.querySelector('#rw-ed-min').addEventListener('click', function (e) {
      e.stopPropagation();
      var min = edBar.classList.toggle('is-min');
      this.textContent = min ? '+' : '\u2013';
      this.title = min ? 'Expand' : 'Minimize';
    });
    edBar.querySelector('#rw-ed-toggle').addEventListener('click', function (e) {
      e.stopPropagation();
      cycleMode();
    });
    edBar.querySelector('#rw-ed-copy').addEventListener('click', function (e) {
      e.stopPropagation();
      var ta = edBar.querySelector('#rw-ed-json');
      ta.select();
      try { navigator.clipboard.writeText(ta.value); } catch (err) { document.execCommand('copy'); }
      this.textContent = 'Copied!';
    });
    edBar.querySelector('#rw-ed-save').addEventListener('click', function (e) {
      e.stopPropagation();
      if (edG.edges.length < 1) {
        this.textContent = 'Trace something first';
        return;
      }
      try {
        window.localStorage.setItem(PREVIEW_KEY, edJSON());
      } catch (err) {}
      window.location.href = 'realm.html?realm=' + realm.id;
    });
    drawTrace();
    syncEditorBar();
  }
})();
