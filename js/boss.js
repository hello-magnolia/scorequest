/* ============================================================
   ScoreQuest — boss fight
   ------------------------------------------------------------
   The guardian at the end of a realm. Combat is the curriculum:
   answer right and Pomelo strikes (boss loses 1 HP); answer
   wrong and the guardian strikes (Pomelo loses 1 HP, and the
   correct answer is shown before the next question). Boss at
   0 HP: the way opens. Pomelo at 0 HP: a gentle retry — no
   punishment, the guardian will wait.

   Sprites are static placeholders for now (mechanics first);
   attack/hurt animations arrive with Magnolia's frames later.
   Question sets are small original placeholders per realm,
   cycling if exhausted. Clearing persists to
   localStorage sq_boss_<realm> = 'cleared'.
   ============================================================ */
(function () {
  'use strict';
  if (!document.body.classList.contains('page-boss')) return;

  var BOSSES = {
    lorewood: {
      name: 'The Nine-Tailed Archivist',
      taunt: 'Every scroll in this shrine says what I say it says.',
      sprites: {
        neutral: 'assets/boss/lorewood/neutral.png',
        tail:    'assets/boss/lorewood/tail.png',
        attack1: 'assets/boss/lorewood/attack1.png',
        attack2: 'assets/boss/lorewood/attack2.png',
        hurt1:   'assets/boss/lorewood/hurt1.png',
        hurt2:   'assets/boss/lorewood/hurt2.png',
        faint:   'assets/boss/lorewood/faint.png',
        fbForm:  'assets/fx/fireball/form.png',
        fbFly:   'assets/fx/fireball/fly.png',
        fbHit:   'assets/fx/fireball/hit.png',
        pomeloAtk1: 'assets/pomelo/attack1.png',
        pomeloAtk2: 'assets/pomelo/attack2.png',
        pomeloAtk3: 'assets/pomelo/attack3.png',
        pomeloAtk4: 'assets/pomelo/attack4.png',
        orange:  'assets/fx/orange.png'
      },
      bg: 'assets/boss/lorewood/bg.png',
      hp: 9,   /* nine tails, nine hit points: one tail per wound */
      flip: true,   /* source faces right; mirror her toward Pomelo */
      base: 'neutral',
      tails: 9,
      attackSeq: [['attack1', 260], ['attack2', 420]],
      hurtSeq: [['hurt1', 240], ['hurt2', 360]],
      faintSeq: [['faint', 300]],
      projectile: { form: 'fbForm', fly: 'fbFly', hit: 'fbHit', delay: 260,
        formMs: 300, flyMs: 520, hitMs: 320, formW: 74, flyW: 74, hitW: 116,
        ox: 0.06, oy: 0.28 },
      bgFx: { aspect: 1672 / 941, leaves: 12, lamps: [
        [0.131, 0.161, 9], [0.268, 0.162, 8], [0.727, 0.161, 8], [0.875, 0.161, 9],
        [0.445, 0.430, 4], [0.555, 0.430, 4], [0.249, 0.813, 5], [0.744, 0.814, 5]
      ] },
      next: { id: 'storyforge', name: 'Story Forge' },
      questions: [
        { q: 'The lanterns of Lorewood are lit every evening, though no keeper has been seen in ten years. Which question does the passage most directly raise?',
          choices: ['Who is lighting the lanterns?', 'Why are lanterns expensive?', 'When was Lorewood founded?', 'How bright are the lanterns?'], a: 0 },
        { q: '"The shrine\u2019s records are complete," the Archivist insists, "except the years I have eaten." Which word most weakens the Archivist\u2019s claim?',
          choices: ['records', 'complete', 'except', 'shrine\u2019s'], a: 2 },
        { q: 'A wish-paper reads: "Return what was taken, and the forest will speak plainly again." The wish implies the forest currently speaks how?',
          choices: ['Loudly', 'In riddles or falsehoods', 'Only at night', 'In an old dialect'], a: 1 },
        { q: 'Which sentence best supports the claim that the torii gates are maintained by someone?',
          choices: ['The gates are older than the trees.', 'The gates are painted the color of maples.', 'Fresh rope and new paper charms hang from every gate.', 'Travelers admire the gates.'], a: 2 },
        { q: 'The passage states the shrine doors "open only for the truth." Based on this, the doors are best described as a test of the visitor\u2019s\u2026',
          choices: ['strength', 'patience', 'honesty', 'speed'], a: 2 },
        { q: '"Few travelers finish the path; fewer still notice the fox-prints beside their own." The second clause mainly adds a sense of\u2026',
          choices: ['being secretly accompanied', 'the path\u2019s great length', 'the weather\u2019s harshness', 'the travelers\u2019 fatigue'], a: 0 },
        { q: 'The Archivist rewrites one word in every tale so each hero "gives up at the end." The detail suggests the Archivist\u2019s goal is to\u2026',
          choices: ['improve the stories', 'discourage those who read them', 'shorten the archive', 'honor the heroes'], a: 1 },
        { q: 'Which of these is an OPINION rather than a fact from the passage about Lorewood?',
          choices: ['The path passes under three torii gates.', 'Autumn is the most beautiful season here.', 'The shrine stands at the path\u2019s end.', 'Paper wishes hang from the branches.'], a: 1 }
      ]
    },
    storyforge: {
      name: 'The Boilerback Weaver',
      taunt: 'I respin every bridge you build to my own design.',
      sprites: {
        idle1:   'assets/boss/storyforge/idle1.png',
        idle2:   'assets/boss/storyforge/idle2.png',
        idle3:   'assets/boss/storyforge/idle3.png',
        attack1: 'assets/boss/storyforge/attack1.png',
        attack2: 'assets/boss/storyforge/attack2.png',
        attack3: 'assets/boss/storyforge/attack3.png',
        hurt1:   'assets/boss/storyforge/hurt1.png',
        hurt2:   'assets/boss/storyforge/hurt2.png',
        hurt3:   'assets/boss/storyforge/hurt3.png',
        faint1:  'assets/boss/storyforge/faint1.png',
        faint2:  'assets/boss/storyforge/faint2.png',
        faint3:  'assets/boss/storyforge/faint3.png',
        webForm: 'assets/fx/web/form.png',
        webFly:  'assets/fx/web/fly.png',
        webHit:  'assets/fx/web/hit.png',
        pomeloAtk1: 'assets/pomelo/attack1.png',
        pomeloAtk2: 'assets/pomelo/attack2.png',
        pomeloAtk3: 'assets/pomelo/attack3.png',
        pomeloAtk4: 'assets/pomelo/attack4.png',
        orange:  'assets/fx/orange.png'
      },
      bg: 'assets/boss/storyforge/bg.png',
      hp: 7,
      flip: false,  /* the spider already faces Pomelo */
      base: 'idle1',
      idleSeq: ['idle1', 'idle2', 'idle3'],
      idleMs: 460,
      attackSeq: [['attack1', 260], ['attack2', 280], ['attack3', 340]],
      hurtSeq: [['hurt1', 220], ['hurt2', 240], ['hurt3', 320]],
      faintSeq: [['faint1', 280], ['faint2', 280], ['faint3', 300]],
      projectile: { form: 'webForm', fly: 'webFly', hit: 'webHit', delay: 520,
        formMs: 280, flyMs: 480, hitMs: 340, formW: 56, flyW: 118, hitW: 152,
        ox: 0.10, oy: 0.64 },
      next: { id: 'inkreef', name: 'Ink Reef' },
      questions: [
        { q: 'The Weaver\u2019s manual opens with a warning, then lists parts, then assembly steps. Its structure is best described as\u2026',
          choices: ['Alphabetical order', 'A safety-first sequence', 'Cause and effect', 'A comparison of models'], a: 1 },
        { q: 'In \u201Cthe forge hissed, sighed, and finally slept,\u201D the word choice makes the forge seem\u2026',
          choices: ['dangerous', 'brand new', 'alive', 'broken'], a: 2 },
        { q: 'A paragraph about iron ends: \u201CSteel, however, tells a different story.\u201D The sentence mainly serves to\u2026',
          choices: ['define steel', 'summarize the passage', 'signal a shift to a new subject', 'correct an earlier error'], a: 2 },
        { q: 'The web is described as \u201Cmeasured, load-bearing, and exactly as long as needed.\u201D The description mainly presents the Weaver as\u2026',
          choices: ['fragile and hesitant', 'hurried and careless', 'decorative and vain', 'a careful engineer'], a: 3 },
        { q: '\u201CThe bellows failed. ___, the fires cooled.\u201D Which transition fits the logic?',
          choices: ['Meanwhile', 'Therefore', 'Although', 'For example'], a: 1 },
        { q: 'A set of tempering instructions is interrupted by a memory of the smith\u2019s old teacher. The interruption mainly adds\u2026',
          choices: ['a personal dimension', 'technical detail', 'a counterargument', 'statistics'], a: 0 },
        { q: 'The phrase \u201Cevery joint riveted twice\u201D most strongly conveys\u2026',
          choices: ['caution and thoroughness', 'haste', 'decoration', 'weakness'], a: 0 },
        { q: 'The passage compares stories to bridges three separate times. The repetition mainly helps the reader\u2026',
          choices: ['memorize dates', 'see structure as something built and crossed', 'learn bridge engineering', 'doubt the narrator'], a: 1 }
      ]
    },
    inkreef: {
      name: 'The Grotto Sophist',
      taunt: 'Your thesis is soggy and your transitions leak. Revise.',
      sprites: {
        idle1:   'assets/boss/inkreef/idle1.png',
        idle2:   'assets/boss/inkreef/idle2.png',
        idle3:   'assets/boss/inkreef/idle3.png',
        attack1: 'assets/boss/inkreef/attack1.png',
        attack2: 'assets/boss/inkreef/attack2.png',
        attack3: 'assets/boss/inkreef/attack3.png',
        attack4: 'assets/boss/inkreef/attack4.png',
        attack5: 'assets/boss/inkreef/attack5.png',
        attack6: 'assets/boss/inkreef/attack6.png',
        hurt1:   'assets/boss/inkreef/hurt1.png',
        hurt2:   'assets/boss/inkreef/hurt2.png',
        hurt3:   'assets/boss/inkreef/hurt3.png',
        faint1:  'assets/boss/inkreef/faint1.png',
        faint2:  'assets/boss/inkreef/faint2.png',
        faint3:  'assets/boss/inkreef/faint3.png',
        scroll:  'assets/fx/scroll/scroll.png',
        pomeloAtk1: 'assets/pomelo/attack1.png',
        pomeloAtk2: 'assets/pomelo/attack2.png',
        pomeloAtk3: 'assets/pomelo/attack3.png',
        pomeloAtk4: 'assets/pomelo/attack4.png',
        orange:  'assets/fx/orange.png'
      },
      bg: 'assets/realms/inkreef.png',
      hp: 8,
      flip: false,  /* he throws leftward, toward Pomelo, as drawn */
      base: 'idle1',
      idleSeq: ['idle1', 'idle2', 'idle3'],
      idleMs: 480,
      attackSeq: [['attack1', 420], ['attack2', 480], ['attack3', 420],
                  ['attack4', 360], ['attack5', 300], ['attack6', 340]],
      hurtSeq: [['hurt1', 220], ['hurt2', 240], ['hurt3', 320]],
      faintSeq: [['faint1', 300], ['faint2', 320], ['faint3', 340]],
      projectile: { form: 'scroll', fly: 'scroll', hit: 'scroll', delay: 1680,
        formMs: 120, flyMs: 480, hitMs: 300, formW: 44, flyW: 66, hitW: 84,
        ox: 0.06, oy: 0.42 },
      /* the verdict he yells on a wrong answer, from the open mouth of the
         third attack frame (mouth center measured at 85,172 in the 470x448
         sheet); the word bursts leftward, toward Pomelo */
      yell: { frame: 2, ox: 0.18, oy: 0.38, phrases: [
        'Illogical!', 'Fallacious!', 'Unsound!', 'Contradiction!',
        'Absurd!', 'Erroneous!', 'Unproven!', 'Invalid!', 'Misreasoned!',
        'Impossible!', 'Incoherent!', 'Falsehood!', 'Sophistry!',
        'Nonsense!', 'Unwise!'
      ] },
      next: { id: 'syntaxcitadel', name: 'Syntax Citadel' },
      questions: [
        { q: 'Which revision of \u201CDue to the fact that the tide was high, we waited\u201D is most concise?',
          choices: ['Due to the fact the tide was high, we waited.', 'Because the tide was high, we waited.', 'In light of the fact that the tide was high, we waited.', 'The tide being high in nature, we waited.'], a: 1 },
        { q: 'A formal report should replace \u201Cthe results were pretty great\u201D with\u2026',
          choices: ['the results were favorable', 'the results rocked', 'the results were kind of good', 'the results were the best ever'], a: 0 },
        { q: '\u201CThe current was strong. ___, the divers pressed on.\u201D Which transition fits?',
          choices: ['Therefore', 'For instance', 'Nevertheless', 'Similarly'], a: 2 },
        { q: 'Which word most precisely describes water you can see through?',
          choices: ['clear', 'nice', 'wet', 'watery'], a: 0 },
        { q: 'Which combination of \u201CThe reef glows. The glow comes from tiny creatures.\u201D reads best?',
          choices: ['The reef glows, the glow comes from tiny creatures.', 'The reef glows and glowing comes from creatures that are tiny.', 'The reef glows because of tiny creatures.', 'Tiny creatures, the reef glows from them.'], a: 2 },
        { q: 'In \u201CThe final outcome was a small little victory,\u201D which pair is redundant?',
          choices: ['final outcome', 'small little', 'a victory', 'was a'], a: 1 },
        { q: 'Writing for young students, which opening fits the audience best?',
          choices: ['Per the aforementioned crustacean data\u2026', 'Crabs have a secret superpower.', 'It is incumbent upon us to examine crabs.', 'Crustacean locomotion warrants rigorous analysis.'], a: 1 },
        { q: 'The paragraph states a rule, then continues: \u201C___ example, the anglerfish\u2026\u201D',
          choices: ['In', 'As', 'For', 'By'], a: 2 }
      ]
    },
    syntaxcitadel: {
      name: 'The Parapet Pedant',
      taunt: 'Six centuries on this ledge and I have never once excused a comma splice.',
      sprites: {
        idle1:   'assets/boss/syntaxcitadel/idle1.png',
        idle2:   'assets/boss/syntaxcitadel/idle2.png',
        idle3:   'assets/boss/syntaxcitadel/idle3.png',
        attack1: 'assets/boss/syntaxcitadel/attack1.png',
        attack2: 'assets/boss/syntaxcitadel/attack2.png',
        attack3: 'assets/boss/syntaxcitadel/attack3.png',
        hurt1:   'assets/boss/syntaxcitadel/hurt1.png',
        hurt2:   'assets/boss/syntaxcitadel/hurt2.png',
        hurt3:   'assets/boss/syntaxcitadel/hurt3.png',
        faint1:  'assets/boss/syntaxcitadel/faint1.png',
        faint2:  'assets/boss/syntaxcitadel/faint2.png',
        faint3:  'assets/boss/syntaxcitadel/faint3.png',
        pomeloAtk1: 'assets/pomelo/attack1.png',
        pomeloAtk2: 'assets/pomelo/attack2.png',
        pomeloAtk3: 'assets/pomelo/attack3.png',
        pomeloAtk4: 'assets/pomelo/attack4.png',
        orange:  'assets/fx/orange.png'
      },
      bg: 'assets/boss/syntaxcitadel/bg.png',
      hp: 9,   /* stone takes patience */
      flip: false,  /* carved facing Pomelo's side of the arena */
      base: 'idle1',
      idleSeq: ['idle1', 'idle2', 'idle3'],
      idleMs: 520,  /* stone breathes slowly */
      attackSeq: [['attack1', 380], ['attack2', 420], ['attack3', 520]],
      hurtSeq: [['hurt1', 220], ['hurt2', 240], ['hurt3', 320]],
      faintSeq: [['faint1', 300], ['faint2', 320], ['faint3', 360]],
      /* no thrown projectile: the maw gathers light and fires a beam.
         delay lands the charge at the start of the roar (attack3);
         maw centroid measured at 149,137 in the 468x448 sheet */
      beam: { delay: 800, chargeMs: 260, fireMs: 220, holdMs: 320, fadeMs: 240,
        ox: 0.318, oy: 0.306 },
      next: { id: 'mirrormines', name: 'Mirror Mines' },
      questions: [
        { q: 'Which sentence is punctuated correctly?',
          choices: ['The gate was locked, the keys were gone.', 'The gate was locked; the keys were gone.', 'The gate was locked the keys were gone.', 'The gate was locked, and, the keys were gone.'], a: 1 },
        { q: '\u201CThe flock of gargoyles ___ at dusk.\u201D Which verb agrees?',
          choices: ['stir', 'stirs', 'are stirring', 'have stirred'], a: 1 },
        { q: '\u201CThe citadel opens ___ gates at dawn.\u201D Which word completes it?',
          choices: ['it\u2019s', 'its', 'their', 'there'], a: 1 },
        { q: 'Which revision fixes \u201CPerched on the tower, the city looked small\u201D?',
          choices: ['Perched on the tower, small was the city.', 'Perched on the tower, the sentinel found the city small.', 'The city, perched on the tower, looked small.', 'Perched on the tower the city looked small.'], a: 1 },
        { q: '\u201CNeither the sentries nor the mason ___ the missing stone.\u201D',
          choices: ['notice', 'notices', 'are noticing', 'were noticing'], a: 1 },
        { q: 'Which sentence uses the colon correctly?',
          choices: ['The vault holds: gold, maps, and ink.', 'The vault holds three things: gold, maps, and ink.', 'The vault: holds gold, maps, and ink.', 'The vault holds three things, gold: maps and ink.'], a: 1 },
        { q: '\u201CBy the time the bell rang, the drawbridge ___.\u201D',
          choices: ['already rose', 'had already risen', 'has already risen', 'already been rising'], a: 1 },
        { q: 'Which choice fixes the run-on \u201CThe torches guttered we climbed anyway\u201D?',
          choices: ['The torches guttered, we climbed anyway.', 'The torches guttered. We climbed anyway.', 'The torches guttered we, climbed anyway.', 'The torches, guttered we climbed anyway.'], a: 1 }
      ]
    },
    mirrormines: {
      name: 'The Twin Signs',
      taunt: 'One of us adds, one of us takes away. Answer wrong and we both do the second thing.',
      sprites: {
        plus_idle1: 'assets/boss/mirrormines/plus_idle1.png',
        plus_idle2: 'assets/boss/mirrormines/plus_idle2.png',
        plus_idle3: 'assets/boss/mirrormines/plus_idle3.png',
        plus_attack1: 'assets/boss/mirrormines/plus_attack1.png',
        plus_attack2: 'assets/boss/mirrormines/plus_attack2.png',
        plus_attack3: 'assets/boss/mirrormines/plus_attack3.png',
        plus_hurt1: 'assets/boss/mirrormines/plus_hurt1.png',
        plus_hurt2: 'assets/boss/mirrormines/plus_hurt2.png',
        plus_hurt3: 'assets/boss/mirrormines/plus_hurt3.png',
        minus_idle1: 'assets/boss/mirrormines/minus_idle1.png',
        minus_idle2: 'assets/boss/mirrormines/minus_idle2.png',
        minus_idle3: 'assets/boss/mirrormines/minus_idle3.png',
        minus_attack1: 'assets/boss/mirrormines/minus_attack1.png',
        minus_attack2: 'assets/boss/mirrormines/minus_attack2.png',
        minus_attack3: 'assets/boss/mirrormines/minus_attack3.png',
        minus_hurt1: 'assets/boss/mirrormines/minus_hurt1.png',
        minus_hurt2: 'assets/boss/mirrormines/minus_hurt2.png',
        minus_hurt3: 'assets/boss/mirrormines/minus_hurt3.png',
        pomeloAtk1: 'assets/pomelo/attack1.png',
        pomeloAtk2: 'assets/pomelo/attack2.png',
        pomeloAtk3: 'assets/pomelo/attack3.png',
        pomeloAtk4: 'assets/pomelo/attack4.png',
        orange:  'assets/fx/orange.png'
      },
      bg: 'assets/realms/mirrormines.png',   /* stand-in until a chamber bg lands */
      hp: 10,
      /* two guardians flank Pomelo: minus from the left tunnel (as drawn,
         striking right), plus from the right (mirrored). Both drawn
         striking rightward, so the right side flips */
      twin: { left: 'minus', right: 'plus', leftFlip: false, rightFlip: true },
      flip: true,
      base: 'idle1',
      idleSeq: ['idle1', 'idle2', 'idle3'],
      idleMs: 460,
      attackSeq: [['attack1', 340], ['attack2', 300], ['attack3', 460]],
      hurtSeq: [['hurt1', 220], ['hurt2', 240], ['hurt3', 300]],
      /* no projectile art: the strike IS the attack. Fangs land mid-lunge
         on the third frame */
      strike: { delay: 900 },
      next: { id: 'infinityisles', name: 'Infinity Isles' },
      questions: [
        { q: 'Solve for x: x + 7 = 12',
          choices: ['4', '19', '5', '7'], a: 2 },
        { q: '\u201CWhatever is done to one side must be done to the other.\u201D To solve x \u2212 5 = 9, both sides need\u2026',
          choices: ['minus 5', 'plus 5', 'divide by 5', 'plus 9'], a: 1 },
        { q: 'If 3x = 21, then x = ?',
          choices: ['18', '63', '6', '7'], a: 3 },
        { q: '2x + 3 = 11. What is x?',
          choices: ['4', '7', '3', '5'], a: 0 },
        { q: 'Which move keeps the equation balanced?',
          choices: ['x + 2 = 5 becomes x = 7', 'x + 2 = 5 becomes x = 3', 'x + 2 = 5 becomes x = 10', 'x + 2 = 5 becomes 2x = 5'], a: 1 },
        { q: 'If x / 4 = 6, then x = ?',
          choices: ['24', '10', '2', '1.5'], a: 0 },
        { q: '5x \u2212 2 = 3x + 8. What is x?',
          choices: ['3', '10', '5', '4'], a: 2 },
        { q: 'Simplify: 4(x + 2) \u2212 3x',
          choices: ['7x + 8', 'x + 2', 'x + 8', 'x + 6'], a: 2 }
      ]
    },

    infinityisles: {
      name: 'The Doubling Hare',
      taunt: 'Blink and there are two of me. Blink again, four. No one outlasts a power of two.',
      sprites: {
        idle1: 'assets/boss/infinityisles/idle1.png',
        idle2: 'assets/boss/infinityisles/idle2.png',
        idle3: 'assets/boss/infinityisles/idle3.png',
        attack1: 'assets/boss/infinityisles/attack1.png',
        attack2: 'assets/boss/infinityisles/attack2.png',
        attack3: 'assets/boss/infinityisles/attack3.png',
        hurt1: 'assets/boss/infinityisles/hurt1.png',
        hurt2: 'assets/boss/infinityisles/hurt2.png',
        hurt3: 'assets/boss/infinityisles/hurt3.png',
        faint1: 'assets/boss/infinityisles/faint1.png',
        faint2: 'assets/boss/infinityisles/faint2.png',
        faint3: 'assets/boss/infinityisles/faint3.png',
        pomeloAtk1: 'assets/pomelo/attack1.png',
        pomeloAtk2: 'assets/pomelo/attack2.png',
        pomeloAtk3: 'assets/pomelo/attack3.png',
        pomeloAtk4: 'assets/pomelo/attack4.png',
        orange:  'assets/fx/orange.png'
      },
      bg: 'assets/realms/infinityisles.png',   /* stand-in until a shoreline chamber lands */
      hp: 12,
      flip: false,   /* drawn already facing him */
      base: 'idle1',
      idleSeq: ['idle1', 'idle2', 'idle3'],
      idleMs: 440,
      attackSeq: [['attack1', 320], ['attack2', 300], ['attack3', 460]],
      hurtSeq: [['hurt1', 220], ['hurt2', 240], ['hurt3', 300]],
      faintSeq: [['faint1', 300], ['faint2', 340], ['faint3', 420]],
      /* no projectile art: the pounce IS the attack, landing mid-leap */
      strike: { delay: 900 },
      next: { id: 'datadocks', name: 'Data Docks' },
      questions: [
        { q: 'Solve: x\u00B2 \u2212 9 = 0',
          choices: ['x = 3 only', 'x = \u00B13', 'x = 9', 'x = 81'], a: 1 },
        { q: 'If f(x) = x\u00B2 + 1, what is f(3)?',
          choices: ['7', '9', '10', '16'], a: 2 },
        { q: 'The vertex of y = (x \u2212 2)\u00B2 + 5 is\u2026',
          choices: ['(\u22122, 5)', '(2, \u22125)', '(5, 2)', '(2, 5)'], a: 3 },
        { q: 'One hare doubles every blink: 2, 4, 8, \u2026 How many after the 5th blink?',
          choices: ['16', '25', '32', '64'], a: 2 },
        { q: 'If \u221Ax = 6, then x = ?',
          choices: ['3', '12', '36', '6'], a: 2 },
        { q: 'Factor: x\u00B2 + 5x + 6',
          choices: ['(x + 1)(x + 6)', '(x + 2)(x + 3)', '(x \u2212 2)(x \u2212 3)', '(x + 5)(x + 6)'], a: 1 },
        { q: 'If f(x) = 2x \u2212 1 and g(x) = x\u00B2, what is g(f(2))?',
          choices: ['9', '7', '3', '25'], a: 0 },
        { q: 'x\u00B2 = 2x + 3. The positive solution is\u2026',
          choices: ['1', '3', '\u22121', '2'], a: 1 }
      ]
    }
  };

  var params = new URLSearchParams(window.location.search);
  var realmId = params.get('realm') || 'lorewood';
  var B = BOSSES[realmId] || BOSSES.lorewood;
  document.body.classList.add('bf-realm-' + (BOSSES[realmId] ? realmId : 'lorewood'));

  var state = {
    bossHp: B.hp,
    bossMax: B.hp,
    pomeloHp: 3,
    pomeloMax: 3,
    qi: 0,
    over: false,
    correctIndex: null,
    fireball: null
  };
  window.__SQ_BOSS = state;

  /* ---------- dom ---------- */
  document.title = B.name + ', ScoreQuest';
  document.getElementById('bf-realm').textContent =
    realmId.charAt(0).toUpperCase() + realmId.slice(1);
  document.getElementById('bf-boss-name').textContent = B.name;
  document.getElementById('bf-taunt').textContent = '\u201C' + B.taunt + '\u201D';
  document.getElementById('bf-stage').style.backgroundImage = 'url(' + B.bg + ')';

  /* the arena breathes: lantern flicker mapped onto the backdrop, leaves adrift */
  (function dressStage() {
    var fx = document.getElementById('bf-fx');
    var cfg = B.bgFx;
    var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fx || !cfg || rm) return;
    var glowEls = [];
    (cfg.lamps || []).forEach(function (l) {
      var g = document.createElement('span');
      g.className = 'bf-glow';
      fx.appendChild(g);
      glowEls.push([g, l]);
    });
    function place() {                        // replicate background-size: cover
      var sw = fx.clientWidth, sh = fx.clientHeight;
      if (!sw || !sh) return;
      var drawnH = Math.max(sh, sw / cfg.aspect);
      var drawnW = drawnH * cfg.aspect;
      var offX = (sw - drawnW) / 2;
      var offY = (sh - drawnH) * 0.3;         // matches background-position: center 30%
      glowEls.forEach(function (pair) {
        var g = pair[0], l = pair[1];
        var d = Math.round(l[2] / 100 * drawnW * 2);
        g.style.width = d + 'px';
        g.style.height = d + 'px';
        g.style.left = Math.round(offX + l[0] * drawnW) + 'px';
        g.style.top = Math.round(offY + l[1] * drawnH) + 'px';
      });
    }
    place();
    window.addEventListener('resize', place);
    var palette = ['#c23b22', '#d95d39', '#a8341e', '#e07a3f'];
    for (var i = 0; i < (cfg.leaves || 0); i++) {
      var leaf = document.createElement('span');
      leaf.className = 'bf-leaf';
      leaf.style.left = (2 + Math.random() * 94).toFixed(1) + '%';
      leaf.style.color = palette[i % palette.length];
      leaf.style.animationDuration = (11 + Math.random() * 8).toFixed(1) + 's';
      leaf.style.animationDelay = (-Math.random() * 16).toFixed(1) + 's';
      fx.appendChild(leaf);
    }
  })();
  var TW = B.twin || null;         // twin guardians flank Pomelo from both tunnels
  var bodyEl = document.getElementById('bf-boss-img');
  var bodyElL = document.getElementById('bf-boss-img-left');
  var sideElR = document.getElementById('bf-boss-side');
  var sideElL = document.getElementById('bf-boss-side-left');
  if (TW) {
    document.querySelector('.bf-arena').classList.add('is-twin');
    sideElL.removeAttribute('aria-hidden');
    bodyElL.alt = 'The guardian\u2019s twin';
    if (!TW.rightFlip) document.getElementById('bf-boss-rig').classList.add('bf-no-flip');
    if (!TW.leftFlip) document.getElementById('bf-boss-rig-left').classList.add('bf-no-flip');
  } else if (!B.flip) {
    document.getElementById('bf-boss-rig').classList.add('bf-no-flip');
  }
  var SP = B.sprites;
  var ASSET_V = '20260717a';       /* bump when boss art changes: stale caches keep old frames alive */
  Object.keys(SP).forEach(function (k) { SP[k] += '?v=' + ASSET_V; });
  Object.keys(SP).forEach(function (k) { var im = new Image(); im.src = SP[k]; });
  function spKey(k, side) { return TW ? (side ? TW.left : TW.right) + '_' + k : k; }
  function setBody(k, side) {
    (side ? bodyElL : bodyEl).src = SP[spKey(k, side || 0)];
  }
  setBody(B.base);
  if (TW) setBody(B.base, 1);
  if (B.idleSeq && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var idleIdx = 0;               // breathing: cycle idle frames while at rest;
    setInterval(function () {      // twins breathe in eerie unison
      if (busy || state.over) return;
      idleIdx = (idleIdx + 1) % B.idleSeq.length;
      setBody(B.idleSeq[idleIdx]);
      if (TW) setBody(B.idleSeq[idleIdx], 1);
    }, B.idleMs || 420);
  }

  /* frame sequences: attack when the guardian strikes, hurt when struck */
  var animT = [];
  var busy = false;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function playBody(seq, hold, side) {
    side = side || 0;
    animT.forEach(clearTimeout); animT = [];
    if (reduceMotion) { if (hold) setBody(seq[seq.length - 1][0], side); return; }
    busy = true;
    var t = 0;
    seq.forEach(function (s) {
      animT.push(setTimeout(function () { setBody(s[0], side); }, t));
      t += s[1];
    });
    animT.push(setTimeout(function () {
      busy = false;
      if (!hold && !state.over) setBody(B.base, side);
    }, t));
  }

  /* ---------- the strike: no projectile, the lunge itself lands.
     The striking side leans in; damage arrives with the fangs ---------- */
  function launchStrike(onImpact, delay, side) {
    var sideEl = side ? sideElL : sideElR;
    if (!reduceMotion) after(Math.max(0, delay - 220), function () { sideEl.classList.add('is-lunging'); });
    after(delay, function () { state.fireball = 'hit'; onImpact(); });
    after(delay + 320, function () {
      state.fireball = null;
      sideEl.classList.remove('is-lunging');
    });
  }

  /* ---------- the fireball: forms at the open mouth, flies, and only
     then does the damage land ---------- */
  var fbEl = document.getElementById('bf-fireball');
  var arenaEl = document.querySelector('.bf-arena');
  var projTimers = [];
  function after(ms, fn) { projTimers.push(setTimeout(fn, ms)); }
  function launchFireball(onImpact, delay) {
    delay = delay || 0;
    var P = B.projectile;
    var FORM = P.formMs, FLY = P.flyMs, HIT = P.hitMs;
    if (reduceMotion) { after(delay + 200, onImpact); return; }
    var a = arenaEl.getBoundingClientRect();
    var br = bodyEl.getBoundingClientRect();
    var cr = document.getElementById('bf-capy').getBoundingClientRect();
    // the mouth sits at the face side (screen-left of the mirrored rig), upper third
    var sx = br.left - a.left + br.width * P.ox;
    var sy = br.top - a.top + br.height * P.oy;
    var tx = cr.left - a.left + cr.width * 0.55;
    var ty = cr.top - a.top + cr.height * 0.40;
    after(delay, function () {
      state.fireball = 'form';
      fbEl.src = SP[P.form];
      fbEl.classList.remove('is-hit');
      fbEl.style.width = P.formW + 'px';
      fbEl.style.transition = 'none';
      fbEl.style.transform = 'translate(0,0)';
      fbEl.style.left = Math.round(sx - P.formW / 2) + 'px';
      fbEl.style.top = Math.round(sy - P.formW / 2) + 'px';
      fbEl.hidden = false;
    });
    after(delay + FORM, function () {
      state.fireball = 'fly';
      fbEl.src = SP[P.fly];
      fbEl.style.width = P.flyW + 'px';
      fbEl.style.transition = '';
      // force layout so the transition actually animates the launch
      void fbEl.offsetWidth;
      fbEl.style.transform = 'translate(' + Math.round(tx - sx) + 'px,' + Math.round(ty - sy) + 'px)';
    });
    after(delay + FORM + FLY, function () {
      state.fireball = 'hit';
      fbEl.src = SP[P.hit];
      fbEl.style.width = P.hitW + 'px';
      fbEl.classList.add('is-hit');
      onImpact();
    });
    after(delay + FORM + FLY + HIT, function () {
      state.fireball = null;
      fbEl.hidden = true;
    });
  }

  /* ---------- the beam: light gathers at the maw, crosses the arena in
     one stroke, and the damage lands when it connects. Reuses the
     form/fly/hit lifecycle keys so state introspection stays uniform ---------- */
  var beamEl = document.getElementById('bf-beam');
  function launchBeam(onImpact, delay) {
    delay = delay || 0;
    var C = B.beam;
    if (reduceMotion) { after(delay + 200, onImpact); return; }
    var a = arenaEl.getBoundingClientRect();
    var br = bodyEl.getBoundingClientRect();
    var cr = document.getElementById('bf-capy').getBoundingClientRect();
    var sx = br.left - a.left + br.width * C.ox;
    var sy = br.top - a.top + br.height * C.oy;
    var tx = cr.left - a.left + cr.width * 0.55;
    var ty = cr.top - a.top + cr.height * 0.40;
    var len = Math.round(Math.hypot(tx - sx, ty - sy));
    var rot = 'rotate(' + (Math.atan2(ty - sy, tx - sx) * 180 / Math.PI).toFixed(2) + 'deg)';
    after(delay, function () {                          // light gathers at the maw
      state.fireball = 'form';
      beamEl.style.transition = 'none';
      beamEl.style.left = Math.round(sx) + 'px';
      beamEl.style.top = Math.round(sy) + 'px';
      beamEl.style.width = len + 'px';
      beamEl.style.opacity = '1';
      beamEl.style.transform = rot + ' scaleX(0.04)';
      beamEl.hidden = false;
    });
    after(delay + C.chargeMs, function () {             // the stroke crosses
      state.fireball = 'fly';
      void beamEl.offsetWidth;
      beamEl.style.transition = 'transform ' + C.fireMs + 'ms ease-out';
      beamEl.style.transform = rot + ' scaleX(1)';
    });
    after(delay + C.chargeMs + C.fireMs, function () {  // it connects
      state.fireball = 'hit';
      onImpact();
    });
    after(delay + C.chargeMs + C.fireMs + C.holdMs, function () {
      beamEl.style.transition = 'opacity ' + C.fadeMs + 'ms linear';
      beamEl.style.opacity = '0';
    });
    after(delay + C.chargeMs + C.fireMs + C.holdMs + C.fadeMs, function () {
      state.fireball = null;
      beamEl.hidden = true;
      beamEl.style.transition = 'none';
    });
  }

  /* ---------- the yell: a one-word verdict bursts from the open mouth
     while the configured attack frame is up, then fades ---------- */
  var yellEl = document.getElementById('bf-yell');
  var lastYell = -1;
  function playYell() {
    var Y = B.yell;
    if (!Y || !yellEl || reduceMotion) return;
    var t = 0;                                  // when the frame arrives...
    for (var i = 0; i < Y.frame; i++) t += B.attackSeq[i][1];
    var holdMs = B.attackSeq[Y.frame][1];       // ...and how long it stays
    var pick = Math.floor(Math.random() * Y.phrases.length);
    if (pick === lastYell) pick = (pick + 1) % Y.phrases.length;
    lastYell = pick;
    after(t, function () {
      var a = arenaEl.getBoundingClientRect();
      var br = bodyEl.getBoundingClientRect();
      var mx = br.left - a.left + br.width * Y.ox;
      var my = br.top - a.top + br.height * Y.oy;
      yellEl.textContent = Y.phrases[pick];
      yellEl.classList.remove('is-yelling');
      yellEl.style.right = Math.round(a.width - mx) + 'px';
      yellEl.style.top = Math.round(my - 14) + 'px';
      yellEl.style.animationDuration = (holdMs + 220) + 'ms';
      yellEl.hidden = false;
      void yellEl.offsetWidth;                  // restart the pop
      yellEl.classList.add('is-yelling');
    });
    after(t + holdMs + 220, function () {       // gone once the fade lands
      yellEl.hidden = true;
      yellEl.classList.remove('is-yelling');
    });
  }

  /* ---------- Pomelo's answer: rear up and throw the orange;
     the Archivist's damage lands when the orange does ---------- */
  var capyAtkEl = document.getElementById('bf-capy-attack');
  var orangeEl = document.getElementById('bf-orange');
  capyAtkEl.src = SP.pomeloAtk1;
  function launchOrange(onImpact, targetEl) {
    if (reduceMotion) { after(200, onImpact); return; }
    var a = arenaEl.getBoundingClientRect();
    var br = (targetEl || bodyEl).getBoundingClientRect();
    capy.style.visibility = 'hidden';
    capyAtkEl.src = SP.pomeloAtk1;                // orange still on his head
    capyAtkEl.hidden = false;
    after(150, function () { capyAtkEl.src = SP.pomeloAtk2; });
    after(300, function () { capyAtkEl.src = SP.pomeloAtk3; });
    after(450, function () {
      capyAtkEl.src = SP.pomeloAtk4;              // the orangeless release frame:
      var ar = capyAtkEl.getBoundingClientRect(); // the throwable pops up over his head
      var sx = ar.left - a.left + ar.width * 0.62;
      var sy = ar.top - a.top - 6;
      var tx = br.left - a.left + br.width * 0.42;
      var ty = br.top - a.top + br.height * 0.40;
      orangeEl.src = SP.orange;
      orangeEl.style.transition = 'none';
      orangeEl.style.transform = 'translate(0,0)';
      orangeEl.style.left = Math.round(sx - 42) + 'px';
      orangeEl.style.top = Math.round(sy - 42) + 'px';
      orangeEl.hidden = false;
      after(190, function () {
        void orangeEl.offsetWidth;
        orangeEl.style.transition = '';
        orangeEl.style.transform = 'translate(' + Math.round(tx - sx) + 'px,' + Math.round(ty - sy) + 'px)';
      });
    });
    after(450 + 190 + 480, function () {
      orangeEl.hidden = true;
      onImpact();
    });
    after(450 + 190 + 480 + 260, function () {
      capyAtkEl.hidden = true;
      capy.style.visibility = '';
    });
  }

  /* the nine tails, fanned behind the rump; the newest wound takes a tail */
  var tailsEl = document.getElementById('bf-tails');
  var tailEls = [];
  function buildTails(n) {
    tailsEl.innerHTML = '';
    tailEls = [];
    if (!B.tails) return;
    for (var i = 0; i < n; i++) {
      var t = document.createElement('img');
      t.className = 'bf-tail';
      t.src = SP.tail;
      t.alt = '';
      var rot = -100 + i * 14;             // fan, swung 90deg anticlockwise
      // the outer tails run slightly smaller than the middle of the fan
      var s = 1 - 0.18 * Math.pow((i - 4) / 4, 2);
      t.style.setProperty('--tr', rot + 'deg');
      t.style.setProperty('--ts', s.toFixed(3));
      t.style.transform = 'rotate(' + rot + 'deg) scale(' + s.toFixed(3) + ')';
      tailsEl.appendChild(t);
      tailEls.push(t);
    }
  }
  function syncTails(hp) {
    if (!B.tails) return;
    while (tailEls.length > hp) {
      var t = tailEls.pop();
      t.classList.add('is-gone');
      setTimeout(function (el) { return function () { el.remove(); }; }(t), 320);
    }
  }
  var back = document.getElementById('bf-retreat');
  back.href = 'realm.html?realm=' + realmId;

  var capy = document.getElementById('bf-capy');
  (function drawPomelo() {
    if (!window.SQCompanion) return;
    var ctx = null;
    try { ctx = capy.getContext('2d'); } catch (e) {}
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, capy.width, capy.height);
    ctx.setTransform(1, 0, 0, 1, 3, 6);
    window.SQCompanion.draw(ctx, 0);
  })();

  var PX_PER_HP = 38; // bar length scales with max HP, fill drains smoothly
  function bar(el, hp, max) {
    var track = el.querySelector('.bf-hp-track');
    if (!track) {
      el.innerHTML = '<span class="bf-hp-medal"><span class="bf-hp-heart"></span></span>' +
        '<span class="bf-hp-track"><span class="bf-hp-fill"></span></span>' +
        '<span class="bf-hp-cap"></span>';
      track = el.querySelector('.bf-hp-track');
      track.style.width = (max * PX_PER_HP) + 'px';
    }
    el.querySelector('.bf-hp-fill').style.width = (hp / max * 100) + '%';
  }
  function renderHp() {
    bar(document.getElementById('bf-boss-hp'), state.bossHp, state.bossMax);
    bar(document.getElementById('bf-pomelo-hp'), state.pomeloHp, state.pomeloMax);
  }

  var qEl = document.getElementById('bf-question');
  var choicesEl = document.getElementById('bf-choices');
  var feedEl = document.getElementById('bf-feedback');

  function ask() {
    if (state.over) return;
    var item = B.questions[state.qi % B.questions.length];
    state.correctIndex = item.a;
    qEl.textContent = item.q;
    feedEl.textContent = '';
    feedEl.className = 'bf-feedback';
    choicesEl.innerHTML = '';
    item.choices.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bf-choice';
      b.textContent = String.fromCharCode(65 + i) + '.  ' + c;
      b.addEventListener('click', function () { answer(i, item); });
      choicesEl.appendChild(b);
    });
    /* TEMP-SKIP (testing): counts as a quiet hit so fights stay finishable */
    var sk = document.createElement('button');
    sk.type = 'button';
    sk.className = 'sq-skip-test';
    sk.textContent = 'Skip (testing)';
    sk.addEventListener('click', function () {
      if (state.over) return;
      lockChoices();
      state.qi += 1;
      state.bossHp = Math.max(0, state.bossHp - 1);
      syncTails(state.bossHp);
      renderHp();
      feedEl.textContent = 'Skipped.';
      feedEl.className = 'bf-feedback';
      if (state.bossHp === 0) { win(); return; }
      setTimeout(ask, 500);
    });
    choicesEl.appendChild(sk);
  }

  function lockChoices() {
    choicesEl.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
  }

  function answer(i, item) {
    if (state.over) return;
    lockChoices();
    state.qi += 1;
    var side = 0;
    if (TW) { state.atkSide = state.atkSide ? 0 : 1; side = state.atkSide; }
    if (i === item.a) {
      feedEl.textContent = 'Pomelo strikes! The Archivist loses a tail.';
      feedEl.className = 'bf-feedback is-hit';
      launchOrange(function () {             // her damage lands with the orange
        state.bossHp = Math.max(0, state.bossHp - 1);
        playBody(B.hurtSeq, false, side);
        syncTails(state.bossHp);
        flash(side ? sideElL : sideElR);
        renderHp();
        if (window.SQSfx && window.SQSfx.correct) window.SQSfx.correct();
        if (state.bossHp === 0) win();
      }, side ? bodyElL : bodyEl);
    } else {
      playBody(B.attackSeq, false, side);
      playYell();
      feedEl.textContent = 'The guardian strikes back. The answer was ' +
        String.fromCharCode(65 + item.a) + ': ' + item.choices[item.a];
      feedEl.className = 'bf-feedback is-miss';
      var strike = B.strike ? function (fn, delay) { launchStrike(fn, delay, side); }
        : (B.beam ? launchBeam : launchFireball);
      strike(function () {                   // the damage lands on contact
        state.pomeloHp = Math.max(0, state.pomeloHp - 1);
        renderHp();
        flash(document.getElementById('bf-pomelo-side'));
        if (window.SQSfx && window.SQSfx.uiTick) window.SQSfx.uiTick();
        if (state.pomeloHp === 0) lose();
      }, B.strike ? B.strike.delay : (B.beam ? B.beam.delay : B.projectile.delay));   // timed to the fangs, maw, mouth, or spinneret
    }
    renderHp();
    setTimeout(ask, i === item.a ? 2000 : 2400);
  }

  function flash(el) {
    el.classList.remove('is-flash');
    void el.offsetWidth;               // restart the flash
    el.classList.add('is-flash');
  }

  function win() {
    state.over = true;
    try { window.localStorage.setItem('sq_boss_' + realmId, 'cleared'); } catch (e) {}
    if (B.faintSeq) {
      playBody(B.faintSeq, true);           // the guardian goes down, and stays down
    } else {                                // no faint frames: back into the tunnels
      sideElR.classList.add('is-retreating');
      if (TW) sideElL.classList.add('is-retreating');
    }
    var p = document.getElementById('bf-victory');
    if (B.next) {
      var onward = document.getElementById('bf-onward');
      onward.href = 'realm.html?realm=' + B.next.id;
      onward.textContent = 'Onward to ' + B.next.name + ' \u2192';
    }
    setTimeout(function () { p.hidden = false; }, 1200);
    if (window.SQSfx && window.SQSfx.correct) window.SQSfx.correct();
  }
  function lose() {
    state.over = true;
    document.getElementById('bf-defeat').hidden = false;
  }
  document.getElementById('bf-retry').addEventListener('click', function () {
    state.bossHp = state.bossMax;
    state.pomeloHp = state.pomeloMax;
    state.qi = 0;
    state.over = false;
    document.getElementById('bf-defeat').hidden = true;
    projTimers.forEach(clearTimeout);
    projTimers = [];
    fbEl.hidden = true;
    beamEl.hidden = true;
    beamEl.style.opacity = '0';
    orangeEl.hidden = true;
    state.atkSide = 0;
    sideElR.classList.remove('is-retreating', 'is-lunging');
    sideElL.classList.remove('is-retreating', 'is-lunging');
    yellEl.hidden = true;
    yellEl.classList.remove('is-yelling');
    capyAtkEl.hidden = true;
    capy.style.visibility = '';
    state.fireball = null;
    busy = false;
    setBody(B.base);
    buildTails(state.bossMax);
    renderHp();
    ask();
  });

  buildTails(state.bossMax);
  renderHp();
  ask();
})();
