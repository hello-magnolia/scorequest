/* ScoreQuest waypoints: the map as data. One row per marker on a realm's path, in
   the order Pomelo walks them; row i uses marker i from realm.js. The same rows
   live in the Supabase waypoints table (seed with tools/seed_waypoints.py); this
   file is the fallback and what the gate audits.

   mode    clash    a 5-question round on the skill; gates progress
           lesson   a scroll on the skill with two quick checks; does not gate
           rapid    timed, easy only, never gates          (backlog)
           reading  one passage, several questions        (backlog)
           empty    placed in the editor, hidden in play
   rounds  clash only: 1 easy, 2 adds medium, 3 adds hard. A round clears at 4 of 5.
   The boss (lair) is not a waypoint: clearing every clash waypoint unlocks it. */
window.SQ_WAYPOINTS = [
  /* Lorewood: Information and Ideas (4 markers) */
  { id: 'lorewood-1', realm: 'lorewood', position: 1, mode: 'lesson', skill: 'Central Ideas and Details', title: 'Reading the room' },
  { id: 'lorewood-2', realm: 'lorewood', position: 2, mode: 'clash', skill: 'Central Ideas and Details', rounds: 2 },
  { id: 'lorewood-3', realm: 'lorewood', position: 3, mode: 'clash', skill: 'Command of Evidence', rounds: 2 },
  { id: 'lorewood-4', realm: 'lorewood', position: 4, mode: 'clash', skill: 'Inferences', rounds: 2 },

  /* Story Forge: Craft and Structure (7 markers) */
  { id: 'storyforge-1', realm: 'storyforge', position: 1, mode: 'lesson', skill: 'Words in Context', title: 'Words at the anvil' },
  { id: 'storyforge-2', realm: 'storyforge', position: 2, mode: 'clash', skill: 'Words in Context', rounds: 3 },
  { id: 'storyforge-3', realm: 'storyforge', position: 3, mode: 'lesson', skill: 'Text Structure and Purpose', title: 'How a text is built' },
  { id: 'storyforge-4', realm: 'storyforge', position: 4, mode: 'clash', skill: 'Text Structure and Purpose', rounds: 2 },
  { id: 'storyforge-5', realm: 'storyforge', position: 5, mode: 'clash', skill: 'Cross-Text Connections', rounds: 2 },
  { id: 'storyforge-6', realm: 'storyforge', position: 6, mode: 'empty' },
  { id: 'storyforge-7', realm: 'storyforge', position: 7, mode: 'empty' },

  /* Ink Reef: Expression of Ideas (6 markers) */
  { id: 'inkreef-1', realm: 'inkreef', position: 1, mode: 'lesson', skill: 'Transitions', title: 'Currents between sentences' },
  { id: 'inkreef-2', realm: 'inkreef', position: 2, mode: 'clash', skill: 'Transitions', rounds: 2 },
  { id: 'inkreef-3', realm: 'inkreef', position: 3, mode: 'empty' },
  { id: 'inkreef-4', realm: 'inkreef', position: 4, mode: 'lesson', skill: 'Rhetorical Synthesis', title: 'Notes into a sentence' },
  { id: 'inkreef-5', realm: 'inkreef', position: 5, mode: 'clash', skill: 'Rhetorical Synthesis', rounds: 2 },
  { id: 'inkreef-6', realm: 'inkreef', position: 6, mode: 'empty' },

  /* Syntax Citadel: Standard English Conventions (6 markers) */
  { id: 'syntaxcitadel-1', realm: 'syntaxcitadel', position: 1, mode: 'lesson', skill: 'Boundaries', title: 'Where a sentence ends' },
  { id: 'syntaxcitadel-2', realm: 'syntaxcitadel', position: 2, mode: 'clash', skill: 'Boundaries', rounds: 3 },
  { id: 'syntaxcitadel-3', realm: 'syntaxcitadel', position: 3, mode: 'empty' },
  { id: 'syntaxcitadel-4', realm: 'syntaxcitadel', position: 4, mode: 'lesson', skill: 'Form, Structure, and Sense', title: 'Agreement and tense' },
  { id: 'syntaxcitadel-5', realm: 'syntaxcitadel', position: 5, mode: 'clash', skill: 'Form, Structure, and Sense', rounds: 3 },
  { id: 'syntaxcitadel-6', realm: 'syntaxcitadel', position: 6, mode: 'empty' },

  /* Mirror Mines: Algebra (5 markers) */
  { id: 'mirrormines-1', realm: 'mirrormines', position: 1, mode: 'clash', skill: 'Linear equations in one variable', rounds: 2 },
  { id: 'mirrormines-2', realm: 'mirrormines', position: 2, mode: 'clash', skill: 'Linear equations in two variables', rounds: 2 },
  { id: 'mirrormines-3', realm: 'mirrormines', position: 3, mode: 'clash', skill: 'Linear functions', rounds: 3 },
  { id: 'mirrormines-4', realm: 'mirrormines', position: 4, mode: 'clash', skill: 'Systems of two linear equations in two variables', rounds: 2 },
  { id: 'mirrormines-5', realm: 'mirrormines', position: 5, mode: 'clash', skill: 'Linear inequalities in one or two variables', rounds: 2 },

  /* Infinity Isles: Advanced Math (6 markers) */
  { id: 'infinityisles-1', realm: 'infinityisles', position: 1, mode: 'lesson', skill: 'Equivalent expressions', title: 'Same value, new shape' },
  { id: 'infinityisles-2', realm: 'infinityisles', position: 2, mode: 'clash', skill: 'Equivalent expressions', rounds: 3 },
  { id: 'infinityisles-3', realm: 'infinityisles', position: 3, mode: 'clash', skill: 'Nonlinear functions', rounds: 3 },
  { id: 'infinityisles-4', realm: 'infinityisles', position: 4, mode: 'empty' },
  { id: 'infinityisles-5', realm: 'infinityisles', position: 5, mode: 'clash', skill: 'Nonlinear equations in one variable and systems of equations in two variables', rounds: 3 },
  { id: 'infinityisles-6', realm: 'infinityisles', position: 6, mode: 'empty' },

  /* Data Docks: Problem-Solving and Data Analysis (5 markers, 7 skills: paired by theme) */
  { id: 'datadocks-1', realm: 'datadocks', position: 1, mode: 'clash', skill: 'Ratios, rates, proportional relationships, and units', rounds: 2 },
  { id: 'datadocks-2', realm: 'datadocks', position: 2, mode: 'clash', skill: 'Percentages', rounds: 2 },
  { id: 'datadocks-3', realm: 'datadocks', position: 3, mode: 'clash', skill: 'One-variable data: Distributions and measures of center and spread', rounds: 2, also: ['Two-variable data: Models and scatterplots'] },
  { id: 'datadocks-4', realm: 'datadocks', position: 4, mode: 'clash', skill: 'Probability and conditional probability', rounds: 2 },
  { id: 'datadocks-5', realm: 'datadocks', position: 5, mode: 'clash', skill: 'Inference from sample statistics and margin of error', rounds: 2, also: ['Evaluating statistical claims: Observational studies and experiments'] },

  /* Prism Peaks: Geometry and Trigonometry (6 markers) */
  { id: 'prismpeaks-1', realm: 'prismpeaks', position: 1, mode: 'clash', skill: 'Lines, angles, and triangles', rounds: 2 },
  { id: 'prismpeaks-2', realm: 'prismpeaks', position: 2, mode: 'clash', skill: 'Area and volume', rounds: 2 },
  { id: 'prismpeaks-3', realm: 'prismpeaks', position: 3, mode: 'lesson', skill: 'Right triangles and trigonometry', title: 'SOH CAH TOA on the climb' },
  { id: 'prismpeaks-4', realm: 'prismpeaks', position: 4, mode: 'clash', skill: 'Right triangles and trigonometry', rounds: 3 },
  { id: 'prismpeaks-5', realm: 'prismpeaks', position: 5, mode: 'clash', skill: 'Circles', rounds: 2 },
  { id: 'prismpeaks-6', realm: 'prismpeaks', position: 6, mode: 'empty' }
];
