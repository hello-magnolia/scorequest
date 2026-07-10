/* ============================================================
   ScoreQuest — Mango, the capybara waiting to be rescued
   ------------------------------------------------------------
   Quantized from Magnolia's sprite art (true pitch 31) on Mango's
   own soft-pink palette. Frames: 0 sit, 1 turning (side), 2 back
   turned, 3/4/5 ear-scratch. Canvas 20x20.
   ============================================================ */
(function () {
  'use strict';
  var COLORS = {"a": "#77564e", "b": "#0c0600", "e": "#654536", "m": "#2c1f19", "o": "#dead93", "s": "#ab7c68"};
  var FRAMES = [
    ["....................", "............bb......", "........bsbboosb....", "........bsooooooob..", "........sooooooooo..", "........oooooooooss.", ".......soooobboosmm.", ".....esooooooooosss.", "...eoooooooooooosss.", "..eooooooooooooosss.", "..oooooooooooosssb..", ".eooooooooooossb....", ".oooooooooooossb....", "booooosooooooosb....", "bsooooooooooossb....", "bsoooooosssooas.....", "bsssoooossooosb.....", ".sssssossssossb.....", ".smsssssabbsame.....", "...bbssseb.bebb....."],
    ["....................", "........bb..bb......", "........ssbsssb.....", "........booossoo....", "........ooooooooo...", ".......booooooobob..", ".......sooooooobob..", "......eoooooooooob..", "....msooooooooooob..", "...soooooooooosss...", "..eooooooooooosm....", "..sooooooooooos.....", ".sooooooooooooo.....", ".bsooooooosoooob....", ".bsooooooooasosb....", ".bssooooooosaos.....", ".bssooooooosbos.....", "..ssssoooossbssb....", "..bssssssssebeeb....", "....bbbssebb........"],
    ["........bb..bs......", ".......bsebsbse.....", ".......beooobsms....", ".......booooosoob...", ".......oooooooooo...", "......boooooooooob..", "......boooooooooob..", ".....boooooooooosb..", "....sooooooooosssb..", "...eoooooooooooee...", "...oooooooooooos....", "..soooooooooooos....", "..soooooooooooos....", ".bsooooooooossssb...", ".bsoooooooooooasb...", ".bssoooooooooomsb...", ".bssooooooooosbsb...", "..sssssoooosssbam...", "..bsssssssssssebb...", "....beeeeeeebbb....."],
    ["....................", "..........bb..bb....", "..........ssbbss....", "..........eosooosb..", "........somoooooooo.", "........ooaeoooooos.", "......bsobsbooooooob", "....moooomsbobboooss", "...moooooosbooooosss", "..moooooeoeoooooosss", "..oooosoossoooooosss", ".eoooooooaooosoooss.", ".soooooooboooosmbb..", ".ooooooooeooooss....", "booooooosssoossm....", "boooooooassoobsb....", "ssooooosassoobsm....", ".esooosesssaobae....", "..essssssebbsemb....", "............bb......"],
    ["............bb......", "........bsbbossb....", "........bssoooooob..", "........moooooooos..", "........oooooooooss.", ".......soooobboosme.", "......sooooooooosss.", "....eooooooooooosss.", "...ooooooobesooosss.", "..sooooooosabosssb..", ".oooooooomsabsab....", ".oooooooessbooob....", ".ooooooooseoooob....", "eooooooooesoooob....", "sooooooosboooas.....", "ooooooooaaooosb.....", "soooooooesooosb.....", "bsooooossseoosb.....", ".ssoosssssessee.....", "..meeeeesmmeebb....."],
    [".............bb.....", ".........bsbboosb...", ".........bsooooooob.", ".........sooooooooo.", ".........oooooooooss", "........soooobboosmm", "......seooooooooosss", "....soooooooooooosss", "...eooooooooooooosss", "..eoooooooooooosssb.", "..ooooooooooosssb...", ".eooooooooooamoob...", ".sooooooaoobseoob...", "eooooooooomsaooob...", "moooooooooosboas....", "msooooooooseoosb....", ".sooooooosbsoosb....", ".ssoooooobsmooeb....", "..msssssesbbsebe....", "............mbb....."]
  ];
  function draw(ctx, frame) {
    var map = FRAMES[frame] || FRAMES[0];
    ctx.clearRect(0, 0, 20, 20);
    for (var y = 0; y < map.length; y++) {
      var row = map[y];
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        if (ch === '.') continue;
        ctx.fillStyle = COLORS[ch];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  window.SQMango = { w: 20, h: 20, draw: draw };
})();
