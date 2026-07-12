/* ============================================================
   ScoreQuest - game progression model
   ------------------------------------------------------------
   Single source of truth for the 8 realms and the rules that turn
   cleared quests into XP, levels, streaks, and unlocks. Reads/writes
   through SQAuth (Supabase when configured, localStorage in demo mode).

   window.SQGame:
     REALMS                 ordered realm registry (id, name, section, scene…)
     getState()             merged progress -> per-realm computed state
     completeQuest(realmId, correct, total)   award XP, persist, return result
     realmState(realmId)    { level, xp, xpInLevel, xpToNext, cleared, unlocked, pct }
     totalLevel()           sum of realm levels (world rank)
     onChange(fn)           subscribe to state changes
   ============================================================ */
(function () {
  'use strict';

  // Ordered to match the world map path. section: 'rw' | 'math'.
  var REALMS = [
    { id: 'info',        name: 'Lorewood',        scene: 'info',        section: 'rw',   domain: 'Information & Ideas',            quests: 40 , art: 'assets/realms/lorewood.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260711_215833_948a0475-28db-41fa-94bf-14fca55664f1.png' },
    { id: 'craft',       name: 'Story Forge',        scene: 'craft',       section: 'rw',   domain: 'Craft & Structure',             quests: 40 , art: 'assets/realms/storyforge.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260711_230052_cd161907-7401-47e7-a33c-42b70abe3904.png' },
    { id: 'expression',  name: 'Ink Reef',         scene: 'expression',  section: 'rw',   domain: 'Expression of Ideas',           quests: 32 , art: 'assets/realms/inkreef.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260711_230540_3f451865-ff4e-41ca-a71a-fe4aacf6705a.png' },
    { id: 'conventions', name: 'Syntax Citadel',   scene: 'conventions', section: 'rw',   domain: 'Standard English Conventions',  quests: 44 , art: 'assets/realms/syntaxcitadel.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260711_232640_5add5ec2-516c-4675-b10c-7c7242441029.png' },
    { id: 'algebra',     name: 'Mirror Mines',       scene: 'algebra',     section: 'math', domain: 'Algebra',                       quests: 48 , art: 'assets/realms/mirrormines.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260711_233112_1b52ca12-d9d4-4d93-99c7-8ad6befb0545.png' },
    { id: 'advmath',     name: 'Infinity Isles',  scene: 'advmath',     section: 'math', domain: 'Advanced Math',                 quests: 44 , art: 'assets/realms/infinityisles.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260712_030318_cb25b618-de99-4606-abc4-0c021da75913.png' },
    { id: 'data',        name: 'Data Docks',   scene: 'data',        section: 'math', domain: 'Problem-Solving & Data',        quests: 36 , art: 'assets/realms/datadocks.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260712_000405_578c3562-4fdd-4209-9609-3de599f599d3.png' },
    { id: 'geometry',    name: 'Prism Peaks',  scene: 'geometry',    section: 'math', domain: 'Geometry & Trigonometry',       quests: 32 , art: 'assets/realms/prismpeaks.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260712_030734_4484dc45-3614-4e52-9af2-b4813c9f6499.png' },
  ];
  var BY_ID = {};
  REALMS.forEach(function (r) { BY_ID[r.id] = r; });

  // Leveling: XP needed to REACH level n (1-indexed). Level 1 is the start.
  // Curve: gentle early, steeper later. cleared = reached max level (5).
  var MAX_LEVEL = 5;
  var LEVEL_XP = [0, 0, 120, 300, 560, 900]; // legacy display scale (rank flavor)
  function levelFromRec(rec) {
    return Math.min(1 + ((rec && rec.questsCleared) || 0), MAX_LEVEL);
  }
  function levelFromXp(xp) {
    var lvl = 1;
    for (var n = 2; n <= MAX_LEVEL; n++) if (xp >= LEVEL_XP[n]) lvl = n;
    return lvl;
  }

  var listeners = [];
  function emit() { var s = getState(); listeners.forEach(function (fn) { try { fn(s); } catch (e) {} }); }

  function progress() {
    return (window.SQAuth && window.SQAuth.getProgress()) || { xp: 0, streak: 0, realms: {} };
  }

  /* ---------- per-realm computed state ---------- */
  function realmState(id) {
    var idx = REALMS.findIndex(function (r) { return r.id === id; });
    var r = REALMS[idx];
    var pr = progress();
    var rec = (pr.realms && pr.realms[id]) || { xp: 0, questsCleared: 0 };
    var xp = rec.xp || 0;
    var level = levelFromRec(rec); // one completed lesson = one level
    var cleared = level >= MAX_LEVEL;
    var floor = LEVEL_XP[level] || 0;
    var ceil = level < MAX_LEVEL ? LEVEL_XP[level + 1] : LEVEL_XP[MAX_LEVEL];
    var xpInLevel = Math.max(0, xp - floor);
    var xpToNext = Math.max(0, ceil - xp);
    var span = Math.max(1, ceil - floor);
    // Unlock rule: first realm of each section always open; each next unlocks
    // when the previous realm in its section reaches level 2 (a foothold).
    // All-access (test users / paid) bypasses gating entirely.
    var allAccess = false;
    try { allAccess = window.localStorage.getItem('sq_all_access') === '1'; } catch (e) {}
    var unlocked = true;
    if (!allAccess && idx > 0) {
      var prevSame = null;
      for (var j = idx - 1; j >= 0; j--) { if (REALMS[j].section === r.section) { prevSame = REALMS[j]; break; } }
      if (prevSame) unlocked = levelFromRec((pr.realms && pr.realms[prevSame.id]) || null) >= 2;
    }
    return {
      id: id, realm: r, level: level, xp: xp, cleared: cleared, unlocked: unlocked,
      xpInLevel: xpInLevel, xpToNext: xpToNext,
      pct: cleared ? 100 : Math.round(((level - 1) / (MAX_LEVEL - 1)) * 100),
      questsCleared: rec.questsCleared || 0,
      maxLevel: MAX_LEVEL,
    };
  }

  function getState() {
    var pr = progress();
    var realms = {};
    var totalLvl = 0, totalXp = 0, clearedCount = 0;
    REALMS.forEach(function (r) {
      var st = realmState(r.id);
      realms[r.id] = st;
      totalLvl += st.level; totalXp += st.xp; if (st.cleared) clearedCount++;
    });
    return {
      realms: realms, totalLevel: totalLvl, totalXp: totalXp,
      clearedCount: clearedCount, streak: pr.streak || 0,
      signedIn: !!(window.SQAuth && window.SQAuth.getUser()),
    };
  }

  function totalLevel() { return getState().totalLevel; }

  /* ---------- quest resolution: the loop that earns XP ---------- */
  // correct/total from a mini quest -> XP. Accuracy scales the reward.
  function completeQuest(realmId, correct, total) {
    var r = BY_ID[realmId];
    if (!r) return null;
    total = total || 5;
    var accuracy = Math.max(0, Math.min(1, correct / total));
    var base = 20;                       // per-quest base
    var earned = Math.round(base * (0.5 + accuracy)); // 10..40 XP
    if (accuracy === 1) earned += 10;    // perfect-clear bonus

    var pr = progress();
    var realms = Object.assign({}, pr.realms);
    var rec = Object.assign({ xp: 0, questsCleared: 0 }, realms[realmId]);
    var beforeLevel = levelFromRec(rec);
    rec.xp += earned;
    rec.questsCleared += 1;
    realms[realmId] = rec;
    var afterLevel = levelFromRec(rec);

    // streak: +1 per day of activity (demo: +1 per quest session, capped feel)
    var today = new Date().toISOString().slice(0, 10);
    var streak = pr.streak || 0;
    if (pr.lastPlayed !== today) streak = (pr.lastPlayed ? streak : 0) + 1;

    var patch = {
      realms: realms,
      xp: (pr.xp || 0) + earned,
      streak: streak,
      lastPlayed: today,
    };
    if (window.SQAuth && window.SQAuth.saveProgress) window.SQAuth.saveProgress(patch);
    emit();

    return {
      earned: earned, accuracy: accuracy,
      leveledUp: afterLevel > beforeLevel, newLevel: afterLevel,
      cleared: afterLevel >= MAX_LEVEL && beforeLevel < MAX_LEVEL,
      state: realmState(realmId),
    };
  }

  // re-emit whenever auth state changes (login pulls a fresh profile)
  if (window.SQAuth && window.SQAuth.onChange) window.SQAuth.onChange(function () { emit(); });

  window.SQGame = {
    REALMS: REALMS,
    byId: function (id) { return BY_ID[id]; },
    getState: getState,
    realmState: realmState,
    totalLevel: totalLevel,
    completeQuest: completeQuest,
    onChange: function (fn) { listeners.push(fn); fn(getState()); },
    MAX_LEVEL: MAX_LEVEL,
  };
})();
