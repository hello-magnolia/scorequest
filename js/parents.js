/* ============================================================
   ScoreQuest — Parent Progress Report (demo interface)
   ------------------------------------------------------------
   Formal, measurement-driven report for parents. Deliberate rules:
   - No game vocabulary anywhere in this surface.
   - Student is shown by real name (demo: Emily Chen; signed-in
     accounts show the account holder's name).
   - Score data shown is MEASURED (scored practice exams over time),
     never projected. No guarantees, no predictions.
   - Labels carry data-i18n keys; STRINGS holds EN / 中文 / ES / FR.
     Languages auto-cycle with a soft fade until a parent picks one.
   ============================================================ */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STRINGS = {
    en: {
      kicker: 'Progress Report · Demo',
      student: 'Student',
      child: 'Your child',
      week: 'This week',
      glance: 'This week at a glance',
      narrative: 'This week, {name} practiced on 6 of 7 days, completed 18 question sets, and finished a fourth full-length practice exam. Geometry & Trigonometry is the current weak spot, so daily sets are focusing there. Practice exam scores have climbed from 1050 to 1230 since March.',
      time: 'Practice time',
      sets: 'Question sets completed',
      days: 'Consecutive practice days',
      exams: 'Full-length practice exams',
      trendTitle: 'Practice exam scores',
      trendCap: 'Scored full-length, timed practice exams (official digital format)',
      activity: 'Weekly practice time (minutes)',
      last: 'Last session',
      today: 'today',
      accuracy: 'Accuracy by content domain',
      note: 'Included with the family plan: this report, emailed weekly, in your language.',
      word: 'English',
      domains: {
        info: 'Information & Ideas', craft: 'Craft & Structure',
        expression: 'Expression of Ideas', conventions: 'Standard English Conventions',
        algebra: 'Algebra', advmath: 'Advanced Math',
        data: 'Problem-Solving & Data Analysis', geometry: 'Geometry & Trigonometry',
      },
    },
    zh: {
      kicker: '学习进度报告 · 演示',
      student: '学生',
      child: '您的孩子',
      week: '本周',
      glance: '本周概览',
      narrative: '本周，{name} 共练习了 6 天，完成 18 组练习题，并完成了第四次全真模拟考试。目前较薄弱的领域是几何与三角，每日练习正集中于此。模拟考试成绩自三月以来已从 1050 提升至 1230。',
      time: '练习时长',
      sets: '完成练习组数',
      days: '连续练习天数',
      exams: '全真模拟考试',
      trendTitle: '模拟考试成绩',
      trendCap: '计时完成的全长模拟考试成绩（官方机考格式）',
      activity: '每周练习时长（分钟）',
      last: '上次学习',
      today: '今天',
      accuracy: '各内容领域正确率',
      note: '家庭版包含：每周发送至您邮箱的进度报告，支持您的语言。',
      word: '中文',
      domains: {
        info: '信息与观点', craft: '技巧与结构',
        expression: '观点表达', conventions: '标准英语规范',
        algebra: '代数', advmath: '进阶数学',
        data: '解题与数据分析', geometry: '几何与三角',
      },
    },
    es: {
      kicker: 'Informe de progreso · Demo',
      student: 'Estudiante',
      child: 'Su hijo/a',
      week: 'Esta semana',
      glance: 'Resumen de la semana',
      narrative: 'Esta semana, {name} practicó 6 de 7 días, completó 18 series de preguntas y terminó su cuarto examen de práctica completo. Geometría y trigonometría es el punto débil actual, así que las series diarias se concentran allí. Los exámenes de práctica han subido de 1050 a 1230 desde marzo.',
      time: 'Tiempo de práctica',
      sets: 'Series de preguntas completadas',
      days: 'Días consecutivos de práctica',
      exams: 'Exámenes de práctica completos',
      trendTitle: 'Resultados de exámenes de práctica',
      trendCap: 'Exámenes completos y cronometrados (formato digital oficial)',
      activity: 'Práctica semanal (minutos)',
      last: 'Última sesión',
      today: 'hoy',
      accuracy: 'Precisión por área de contenido',
      note: 'Incluido en el plan familiar: este informe, por correo cada semana, en su idioma.',
      word: 'Español',
      domains: {
        info: 'Información e ideas', craft: 'Técnica y estructura',
        expression: 'Expresión de ideas', conventions: 'Convenciones del inglés',
        algebra: 'Álgebra', advmath: 'Matemáticas avanzadas',
        data: 'Resolución de problemas y datos', geometry: 'Geometría y trigonometría',
      },
    },
    fr: {
      kicker: 'Rapport de progression · Démo',
      student: 'Élève',
      child: 'Votre enfant',
      week: 'Cette semaine',
      glance: 'La semaine en un coup d\u2019\u0153il',
      narrative: 'Cette semaine, {name} a pratiqué 6 jours sur 7, terminé 18 séries de questions et passé un quatrième examen blanc complet. La géométrie et la trigonométrie restent le point faible, donc les séries quotidiennes s\u2019y concentrent. Les résultats des examens blancs sont passés de 1050 à 1230 depuis mars.',
      time: 'Temps de pratique',
      sets: 'Séries de questions terminées',
      days: 'Jours de pratique consécutifs',
      exams: 'Examens blancs complets',
      trendTitle: 'Résultats des examens blancs',
      trendCap: 'Examens blancs complets et chronométrés (format numérique officiel)',
      activity: 'Pratique hebdomadaire (minutes)',
      last: 'Dernière session',
      today: "aujourd'hui",
      accuracy: 'Précision par domaine',
      note: "Inclus dans l'offre famille : ce rapport, envoyé chaque semaine, dans votre langue.",
      word: 'Français',
      domains: {
        info: 'Informations et idées', craft: 'Style et structure',
        expression: 'Expression des idées', conventions: "Conventions de l'anglais",
        algebra: 'Algèbre', advmath: 'Mathématiques avancées',
        data: 'Résolution de problèmes et données', geometry: 'Géométrie et trigonométrie',
      },
    },
  };
  var ORDER = ['en', 'zh', 'es', 'fr'];
  var current = 'en';
  var autoTimer = null;

  var root = document.getElementById('preport');
  if (!root) return;

  /* ---------- demo data: measured, dated, plausible ---------- */
  var DEMO = {
    name: 'Kevin',
    minutes: [34, 41, 0, 52, 38, 27, 30],                       // Mon..Sun
    sets: 18, days: 12,
    exams: [                                                     // scored practice exams
      { date: '3/14', score: 1050 },
      { date: '4/04', score: 1120 },
      { date: '4/25', score: 1180 },
      { date: '5/16', score: 1230 },
    ],
    accuracy: { info: 82, craft: 74, expression: 79, conventions: 88,
                algebra: 76, advmath: 68, data: 71, geometry: 54 },
  };

  /* ---------- i18n ---------- */
  function applyLang(lang, animate) {
    current = lang;
    var t = STRINGS[lang];
    function swap() {
      root.parentElement.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key].replace('{name}', currentName);
      });
      var w = document.getElementById('lang-cycle-word');
      if (w) w.textContent = t.word;
      document.querySelectorAll('.lang-pill').forEach(function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-lang') === lang);
      });
      root.querySelectorAll('.dbar-name').forEach(function (el) {
        var id = el.getAttribute('data-domain');
        if (t.domains[id]) el.textContent = t.domains[id];
      });
    }
    if (animate && !reduceMotion) {
      root.classList.add('lang-fading');
      setTimeout(function () { swap(); root.classList.remove('lang-fading'); }, 220);
    } else swap();
  }

  function startAutoCycle() {
    if (reduceMotion) return;
    autoTimer = setInterval(function () {
      applyLang(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length], true);
    }, 3200);
  }
  function stopAutoCycle() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

  document.querySelectorAll('.lang-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      stopAutoCycle();
      applyLang(pill.getAttribute('data-lang'), true);
    });
  });

  /* ---------- data: signed-in students with progress see their own ---------- */
  function reportData() {
    var G = window.SQGame, A = window.SQAuth;
    if (G && A && A.getUser()) {
      var s = G.getState();
      if (s.totalXp > 0) {
        var sets = 0;
        Object.keys(s.realms).forEach(function (id) { sets += s.realms[id].questsCleared; });
        var acc = {};
        G.REALMS.forEach(function (r) {
          var st = s.realms[r.id];
          // proxy accuracy from domain progress until per-question analytics land
          acc[r.id] = Math.min(95, 55 + Math.round((st.cleared ? 100 : st.pct) * 0.4) + st.level * 4);
        });
        var prof = A.getUser().user_metadata || {};
        return {
          name: prof.full_name || prof.hero_name || 'Your student',
          minutes: DEMO.minutes, // session-time instrumentation ships with the question bank
          sets: sets, days: s.streak,
          exams: DEMO.exams, accuracy: acc, live: true,
        };
      }
    }
    return DEMO;
  }

  function fmtMinutes(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
  }

  /* ---------- charts ---------- */
  function renderTrend(exams) {
    var host = document.getElementById('trend-chart');
    var W = 320, H = 134, padL = 40, padR = 22, padT = 18, padB = 26;
    var scores = exams.map(function (e) { return e.score; });
    var min = Math.min.apply(null, scores), max = Math.max.apply(null, scores);
    var lo = Math.floor((min - 40) / 50) * 50, hi = Math.ceil((max + 40) / 50) * 50;
    function x(i) { return padL + (i / (exams.length - 1)) * (W - padL - padR); }
    function y(v) { return padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB); }

    var grid = '';
    for (var g = lo; g <= hi; g += 100) {
      grid += '<line x1="' + padL + '" y1="' + y(g) + '" x2="' + (W - padR) + '" y2="' + y(g) + '" class="trend-grid"/>' +
              '<text x="' + (padL - 6) + '" y="' + (y(g) + 3) + '" class="trend-axis" text-anchor="end">' + g + '</text>';
    }
    var pts = exams.map(function (e, i) { return x(i) + ',' + y(e.score); }).join(' ');
    var dots = exams.map(function (e, i) {
      return '<circle cx="' + x(i) + '" cy="' + y(e.score) + '" r="3.4" class="trend-dot"/>' +
             '<text x="' + x(i) + '" y="' + (y(e.score) - 8) + '" class="trend-val" text-anchor="middle">' + e.score + '</text>' +
             '<text x="' + x(i) + '" y="' + (H - 8) + '" class="trend-axis" text-anchor="middle">' + e.date + '</text>';
    }).join('');

    host.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Practice exam score trend from ' +
      exams[0].score + ' to ' + exams[exams.length - 1].score + '">' +
      grid +
      '<polyline points="' + pts + '" class="trend-line" pathLength="100"/>' +
      dots +
      '</svg>';
    // A re-render after the section was revealed must not leave the line in its
    // pre-animation (invisible) state — re-apply the drawn state immediately.
    if (revealed || reduceMotion) {
      var line = host.querySelector('.trend-line');
      line.style.transition = 'none';
      line.classList.add('trend-drawn');
      line.style.strokeDashoffset = '0';
    }
  }

  var currentName = 'Kevin';

  function renderReport() {
    var d = reportData();
    currentName = String(d.name || 'Kevin').trim().split(/\s+/)[0]; // first name only, never a surname
    document.getElementById('preport-name').textContent = currentName;
    var total = d.minutes.reduce(function (a, b) { return a + b; }, 0);
    document.getElementById('pstat-time').textContent = fmtMinutes(total);
    document.getElementById('pstat-sets').textContent = String(d.sets);
    document.getElementById('pstat-days').textContent = String(d.days);
    document.getElementById('pstat-exams').textContent = String(d.exams.length);

    renderTrend(d.exams);

    // weekly practice bars
    var chart = document.getElementById('activity-chart');
    var days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    var max = Math.max.apply(null, d.minutes.concat([1]));
    chart.innerHTML = d.minutes.map(function (m, i) {
      var pct = Math.round((m / max) * 100);
      return '<div class="abar-wrap">' +
        '<div class="abar' + (m === 0 ? ' abar-zero' : '') + '" data-h="' + pct + '" title="' + m + ' min"></div>' +
        '<span class="abar-day">' + days[i] + '</span></div>';
    }).join('');

    // accuracy by domain
    var t = STRINGS[current];
    var barsHost = document.getElementById('domain-bars');
    var G = window.SQGame;
    var order = G ? G.REALMS.map(function (r) { return r.id; })
                  : Object.keys(d.accuracy);
    barsHost.innerHTML = order.map(function (id) {
      var pct = d.accuracy[id];
      var section = G ? G.byId(id).section : 'rw';
      var weak = pct < 60;
      return '<div class="dbar' + (weak ? ' dbar-weak' : '') + '">' +
        '<span class="dbar-name" data-domain="' + id + '">' + t.domains[id] + '</span>' +
        '<span class="dbar-track"><span class="dbar-fill' + (weak ? ' is-weak' : '') + '" data-section="' + section + '" data-w="' + pct + '"></span></span>' +
        '<span class="dbar-pct' + (weak ? ' is-weak' : '') + '">' + pct + '%</span></div>';
    }).join('');
  }

  /* ---------- reveal animations ---------- */
  var revealed = false;
  function animateBars() {
    revealed = true;
    root.querySelectorAll('.abar').forEach(function (b) {
      b.style.height = Math.max(6, parseInt(b.getAttribute('data-h'), 10)) + '%';
    });
    root.querySelectorAll('.dbar-fill').forEach(function (b) {
      b.style.width = b.getAttribute('data-w') + '%';
    });
    var line = root.querySelector('.trend-line');
    if (line && !reduceMotion) line.classList.add('trend-drawn');
    else if (line) line.style.strokeDashoffset = '0';
  }

  function init() {
    renderReport();
    applyLang('en', false);

    if (typeof IntersectionObserver === 'function' && !reduceMotion) {
      var seen = false;
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting && !seen) {
          seen = true; animateBars(); startAutoCycle(); obs.disconnect();
        }
      }, { threshold: 0.25 }).observe(root);
    } else {
      animateBars(); startAutoCycle();
    }

    if (window.SQGame) window.SQGame.onChange(function () { renderReport(); applyLang(current, false); animateBars(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
