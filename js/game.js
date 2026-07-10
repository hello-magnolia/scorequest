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
    { id: 'info',        name: 'Gloamwood',        scene: 'info',        section: 'rw',   domain: 'Information & Ideas',            quests: 40 , art: 'assets/realms/info.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260707_165708_74c8247e-041b-46c6-bd60-b5688daafbd5.png' },
    { id: 'craft',       name: 'Echo Vale',        scene: 'craft',       section: 'rw',   domain: 'Craft & Structure',             quests: 40 , art: 'assets/realms/craft.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260707_165718_a044cd59-5803-4574-93c3-b300e750af85.png' },
    { id: 'expression',  name: 'Inkmarsh',         scene: 'expression',  section: 'rw',   domain: 'Expression of Ideas',           quests: 32 , art: 'assets/realms/expression.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260707_165729_db1609c5-3aad-4569-8936-e642eba5a300.png' },
    { id: 'conventions', name: 'Syntax Citadel',   scene: 'conventions', section: 'rw',   domain: 'Standard English Conventions',  quests: 44 , art: 'assets/realms/conventions.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260707_165740_bc2485ab-42d9-4045-bb54-e82d95728861.png' },
    { id: 'algebra',     name: 'Copperpeak',       scene: 'algebra',     section: 'math', domain: 'Algebra',                       quests: 48 , art: 'assets/realms/algebra.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260707_165752_549328bb-f73a-4925-891a-bd7faf12c8fc.png' },
    { id: 'advmath',     name: 'Starfall Summit',  scene: 'advmath',     section: 'math', domain: 'Advanced Math',                 quests: 44 , art: 'assets/realms/advmath.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260707_165803_fc6057f0-685d-41e9-867c-ed1d6a29bc8c.png' },
    { id: 'data',        name: 'Chartwater Bay',   scene: 'data',        section: 'math', domain: 'Problem-Solving & Data',        quests: 36 , art: 'assets/realms/data.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260707_165813_9e52c7c4-1383-4165-aac2-f41833390df3.png' },
    { id: 'geometry',    name: 'Prism Tidepools',  scene: 'geometry',    section: 'math', domain: 'Geometry & Trigonometry',       quests: 32 , art: 'assets/realms/geometry.png', cdn: 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHvw6GkkSiPTH7HzvjBrNN6m01/hf_20260707_165823_2af1d8d8-4219-46aa-b0c1-9a34f1f3a217.png' },
  ];
  var BY_ID = {};
  REALMS.forEach(function (r) { BY_ID[r.id] = r; });

  // Leveling: XP needed to REACH level n (1-indexed). Level 1 is the start.
  // Curve: gentle early, steeper later. cleared = reached max level (5).
  var MAX_LEVEL = 5;
  var LEVEL_XP = [0, 0, 120, 300, 560, 900]; // index by level; L1=0, L5=900 cumulative
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
    var level = levelFromXp(xp);
    var cleared = level >= MAX_LEVEL;
    var floor = LEVEL_XP[level] || 0;
    var ceil = level < MAX_LEVEL ? LEVEL_XP[level + 1] : LEVEL_XP[MAX_LEVEL];
    var xpInLevel = xp - floor;
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
      if (prevSame) unlocked = levelFromXp(((pr.realms && pr.realms[prevSame.id]) || {}).xp || 0) >= 2;
    }
    return {
      id: id, realm: r, level: level, xp: xp, cleared: cleared, unlocked: unlocked,
      xpInLevel: xpInLevel, xpToNext: xpToNext,
      pct: cleared ? 100 : Math.round((xpInLevel / span) * 100),
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
    var beforeLevel = levelFromXp(rec.xp);
    rec.xp += earned;
    rec.questsCleared += 1;
    realms[realmId] = rec;
    var afterLevel = levelFromXp(rec.xp);

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
