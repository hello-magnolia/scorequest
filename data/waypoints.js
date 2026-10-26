/* ScoreQuest waypoints: the map as data. One row per marker on a realm's path, in
   the order Pomelo walks them; row i uses marker i from realm.js. The same rows
   live in the Supabase waypoints table (seed with tools/seed_waypoints.py); this
   file is the fallback and what the gate audits.

   Every clash round is its own marker (Transitions I, II, III): one tier each,
   1 easy, 2 medium, 3 hard, 10 questions, clears at 8. The first marker of every
   realm is a clash; a lesson scroll follows the first clash on its skill and
   never gates. A realm whose manifest has fewer markers than rows shows the
   missing count in the editor (&edit=1), where new markers are placed.

   mode    clash    a 10-question round on the skill at this tier; gates progress
           lesson   a scroll on the skill with two quick checks; does not gate
           rapid    timed, easy only, never gates          (backlog)
           reading  one passage, several questions        (backlog)
           empty    placed in the editor, hidden in play
   The boss (lair) is not a waypoint: clearing every clash waypoint unlocks it. */
window.SQ_WAYPOINTS = [
  /* Lorewood: Information and Ideas (4 markers today), 7 rows */
  { id: 'lorewood-1', realm: 'lorewood', position: 1, mode: 'clash', skill: 'Central Ideas and Details', tier: 1, title: 'Central Ideas and Details I' },
  { id: 'lorewood-2', realm: 'lorewood', position: 2, mode: 'lesson', skill: 'Central Ideas and Details', title: 'Reading the room' },
  { id: 'lorewood-3', realm: 'lorewood', position: 3, mode: 'clash', skill: 'Central Ideas and Details', tier: 2, title: 'Central Ideas and Details II' },
  { id: 'lorewood-4', realm: 'lorewood', position: 4, mode: 'clash', skill: 'Command of Evidence', tier: 1, title: 'Command of Evidence I' },
  { id: 'lorewood-5', realm: 'lorewood', position: 5, mode: 'clash', skill: 'Command of Evidence', tier: 2, title: 'Command of Evidence II' },
  { id: 'lorewood-6', realm: 'lorewood', position: 6, mode: 'clash', skill: 'Inferences', tier: 1, title: 'Inferences I' },
  { id: 'lorewood-7', realm: 'lorewood', position: 7, mode: 'clash', skill: 'Inferences', tier: 2, title: 'Inferences II' },

  /* Story Forge: Craft and Structure (7 markers today), 9 rows */
  { id: 'storyforge-1', realm: 'storyforge', position: 1, mode: 'clash', skill: 'Words in Context', tier: 1, title: 'Words in Context I' },
  { id: 'storyforge-2', realm: 'storyforge', position: 2, mode: 'lesson', skill: 'Words in Context', title: 'Words at the anvil' },
  { id: 'storyforge-3', realm: 'storyforge', position: 3, mode: 'clash', skill: 'Words in Context', tier: 2, title: 'Words in Context II' },
  { id: 'storyforge-4', realm: 'storyforge', position: 4, mode: 'clash', skill: 'Words in Context', tier: 3, title: 'Words in Context III' },
  { id: 'storyforge-5', realm: 'storyforge', position: 5, mode: 'clash', skill: 'Text Structure and Purpose', tier: 1, title: 'Text Structure and Purpose I' },
  { id: 'storyforge-6', realm: 'storyforge', position: 6, mode: 'lesson', skill: 'Text Structure and Purpose', title: 'How a text is built' },
  { id: 'storyforge-7', realm: 'storyforge', position: 7, mode: 'clash', skill: 'Text Structure and Purpose', tier: 2, title: 'Text Structure and Purpose II' },
  { id: 'storyforge-8', realm: 'storyforge', position: 8, mode: 'clash', skill: 'Cross-Text Connections', tier: 1, title: 'Cross-Text Connections I' },
  { id: 'storyforge-9', realm: 'storyforge', position: 9, mode: 'clash', skill: 'Cross-Text Connections', tier: 2, title: 'Cross-Text Connections II' },

  /* Ink Reef: Expression of Ideas (6 markers today), 6 rows */
  { id: 'inkreef-1', realm: 'inkreef', position: 1, mode: 'clash', skill: 'Transitions', tier: 1, title: 'Transitions I' },
  { id: 'inkreef-2', realm: 'inkreef', position: 2, mode: 'lesson', skill: 'Transitions', title: 'Currents between sentences' },
  { id: 'inkreef-3', realm: 'inkreef', position: 3, mode: 'clash', skill: 'Transitions', tier: 2, title: 'Transitions II' },
  { id: 'inkreef-4', realm: 'inkreef', position: 4, mode: 'clash', skill: 'Rhetorical Synthesis', tier: 1, title: 'Rhetorical Synthesis I' },
  { id: 'inkreef-5', realm: 'inkreef', position: 5, mode: 'lesson', skill: 'Rhetorical Synthesis', title: 'Notes into a sentence' },
  { id: 'inkreef-6', realm: 'inkreef', position: 6, mode: 'clash', skill: 'Rhetorical Synthesis', tier: 2, title: 'Rhetorical Synthesis II' },

  /* Syntax Citadel: Standard English Conventions (6 markers today), 8 rows */
  { id: 'syntaxcitadel-1', realm: 'syntaxcitadel', position: 1, mode: 'clash', skill: 'Boundaries', tier: 1, title: 'Boundaries I' },
  { id: 'syntaxcitadel-2', realm: 'syntaxcitadel', position: 2, mode: 'lesson', skill: 'Boundaries', title: 'Where a sentence ends' },
  { id: 'syntaxcitadel-3', realm: 'syntaxcitadel', position: 3, mode: 'clash', skill: 'Boundaries', tier: 2, title: 'Boundaries II' },
  { id: 'syntaxcitadel-4', realm: 'syntaxcitadel', position: 4, mode: 'clash', skill: 'Boundaries', tier: 3, title: 'Boundaries III' },
  { id: 'syntaxcitadel-5', realm: 'syntaxcitadel', position: 5, mode: 'clash', skill: 'Form, Structure, and Sense', tier: 1, title: 'Form, Structure, and Sense I' },
  { id: 'syntaxcitadel-6', realm: 'syntaxcitadel', position: 6, mode: 'lesson', skill: 'Form, Structure, and Sense', title: 'Agreement and tense' },
  { id: 'syntaxcitadel-7', realm: 'syntaxcitadel', position: 7, mode: 'clash', skill: 'Form, Structure, and Sense', tier: 2, title: 'Form, Structure, and Sense II' },
  { id: 'syntaxcitadel-8', realm: 'syntaxcitadel', position: 8, mode: 'clash', skill: 'Form, Structure, and Sense', tier: 3, title: 'Form, Structure, and Sense III' },

  /* Mirror Mines: Algebra (5 markers today), 11 rows */
  { id: 'mirrormines-1', realm: 'mirrormines', position: 1, mode: 'clash', skill: 'Linear equations in one variable', tier: 1, title: 'Linear equations in one variable I' },
  { id: 'mirrormines-2', realm: 'mirrormines', position: 2, mode: 'clash', skill: 'Linear equations in one variable', tier: 2, title: 'Linear equations in one variable II' },
  { id: 'mirrormines-3', realm: 'mirrormines', position: 3, mode: 'clash', skill: 'Linear equations in two variables', tier: 1, title: 'Linear equations in two variables I' },
  { id: 'mirrormines-4', realm: 'mirrormines', position: 4, mode: 'clash', skill: 'Linear equations in two variables', tier: 2, title: 'Linear equations in two variables II' },
  { id: 'mirrormines-5', realm: 'mirrormines', position: 5, mode: 'clash', skill: 'Linear functions', tier: 1, title: 'Linear functions I' },
  { id: 'mirrormines-6', realm: 'mirrormines', position: 6, mode: 'clash', skill: 'Linear functions', tier: 2, title: 'Linear functions II' },
  { id: 'mirrormines-7', realm: 'mirrormines', position: 7, mode: 'clash', skill: 'Linear functions', tier: 3, title: 'Linear functions III' },
  { id: 'mirrormines-8', realm: 'mirrormines', position: 8, mode: 'clash', skill: 'Systems of two linear equations in two variables', tier: 1, title: 'Systems of two linear equations in two variables I' },
  { id: 'mirrormines-9', realm: 'mirrormines', position: 9, mode: 'clash', skill: 'Systems of two linear equations in two variables', tier: 2, title: 'Systems of two linear equations in two variables II' },
  { id: 'mirrormines-10', realm: 'mirrormines', position: 10, mode: 'clash', skill: 'Linear inequalities in one or two variables', tier: 1, title: 'Linear inequalities in one or two variables I' },
  { id: 'mirrormines-11', realm: 'mirrormines', position: 11, mode: 'clash', skill: 'Linear inequalities in one or two variables', tier: 2, title: 'Linear inequalities in one or two variables II' },

  /* Infinity Isles: Advanced Math (6 markers today), 10 rows */
  { id: 'infinityisles-1', realm: 'infinityisles', position: 1, mode: 'clash', skill: 'Equivalent expressions', tier: 1, title: 'Equivalent expressions I' },
  { id: 'infinityisles-2', realm: 'infinityisles', position: 2, mode: 'lesson', skill: 'Equivalent expressions', title: 'Same value, new shape' },
  { id: 'infinityisles-3', realm: 'infinityisles', position: 3, mode: 'clash', skill: 'Equivalent expressions', tier: 2, title: 'Equivalent expressions II' },
  { id: 'infinityisles-4', realm: 'infinityisles', position: 4, mode: 'clash', skill: 'Equivalent expressions', tier: 3, title: 'Equivalent expressions III' },
  { id: 'infinityisles-5', realm: 'infinityisles', position: 5, mode: 'clash', skill: 'Nonlinear functions', tier: 1, title: 'Nonlinear functions I' },
  { id: 'infinityisles-6', realm: 'infinityisles', position: 6, mode: 'clash', skill: 'Nonlinear functions', tier: 2, title: 'Nonlinear functions II' },
  { id: 'infinityisles-7', realm: 'infinityisles', position: 7, mode: 'clash', skill: 'Nonlinear functions', tier: 3, title: 'Nonlinear functions III' },
  { id: 'infinityisles-8', realm: 'infinityisles', position: 8, mode: 'clash', skill: 'Nonlinear equations in one variable and systems of equations in two variables', tier: 1, title: 'Nonlinear equations in one variable and systems of equations in two variables I' },
  { id: 'infinityisles-9', realm: 'infinityisles', position: 9, mode: 'clash', skill: 'Nonlinear equations in one variable and systems of equations in two variables', tier: 2, title: 'Nonlinear equations in one variable and systems of equations in two variables II' },
  { id: 'infinityisles-10', realm: 'infinityisles', position: 10, mode: 'clash', skill: 'Nonlinear equations in one variable and systems of equations in two variables', tier: 3, title: 'Nonlinear equations in one variable and systems of equations in two variables III' },

  /* Data Docks: Problem-Solving and Data Analysis (5 markers today), 10 rows */
  { id: 'datadocks-1', realm: 'datadocks', position: 1, mode: 'clash', skill: 'Ratios, rates, proportional relationships, and units', tier: 1, title: 'Ratios, rates, proportional relationships, and units I' },
  { id: 'datadocks-2', realm: 'datadocks', position: 2, mode: 'clash', skill: 'Ratios, rates, proportional relationships, and units', tier: 2, title: 'Ratios, rates, proportional relationships, and units II' },
  { id: 'datadocks-3', realm: 'datadocks', position: 3, mode: 'clash', skill: 'Percentages', tier: 1, title: 'Percentages I' },
  { id: 'datadocks-4', realm: 'datadocks', position: 4, mode: 'clash', skill: 'Percentages', tier: 2, title: 'Percentages II' },
  { id: 'datadocks-5', realm: 'datadocks', position: 5, mode: 'clash', skill: 'One-variable data: Distributions and measures of center and spread', tier: 1, title: 'One-variable data: Distributions and measures of center and spread I', also: ['Two-variable data: Models and scatterplots'] },
  { id: 'datadocks-6', realm: 'datadocks', position: 6, mode: 'clash', skill: 'One-variable data: Distributions and measures of center and spread', tier: 2, title: 'One-variable data: Distributions and measures of center and spread II', also: ['Two-variable data: Models and scatterplots'] },
  { id: 'datadocks-7', realm: 'datadocks', position: 7, mode: 'clash', skill: 'Probability and conditional probability', tier: 1, title: 'Probability and conditional probability I' },
  { id: 'datadocks-8', realm: 'datadocks', position: 8, mode: 'clash', skill: 'Probability and conditional probability', tier: 2, title: 'Probability and conditional probability II' },
  { id: 'datadocks-9', realm: 'datadocks', position: 9, mode: 'clash', skill: 'Inference from sample statistics and margin of error', tier: 1, title: 'Inference from sample statistics and margin of error I', also: ['Evaluating statistical claims: Observational studies and experiments'] },
  { id: 'datadocks-10', realm: 'datadocks', position: 10, mode: 'clash', skill: 'Inference from sample statistics and margin of error', tier: 2, title: 'Inference from sample statistics and margin of error II', also: ['Evaluating statistical claims: Observational studies and experiments'] },

  /* Prism Peaks: Geometry and Trigonometry (6 markers today), 10 rows */
  { id: 'prismpeaks-1', realm: 'prismpeaks', position: 1, mode: 'clash', skill: 'Lines, angles, and triangles', tier: 1, title: 'Lines, angles, and triangles I' },
  { id: 'prismpeaks-2', realm: 'prismpeaks', position: 2, mode: 'clash', skill: 'Lines, angles, and triangles', tier: 2, title: 'Lines, angles, and triangles II' },
  { id: 'prismpeaks-3', realm: 'prismpeaks', position: 3, mode: 'clash', skill: 'Area and volume', tier: 1, title: 'Area and volume I' },
  { id: 'prismpeaks-4', realm: 'prismpeaks', position: 4, mode: 'clash', skill: 'Area and volume', tier: 2, title: 'Area and volume II' },
  { id: 'prismpeaks-5', realm: 'prismpeaks', position: 5, mode: 'clash', skill: 'Right triangles and trigonometry', tier: 1, title: 'Right triangles and trigonometry I' },
  { id: 'prismpeaks-6', realm: 'prismpeaks', position: 6, mode: 'lesson', skill: 'Right triangles and trigonometry', title: 'SOH CAH TOA on the climb' },
  { id: 'prismpeaks-7', realm: 'prismpeaks', position: 7, mode: 'clash', skill: 'Right triangles and trigonometry', tier: 2, title: 'Right triangles and trigonometry II' },
  { id: 'prismpeaks-8', realm: 'prismpeaks', position: 8, mode: 'clash', skill: 'Right triangles and trigonometry', tier: 3, title: 'Right triangles and trigonometry III' },
  { id: 'prismpeaks-9', realm: 'prismpeaks', position: 9, mode: 'clash', skill: 'Circles', tier: 1, title: 'Circles I' },
  { id: 'prismpeaks-10', realm: 'prismpeaks', position: 10, mode: 'clash', skill: 'Circles', tier: 2, title: 'Circles II' }
];
