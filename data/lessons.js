/* ScoreQuest lessons: one short scroll per skill, read at a lesson waypoint before
   the clash on that skill. Shape: intro (what the SAT is testing), patterns (the two
   or three moves that answer most questions), example (a worked one), checks (two
   quick questions with the key; not recorded as attempts). Keyed by skill name.
   Copy rules: plain, low-anxiety, no em dashes. Math in \( \). */
window.SQ_LESSONS = {
  'Central Ideas and Details': {
    intro: 'These questions ask what a short text is mainly saying, or what one detail in it says. The answer is always on the page; the trick is not adding to it.',
    patterns: [
      'Main idea: find the sentence the rest of the text supports. The right choice restates that sentence in different words and covers the whole text, not one corner of it.',
      'Detail: find the exact phrase the question points at and match it. Choices that are true in general but not stated in the text are traps.',
      'Watch for scope. A choice that is bigger than the text (claims about all cases) or smaller (one example) is wrong even when it sounds smart.'
    ],
    example: {
      text: 'The town library stayed open an hour later on Thursdays. Fewer than a dozen people came, but the same dozen came every week, and the librarian said she would keep the late hour for them.',
      question: 'Which choice best states the main idea?',
      answer: 'The librarian keeps a late hour for a small, loyal group.',
      why: 'The first sentence sets up the hour, the second gives the small crowd, and the third carries the point: she keeps it for them. A choice about libraries in general, or about Thursdays, misses the text.'
    },
    checks: [
      { stem: 'A main-idea answer should cover', choices: ['one vivid detail', 'the whole text', 'what the author probably thinks about other topics'], key: 1 },
      { stem: 'A detail choice that is true in real life but not in the text is', choices: ['correct if it sounds reasonable', 'a trap', 'correct if it matches the tone'], key: 1 }
    ]
  },
  'Words in Context': {
    intro: 'A word is blanked out or underlined, and you pick the one that fits the sentence most precisely. The text around the blank decides it, not the fanciest word.',
    patterns: [
      'Read the sentence with the blank as a clue machine: the words right before and after it usually tell you whether the missing word is positive or negative, big or small, certain or hedged.',
      'Predict a plain word first (something like "careful" or "spread"), then find the choice closest to your prediction.',
      'The SAT likes the precise word, not the dramatic one. If two choices are close, pick the one whose meaning is narrower and fits the exact situation.'
    ],
    example: {
      text: 'Although the recipe called for a pinch of saffron, the cook was ______ with it, and the rice came out a deep orange.',
      question: 'Which word fits?',
      answer: 'liberal',
      why: '"Although a pinch" against "deep orange" tells you the cook used a lot. "Liberal" means generous in amount. "Careful" would contradict the result; "famous" has nothing to do with amount.'
    },
    checks: [
      { stem: 'Before looking at the choices, you should', choices: ['pick the longest word', 'predict a plain word from the clues', 'skip to the next question'], key: 1 },
      { stem: 'When two choices are close in meaning, the SAT usually wants', choices: ['the more dramatic one', 'the more precise one', 'the shorter one'], key: 1 }
    ]
  },
  'Text Structure and Purpose': {
    intro: 'These ask why a sentence is there or how a text is organized. You are naming the job a sentence does, not what it says.',
    patterns: [
      'Label the moves: a text might claim, then give an example, then qualify. The question about one sentence is asking which of those moves it makes.',
      'Purpose answers use verbs: to introduce, to contrast, to concede, to give evidence. Check the verb in each choice against what the sentence actually does.',
      'Overall structure: look for the turn. Many short passages set up one view and then pivot ("however", "but") to the real point.'
    ],
    example: {
      text: 'Most birds sing to defend territory. The mockingbird, though, sings most at night, when few rivals can hear it, which suggests another purpose.',
      question: 'What is the function of the second sentence?',
      answer: 'To present a case that complicates the claim in the first sentence.',
      why: '"Though" signals the pivot. The second sentence does not disprove the first; it offers an exception that calls for a second explanation.'
    },
    checks: [
      { stem: 'A function question is asking', choices: ['what the sentence says', 'what job the sentence does in the text', 'whether the sentence is true'], key: 1 },
      { stem: 'Words like "however" and "though" usually mark', choices: ['an example', 'a pivot', 'a conclusion'], key: 1 }
    ]
  },
  'Transitions': {
    intro: 'A transition word is blanked out between two sentences. The relationship between the two sentences picks the word.',
    patterns: [
      'Name the relationship first: does sentence two add to, contrast with, result from, or give an example of sentence one? Then match: "furthermore" adds, "however" contrasts, "therefore" results, "for example" illustrates.',
      'Ignore how a word sounds. "Moreover" and "nevertheless" are both formal; only one fits a contrast.',
      'Check both directions. If sentence two could be the cause of sentence one rather than the result, "therefore" is wrong.'
    ],
    example: {
      text: 'The bridge was closed for repairs for three weeks. ______, commuters found the ferry faster than they expected.',
      question: 'Which transition fits?',
      answer: 'Meanwhile',
      why: 'Sentence two reports something that happened during the closure, not because of it and not in contrast to it. "Therefore" overstates the link; "however" invents a contrast.'
    },
    checks: [
      { stem: 'The first thing to decide is', choices: ['which word sounds most formal', 'how the two sentences relate', 'how long the sentences are'], key: 1 },
      { stem: '"Therefore" is right only when sentence two is', choices: ['a result of sentence one', 'an example of sentence one', 'the opposite of sentence one'], key: 0 }
    ]
  },
  'Rhetorical Synthesis': {
    intro: 'You get a student\'s bullet-point notes and a goal, such as "emphasize a similarity". The right choice uses the notes to hit that exact goal.',
    patterns: [
      'Underline the goal. Every word of it matters: "emphasize the difference" is not "describe both".',
      'Eliminate choices that are true to the notes but do the wrong job. Accuracy is not enough; the sentence has to accomplish the stated goal.',
      'Prefer the choice that uses two or more notes when the goal involves comparing or combining.'
    ],
    example: {
      text: 'Notes: Hana Ito is a ceramicist. She fires pots in a wood kiln. Wood firing takes 48 hours. Gas kilns take about 10 hours. Goal: emphasize how long Ito\'s method takes compared with the alternative.',
      question: 'Which sentence does it?',
      answer: 'Ito fires her pots for 48 hours in a wood kiln, nearly five times as long as a gas kiln would take.',
      why: 'It names the time, the method, and the comparison in one sentence. A choice that only says she uses a wood kiln is accurate but ignores the goal.'
    },
    checks: [
      { stem: 'A choice that is accurate to the notes but misses the goal is', choices: ['correct', 'wrong', 'correct if it is the longest'], key: 1 },
      { stem: 'For a goal that compares two things, the best choice usually', choices: ['mentions only one of them', 'uses notes about both', 'adds an opinion'], key: 1 }
    ]
  },
  'Boundaries': {
    intro: 'These test where one sentence ends and the next begins, and the punctuation that joins them: periods, semicolons, commas with conjunctions, colons and dashes.',
    patterns: [
      'Find the clauses. If both halves could stand alone as sentences, you need a period, a semicolon, or a comma plus a joining word like "and" or "but". A comma alone is a comma splice; nothing at all is a run-on.',
      'A colon follows a complete sentence and introduces what comes next (a list, an explanation). The part before the colon must be able to stand alone.',
      'If the punctuation choices differ only by a comma around a phrase, ask whether the phrase is extra information (commas on both sides) or needed to identify something (no commas).'
    ],
    example: {
      text: 'The map showed two routes to the summit ______ the shorter one crossed a glacier.',
      question: 'Which choice completes the text correctly?',
      answer: 'summit; the',
      why: 'Both halves are complete sentences, so a semicolon joins them. A comma alone splices them; no punctuation runs them together.'
    },
    checks: [
      { stem: 'Two complete sentences joined by only a comma is', choices: ['a run-on', 'a comma splice', 'correct'], key: 1 },
      { stem: 'The part before a colon must be', choices: ['a list', 'a complete sentence', 'a single word'], key: 1 }
    ]
  },
  'Form, Structure, and Sense': {
    intro: 'Subject-verb agreement, verb tense, pronouns, and modifiers. The question looks like a grammar quiz; the method is finding what the blank has to agree with.',
    patterns: [
      'For a verb, find its real subject, skipping the prepositional phrases in between. "The box of letters ___ heavy": the subject is "box", so "is".',
      'Tense: match the time the rest of the passage uses, unless a time word ("by 1990", "next year") says otherwise.',
      'A phrase at the start of a sentence describes whoever comes right after the comma. If that noun could not do the describing, the modifier is dangling.'
    ],
    example: {
      text: 'The collection of maps, assembled over three decades, ______ now kept in a climate-controlled room.',
      question: 'Which verb agrees?',
      answer: 'is',
      why: 'The subject is "collection", singular. "Maps" and "decades" sit inside phrases that do not control the verb.'
    },
    checks: [
      { stem: 'To pick a verb form, first find', choices: ['the nearest noun', 'the real subject', 'the longest word'], key: 1 },
      { stem: '"Perched on the tower, the city looked small." The problem is', choices: ['the tense', 'a dangling modifier', 'the comma'], key: 1 }
    ]
  },
  'Equivalent expressions': {
    intro: 'Rewrite an expression without changing its value: factoring, expanding, combining like terms, or rewriting exponents and roots.',
    patterns: [
      'When the choices are factored forms, expand the choice you like and see if it matches the original. Checking is faster than factoring from scratch.',
      'Plug in a small number. If the original and a choice give different values at \\(x = 2\\), that choice is out.',
      'Exponent rules are the whole game for roots and powers: \\(x^{a} x^{b} = x^{a+b}\\), \\((x^{a})^{b} = x^{ab}\\), \\(\\sqrt{x} = x^{1/2}\\).'
    ],
    example: {
      text: 'Which is equivalent to \\(3x^2 - 12\\)?',
      question: '',
      answer: '\\(3(x - 2)(x + 2)\\)',
      why: 'Factor out 3 first: \\(3(x^2 - 4)\\). Then \\(x^2 - 4\\) is a difference of squares. Expanding the answer back gives \\(3x^2 - 12\\).'
    },
    checks: [
      { stem: 'The fastest check that two expressions are equivalent is often', choices: ['plugging in a number for x', 'reading them aloud', 'counting the terms'], key: 0 },
      { stem: '\\((x^3)^2\\) equals', choices: ['\\(x^5\\)', '\\(x^6\\)', '\\(x^9\\)'], key: 1 }
    ]
  },
  'Right triangles and trigonometry': {
    intro: 'Right triangles, the Pythagorean theorem, and the three ratios: sine, cosine and tangent. Most questions are one ratio and one equation.',
    patterns: [
      'Label from the angle you are given: opposite, adjacent, hypotenuse. Then SOH CAH TOA: \\(\\sin = \\frac{opp}{hyp}\\), \\(\\cos = \\frac{adj}{hyp}\\), \\(\\tan = \\frac{opp}{adj}\\).',
      'Know the special triangles cold: 3-4-5 and its multiples, 45-45-90 (legs equal, hypotenuse leg\\(\\sqrt{2}\\)), 30-60-90 (sides \\(1 : \\sqrt{3} : 2\\)).',
      'The two acute angles add to 90 degrees, so \\(\\sin(A) = \\cos(90^{\\circ} - A)\\). Questions that look like they need a calculator often use this.'
    ],
    example: {
      text: 'In a right triangle, the side opposite angle \\(A\\) is 6 and the hypotenuse is 10.',
      question: 'What is \\(\\cos(A)\\)?',
      answer: '\\(\\frac{4}{5}\\)',
      why: 'The third side is 8 (a 6-8-10 triangle, twice 3-4-5). Cosine is adjacent over hypotenuse: \\(\\frac{8}{10} = \\frac{4}{5}\\).'
    },
    checks: [
      { stem: 'Tangent is', choices: ['opposite over hypotenuse', 'adjacent over hypotenuse', 'opposite over adjacent'], key: 2 },
      { stem: 'If \\(\\sin(35^{\\circ}) = 0.57\\), then \\(\\cos(55^{\\circ})\\) is', choices: ['0.57', '0.43', 'impossible to know'], key: 0 }
    ]
  }
};
