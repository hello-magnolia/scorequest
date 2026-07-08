/* ============================================================
   ScoreQuest — Parent Scroll (demo dashboard) + language cycling
   ------------------------------------------------------------
   - Labels carry data-i18n keys; STRINGS holds EN / 中文 / ES / FR.
   - Languages auto-cycle with a soft fade until a parent picks one
     with the pills (then auto-cycling stops — their choice wins).
   - Stats blend: if a signed-in hero has real progress, quests /
     streak / realm bars reflect it; otherwise a demo hero is shown.
   - Deliberately reports EFFORT metrics only (time, quests, streaks,
     activity) — no projected-score claims.
   ============================================================ */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STRINGS = {
    en: {
      kicker: 'Parent Scroll · demo preview',
      week: 'This week',
      time: 'Time practicing',
      quests: 'Quests cleared',
      streak: 'Day streak',
      boss: 'Boss battles',
      activity: 'Weekly activity (minutes)',
      last: 'Last active',
      today: 'today',
      realms: 'Realm progress',
      note: 'Included with Guildmaster: this scroll, emailed weekly, in your language.',
      word: 'English',
    },
    zh: {
      kicker: '家长卷轴 · 演示预览',
      week: '本周',
      time: '练习时长',
      quests: '完成任务',
      streak: '连续打卡',
      boss: '首领战',
      activity: '每周活跃（分钟）',
      last: '最近活跃',
      today: '今天',
      realms: '领域进度',
      note: '公会长版包含：每周发送到您邮箱的家长卷轴（支持您的语言）。',
      word: '中文',
    },
    es: {
      kicker: 'Pergamino parental · vista de demostración',
      week: 'Esta semana',
      time: 'Tiempo de práctica',
      quests: 'Misiones completadas',
      streak: 'Racha de días',
      boss: 'Batallas de jefe',
      activity: 'Actividad semanal (minutos)',
      last: 'Última actividad',
      today: 'hoy',
      realms: 'Progreso por reino',
      note: 'Incluido con Guildmaster: este pergamino, por correo cada semana, en su idioma.',
      word: 'Español',
    },
    fr: {
      kicker: 'Parchemin des parents · aperçu démo',
      week: 'Cette semaine',
      time: 'Temps de pratique',
      quests: 'Quêtes terminées',
      streak: 'Série de jours',
      boss: 'Combats de boss',
      activity: 'Activité hebdomadaire (minutes)',
      last: 'Dernière activité',
      today: "aujourd'hui",
      realms: 'Progression des royaumes',
      note: 'Inclus avec Guildmaster : ce parchemin, envoyé chaque semaine, dans votre langue.',
      word: 'Français',
    },
  };
  var ORDER = ['en', 'zh', 'es', 'fr'];
  var current = 'en';
  var autoTimer = null;

  var root = document.getElementById('pscroll');
  if (!root) return;

  /* ---------- apply a language with a soft fade ---------- */
  function applyLang(lang, animate) {
    current = lang;
    var strings = STRINGS[lang];
    var targets = root.querySelectorAll('[data-i18n]');
    var cycleWord = document.getElementById('lang-cycle-word');

    function swap() {
      targets.forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        if (strings[key]) el.textContent = strings[key];
      });
      if (cycleWord) cycleWord.textContent = strings.word;
      document.querySelectorAll('.lang-pill').forEach(function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-lang') === lang);
      });
    }

    if (animate && !reduceMotion) {
      root.classList.add('lang-fading');
      if (cycleWord) cycleWord.classList.add('lang-fading');
      setTimeout(function () {
        swap();
        root.classList.remove('lang-fading');
        if (cycleWord) cycleWord.classList.remove('lang-fading');
      }, 220);
    } else {
      swap();
    }
  }

  /* ---------- auto-cycle until the parent chooses ---------- */
  function startAutoCycle() {
    if (reduceMotion) return; // respect reduced motion: stay on EN, pills still work
    autoTimer = setInterval(function () {
      var next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      applyLang(next, true);
    }, 3200);
  }
  function stopAutoCycle() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  document.querySelectorAll('.lang-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      stopAutoCycle(); // an explicit choice ends the demo carousel
      applyLang(pill.getAttribute('data-lang'), true);
    });
  });

  /* ---------- stats: live hero if they have progress, else demo ---------- */
  var DEMO = {
    heroName: 'Nightscholar',
    minutes: [34, 41, 0, 52, 38, 27, 30], // Mon..Sun
    quests: 18, streak: 12, boss: 1,
  };

  function liveOrDemo() {
    var G = window.SQGame, A = window.SQAuth;
    if (G && A && A.getUser()) {
      var s = G.getState();
      var totalQuests = 0;
      Object.keys(s.realms).forEach(function (id) { totalQuests += s.realms[id].questsCleared; });
      if (s.totalXp > 0) {
        return {
          heroName: (A.getUser() && A.getUser().demo ? 'Your hero' : 'Your hero'),
          minutes: DEMO.minutes, // session-time tracking lands with the question bank
          quests: totalQuests,
          streak: s.streak,
          boss: DEMO.boss,
          live: true,
          realms: s.realms,
        };
      }
    }
    return DEMO;
  }

  function fmtMinutes(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
  }

  function renderStats() {
    var d = liveOrDemo();
    var total = d.minutes.reduce(function (a, b) { return a + b; }, 0);
    document.getElementById('pstat-time').textContent = fmtMinutes(total);
    document.getElementById('pstat-quests').textContent = String(d.quests);
    document.getElementById('pstat-streak').textContent = String(d.streak);
    document.getElementById('pstat-boss').textContent = String(d.boss);
    var heroEl = root.querySelector('.pscroll-hero');
    if (heroEl && window.SQAuth && window.SQAuth.getUser()) {
      var prof = null;
      try { prof = window.SQAuth.getProgress() && null; } catch (e) {}
      heroEl.textContent = d.live ? 'Your hero' : DEMO.heroName;
    }

    // weekly activity bars
    var chart = document.getElementById('activity-chart');
    var days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    var max = Math.max.apply(null, d.minutes.concat([1]));
    chart.innerHTML = d.minutes.map(function (m, i) {
      var pct = Math.round((m / max) * 100);
      return '<div class="abar-wrap">' +
        '<div class="abar' + (m === 0 ? ' abar-zero' : '') + '" data-h="' + pct + '" title="' + m + ' min"></div>' +
        '<span class="abar-day type-utility">' + days[i] + '</span></div>';
    }).join('');

    // realm mini-bars (all 8, live when available)
    var minis = document.getElementById('realm-minis');
    var G = window.SQGame;
    if (G) {
      var s = G.getState();
      minis.innerHTML = G.REALMS.map(function (r) {
        var st = s.realms[r.id];
        var pct = st.cleared ? 100 : st.pct;
        return '<div class="rmini">' +
          '<span class="rmini-name">' + r.name + '</span>' +
          '<span class="rmini-bar"><span class="rmini-fill" data-section="' + r.section + '" data-w="' + pct + '"></span></span>' +
          '<span class="rmini-lvl type-utility">Lv ' + st.level + '</span></div>';
      }).join('');
    }
  }

  /* ---------- animate bars when the scroll reveals ---------- */
  function animateBars() {
    root.querySelectorAll('.abar').forEach(function (b) {
      b.style.height = Math.max(6, parseInt(b.getAttribute('data-h'), 10)) + '%';
    });
    root.querySelectorAll('.rmini-fill').forEach(function (b) {
      b.style.width = b.getAttribute('data-w') + '%';
    });
  }

  function init() {
    renderStats();
    applyLang('en', false);

    if (typeof IntersectionObserver === 'function' && !reduceMotion) {
      var seen = false;
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting && !seen) {
          seen = true;
          animateBars();
          startAutoCycle();
          obs.disconnect();
        }
      }, { threshold: 0.25 }).observe(root);
    } else {
      animateBars();
      startAutoCycle();
    }

    // re-render when auth/progress changes so a real hero's numbers appear
    if (window.SQGame) window.SQGame.onChange(function () { renderStats(); animateBars(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
