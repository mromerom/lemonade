import type { Text } from '../../types';
import { loadStory } from '../../content';
import raw from '../../content/texts/mercado.txt?raw';

/**
 * "Un sábado en el mercado" (A2), an original demo text written for Lemonade.
 * The story itself lives in src/content/texts/mercado.txt; this file holds
 * the questions.
 */
export const mercado: Text = {
  ...loadStory(raw, 'texts/mercado.txt'),

  // ---------- What this reading teaches ----------
  //
  // Writing the before-reading options:
  // - A meaning asked about in a sentence offers the word's other real meanings
  //   (caras: expensive / faces / dear), so context decides.
  // - "How do you say X?" offers real Spanish look-alikes (bufanda / bufón / bufete).
  // - Verb forms offer other persons of the same verb, plus look-alike verbs
  //   (vamos / vemos, compramos / comparamos).
  // - Give each trap a note: it's shown after reading if the learner picked it.
  // - Give the correct option a note too: why it's right. It's shown for
  //   every learner after reading, right or wrong.
  // - A variant that's also right (regional forms like decidí / he decidido,
  //   near-synonyms like empresario / emprendedor) isn't a trap: list it in
  //   pre.alsoCorrect and post.variants with a note. It's graded correct and
  //   the note is shown as "Good to know".
  // - post.traps explains wrong typed answers, e.g. a false friend.
  // - Judge each fill-in sentence on its own, without the story: exactly one
  //   option should be grammatical. If the context decides (indicative vs.
  //   subjunctive, past vs. present), rewrite the sentence so it forces one
  //   answer, e.g. "no hay ni uno que le ___" requires the subjunctive.
  // - A1–A2 prompts may name the subject in parentheses, "(yo) ___". From B1,
  //   leave it out and let the sentence make the subject clear ("Le doy
  //   vueltas… y me ___", "Esta mañana ___ …: voy a montar mi empresa").
  targets: [
    {
      id: 'bufanda',
      kind: 'meaning',
      word: 'bufanda',
      gloss: 'scarf',
      pre: {
        prompt: '¿Cómo se dice «scarf» en español?',
        promptEn: 'How do you say “scarf” in Spanish?',
        optionsLang: 'es',
        options: [
          { id: 'a', text: 'bufón', note: 'Bufón means “jester” or “clown”.' },
          {
            id: 'b', text: 'bufanda',
            note: 'Bufanda is a scarf, like the red one Lucía wears because it’s cold.',
          },
          { id: 'c', text: 'bufete', note: 'Bufete is a lawyer’s office.' },
          { id: 'd', text: 'bufido', note: 'Bufido is a snort, like an angry animal makes.' },
        ],
        correctOptionId: 'b',
      },
      post: {
        prompt: '¿Cómo se dice «scarf» en español?',
        promptEn: 'How do you say “scarf” in Spanish?',
        accept: ['bufanda'],
      },
      match: ['bufanda'],
    },
    {
      id: 'ir-yo',
      kind: 'form',
      verb: 'ir',
      person: 'yo',
      tense: 'present',
      forms: { yo: 'voy', tú: 'vas', 'él/ella': 'va', nosotros: 'vamos', 'ellos/ellas': 'van' },
      pre: {
        prompt: 'Todos los sábados, (yo) ___ al mercado.',
        promptEn: 'Every Saturday, I go to the market. (ir = to go)',
        options: [
          { id: 'a', text: 'va' },
          { id: 'b', text: 'doy', note: 'Doy is from dar: “I give”. It rhymes with voy.' },
          {
            id: 'c', text: 'voy',
            note: 'Voy is the yo form of ir (to go). Ir is irregular: voy, vas, va, vamos, van.',
          },
          { id: 'd', text: 'van' },
        ],
        correctOptionId: 'c',
      },
      post: {
        prompt: 'Todos los sábados, (yo) ___ al mercado. (ir)',
        promptEn: 'Every Saturday, I go to the market.',
        accept: ['voy'],
      },
      match: ['va', 'voy'],
    },
    {
      id: 'puesto',
      kind: 'meaning',
      word: 'puestos',
      gloss: 'stalls (at a market)',
      pre: {
        prompt: '«Hay muchos puestos de frutas.» ¿Qué significa «puestos»?',
        promptEn: '“There are many puestos of fruit.” What does “puestos” mean?',
        options: [
          {
            id: 'a',
            text: 'jobs',
            note: 'Puesto can mean a job or position (“un puesto de trabajo”), but puestos de frutas at a market are stalls.',
          },
          {
            id: 'b', text: 'stalls',
            note: 'At a market, puestos are stalls: «muchos puestos de frutas» are lots of fruit stalls.',
          },
          { id: 'c', text: 'ports', note: 'Ports are puertos, with an r. Puestos has an s.' },
          { id: 'd', text: 'baskets', note: 'Baskets are cestas.' },
        ],
        correctOptionId: 'b',
      },
      post: {
        prompt: '¿Cómo se dice «stall» (at a market) en español?',
        promptEn: 'How do you say “stall” (at a market) in Spanish?',
        accept: ['puesto', 'puestos'],
      },
      match: ['puesto', 'puestos'],
    },
    {
      id: 'llevar-yo',
      kind: 'form',
      verb: 'llevar',
      person: 'yo',
      tense: 'present',
      forms: { yo: 'llevo', tú: 'llevas', 'él/ella': 'lleva', nosotros: 'llevamos', 'ellos/ellas': 'llevan' },
      pre: {
        prompt: 'Hoy hace frío. (Yo) ___ una bufanda roja.',
        promptEn: "Today it's cold. I'm wearing a red scarf. (llevar = to wear)",
        options: [
          {
            id: 'a', text: 'llevo',
            note: 'Llevo is the yo form of llevar: regular -ar verbs end in -o for yo.',
          },
          { id: 'b', text: 'lleva' },
          { id: 'c', text: 'llevas' },
          { id: 'd', text: 'llevan' },
        ],
        correctOptionId: 'a',
      },
      post: {
        prompt: 'Hoy hace frío. (Yo) ___ una bufanda roja. (llevar)',
        promptEn: "Today it's cold. I'm wearing a red scarf.",
        accept: ['llevo'],
      },
      match: ['lleva', 'llevo'],
    },
    {
      id: 'caro',
      kind: 'meaning',
      word: 'caras',
      gloss: 'expensive',
      pre: {
        prompt: '«Las naranjas son caras.» ¿Qué significa «caras»?',
        promptEn: '“The oranges are caras.” What does “caras” mean?',
        options: [
          {
            id: 'a',
            text: 'faces',
            note: 'Caras can also be a noun meaning “faces” (una cara = a face). Here it describes the oranges, so it’s the adjective caro.',
          },
          {
            id: 'b', text: 'expensive',
            note: 'Caras is the adjective caro (expensive), feminine plural to match «las naranjas». The oranges at the first stall cost more.',
          },
          {
            id: 'c',
            text: 'dear (beloved)',
            note: 'Caro can mean “dear”, as in “caro amigo”. Oranges aren’t dear in that sense, though.',
          },
          { id: 'd', text: 'cheap', note: 'That’s the opposite: cheap is barato (baratas).' },
        ],
        correctOptionId: 'b',
      },
      post: {
        prompt: '¿Cómo se dice «expensive» en español?',
        promptEn: 'How do you say “expensive” in Spanish? (any form)',
        accept: ['caro', 'cara', 'caros', 'caras'],
      },
      match: ['caras'],
    },
    {
      id: 'ir-nosotros',
      kind: 'form',
      verb: 'ir',
      person: 'nosotros',
      tense: 'present',
      forms: { yo: 'voy', tú: 'vas', 'él/ella': 'va', nosotros: 'vamos', 'ellos/ellas': 'van' },
      pre: {
        prompt: 'Mi abuelo y yo ___ al segundo puesto.',
        promptEn: 'My grandfather and I go to the second stall. (ir = to go)',
        options: [
          { id: 'a', text: 'van' },
          { id: 'b', text: 'vemos', note: 'Vemos is from ver: “we see”. One letter away from vamos.' },
          {
            id: 'c', text: 'vamos',
            note: '«Mi abuelo y yo» means the same as nosotros, so ir takes the nosotros form: vamos.',
          },
          { id: 'd', text: 'voy' },
        ],
        correctOptionId: 'c',
      },
      post: {
        prompt: 'Mi abuelo y yo ___ al segundo puesto. (ir)',
        promptEn: 'My grandfather and I go to the second stall.',
        accept: ['vamos'],
      },
      match: ['van', 'vamos'],
    },
    {
      id: 'despues',
      kind: 'meaning',
      word: 'después',
      gloss: 'afterward; after',
      pre: {
        prompt: '¿Cómo se dice «afterward» en español?',
        promptEn: 'How do you say “afterward” in Spanish?',
        optionsLang: 'es',
        options: [
          { id: 'a', text: 'despacio', note: 'Despacio means “slowly”.' },
          {
            id: 'b', text: 'después',
            note: 'Después means afterward or after: «después, compran pan» = afterward, they buy bread.',
          },
          { id: 'c', text: 'despierto', note: 'Despierto means “awake”.' },
          { id: 'd', text: 'antes', note: 'Antes is the opposite: “before”.' },
        ],
        correctOptionId: 'b',
      },
      post: {
        prompt: '¿Cómo se dice «afterward» en español?',
        promptEn: 'How do you say “afterward” (or “after”) in Spanish?',
        accept: ['después'],
      },
      match: ['después'],
    },
    {
      id: 'comprar-nosotros',
      kind: 'form',
      verb: 'comprar',
      person: 'nosotros',
      tense: 'present',
      forms: { yo: 'compro', tú: 'compras', 'él/ella': 'compra', nosotros: 'compramos', 'ellos/ellas': 'compran' },
      pre: {
        prompt: 'Después, (nosotros) ___ pan y flores.',
        promptEn: 'Afterward, we buy bread and flowers. (comprar = to buy)',
        options: [
          { id: 'a', text: 'compran' },
          {
            id: 'b',
            text: 'comparamos',
            note: 'Comparamos is from comparar: “we compare”. Look closely: compr-, not compar-.',
          },
          { id: 'c', text: 'compraron', note: 'Compraron is past tense: “they bought”.' },
          {
            id: 'd', text: 'compramos',
            note: 'With nosotros, -ar verbs end in -amos: compramos.',
          },
        ],
        correctOptionId: 'd',
      },
      post: {
        prompt: 'Después, (nosotros) ___ pan y flores. (comprar)',
        promptEn: 'Afterward, we buy bread and flowers.',
        accept: ['compramos'],
      },
      match: ['compran', 'compramos'],
    },
  ],
};
