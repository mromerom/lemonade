import type { Text } from '../../types';
import { loadStory } from '../../content';
import raw from '../../content/texts/andres.txt?raw';

/**
 * "Andrés quiere emprender" (B1, Castilian Spanish).
 * The story lives in src/content/texts/andres.txt; this file holds the questions.
 * Option-writing guidelines are in mercado.ts.
 */
export const andres: Text = {
  ...loadStory(raw, 'texts/andres.txt'),

  targets: [
    {
      id: 'emocionante',
      kind: 'meaning',
      word: 'emocionante',
      gloss: 'exciting',
      pre: {
        prompt: '¿Cómo se dice «exciting» en español?',
        promptEn: 'How do you say “exciting” in Spanish?',
        optionsLang: 'es',
        options: [
          {
            id: 'a',
            text: 'excitante',
            note: 'Excitante is a false friend. It means “stimulating” (el café es excitante) or “arousing”, not “exciting”. Easy to mix up, and embarrassing to get wrong.',
          },
          { id: 'b', text: 'emocionante' },
          {
            id: 'c',
            text: 'emotivo',
            note: 'Emotivo means “moving” or “emotional”, like a touching speech: un discurso emotivo.',
          },
          {
            id: 'd',
            text: 'excitable',
            note: 'Excitable describes a person who gets worked up easily. It doesn’t describe an exciting thing.',
          },
        ],
        correctOptionId: 'b',
      },
      post: {
        prompt: '¿Cómo se dice «exciting» en español?',
        promptEn: 'How do you say “exciting” in Spanish?',
        accept: ['emocionante', 'emocionantes'],
        traps: {
          excitante:
            'Excitante is a false friend: it means “stimulating” or “arousing”. “Exciting” is emocionante.',
          emotivo: 'Emotivo means “moving” or “emotional”. “Exciting” is emocionante.',
        },
      },
      match: ['emocionante'],
    },
    {
      id: 'emocionar-subj',
      kind: 'form',
      verb: 'emocionar',
      person: 'él/ella',
      tense: 'present subjunctive',
      forms: {
        yo: 'emocione',
        tú: 'emociones',
        'él/ella': 'emocione',
        nosotros: 'emocionemos',
        'ellos/ellas': 'emocionen',
      },
      wrongForms: {
        emociona:
          'present indicative. He hasn’t found that job yet, so after «quiere un trabajo que…» Spanish uses the subjunctive',
        emocionaría: 'conditional (“would excite”). After «quiere un trabajo que…», Spanish uses the present subjunctive',
        emocionó: 'preterite (“excited”, in the past)',
      },
      pre: {
        prompt: 'Andrés quiere un trabajo que le ___.',
        promptEn: 'Andrés wants work that excites him. (emocionar = to excite)',
        options: [
          {
            id: 'a',
            text: 'emociona',
            note: 'Emociona is the indicative. A job he hasn’t found yet takes the subjunctive: emocione. Later the story says «algo que le emociona», because by then that thing exists.',
          },
          { id: 'b', text: 'emocionaría', note: 'Emocionaría is the conditional, “would excite”. Here Spanish uses the present subjunctive.' },
          { id: 'c', text: 'emocione' },
          { id: 'd', text: 'emocionó', note: 'Emocionó is past: “excited”.' },
        ],
        correctOptionId: 'c',
      },
      post: {
        prompt: 'Andrés quiere un trabajo que le ___. (emocionar)',
        promptEn: 'Andrés wants work that excites him.',
        accept: ['emocione'],
      },
      match: ['emocione'],
    },
    {
      id: 'emprender',
      kind: 'meaning',
      word: 'emprender',
      gloss: 'to start a business; to take on',
      pre: {
        prompt: '«¿Y por qué no emprendes tú?» ¿Qué significa «emprender»?',
        promptEn: '“So why don’t you emprendes?” What does “emprender” mean?',
        options: [
          { id: 'a', text: 'to learn', note: 'That’s aprender. Emprender starts with em-: em-pren-der.' },
          { id: 'b', text: 'to understand', note: 'To understand is entender or comprender. They only look similar.' },
          { id: 'c', text: 'to start a business' },
          { id: 'd', text: 'to quit (a job)', note: 'To quit a job is dejar el trabajo.' },
        ],
        correctOptionId: 'c',
      },
      post: {
        prompt: '¿Cómo se dice «to start a business» (one word) en español?',
        promptEn: 'How do you say “to start a business” in one word?',
        accept: ['emprender'],
        traps: { aprender: 'Aprender means “to learn”. “To start a business” is emprender.' },
      },
      match: ['emprendes'],
    },
    {
      id: 'armarse-yo',
      kind: 'form',
      verb: 'armarse',
      person: 'yo',
      tense: 'present',
      forms: { yo: 'armo', tú: 'armas', 'él/ella': 'arma', nosotros: 'armamos', 'ellos/ellas': 'arman' },
      wrongForms: { armé: 'preterite (“I plucked up”). The retelling is in the present' },
      pre: {
        prompt: 'Al final, (yo) me ___ de valor.',
        promptEn: 'In the end, I pluck up my courage. (armarse de valor = to pluck up courage)',
        options: [
          { id: 'a', text: 'arma' },
          { id: 'b', text: 'amo', note: 'Amo is from amar: “I love”. One letter away from armo.' },
          { id: 'c', text: 'armé', note: 'Armé is past: “I plucked up”. The retelling is in the present.' },
          { id: 'd', text: 'armo' },
        ],
        correctOptionId: 'd',
      },
      post: {
        prompt: 'Al final, (yo) me ___ de valor. (armarse)',
        promptEn: 'In the end, I pluck up my courage.',
        accept: ['armo'],
      },
      match: ['arma', 'armo'],
    },
    {
      id: 'pyme',
      kind: 'meaning',
      word: 'pyme',
      gloss: 'small or medium-sized business',
      pre: {
        prompt: '«Marta montó una pyme de diseño.» ¿Qué es una «pyme»?',
        promptEn: '“Marta set up a design pyme.” What is a “pyme”?',
        options: [
          {
            id: 'a',
            text: 'a startup',
            note: 'In Spain a startup is una startup or una empresa emergente. A pyme is any small or medium-sized company (pequeña y mediana empresa), new or old.',
          },
          { id: 'b', text: 'a small or medium-sized company' },
          { id: 'c', text: 'a business plan', note: 'A business plan is un plan de negocio.' },
          { id: 'd', text: 'a bank loan', note: 'A loan is un préstamo.' },
        ],
        correctOptionId: 'b',
      },
      post: {
        prompt: '¿Cómo se dice «small or medium-sized business» (one word) en español?',
        promptEn: 'How do you say “small or medium-sized business” in one word?',
        accept: ['pyme', 'pymes'],
      },
      match: ['pyme', 'pymes'],
    },
    {
      id: 'decidir-perfecto',
      kind: 'form',
      verb: 'decidir',
      person: 'yo',
      tense: 'pretérito perfecto',
      forms: {
        yo: 'he decidido',
        tú: 'has decidido',
        'él/ella': 'ha decidido',
        nosotros: 'hemos decidido',
        'ellos/ellas': 'han decidido',
      },
      wrongForms: {
        decidí:
          'pretérito indefinido. In most of Spain, something that happened today («esta mañana») takes the pretérito perfecto',
        decido: 'present',
      },
      pre: {
        prompt: 'Esta mañana (yo) ___ lanzarme a la piscina.',
        promptEn: 'This morning I decided to take the plunge. (decidir = to decide)',
        options: [
          {
            id: 'a',
            text: 'decidí',
            note: 'Decidí (simple past) is normal in Latin America and some parts of Spain. In most of Spain, a past event from today («esta mañana») takes the pretérito perfecto: he decidido.',
          },
          { id: 'b', text: 'ha decidido' },
          { id: 'c', text: 'he decidido' },
          { id: 'd', text: 'decido', note: 'Decido is present: “I decide”. The decision already happened this morning.' },
        ],
        correctOptionId: 'c',
      },
      post: {
        prompt: 'Esta mañana (yo) ___ lanzarme a la piscina. (decidir)',
        promptEn: 'This morning I decided to take the plunge.',
        accept: ['he decidido'],
      },
      match: ['decidido'],
    },
    {
      id: 'lanzarse',
      kind: 'meaning',
      word: 'lanzarse a la piscina',
      gloss: 'to take the plunge',
      pre: {
        prompt: '«Ha decidido lanzarse a la piscina.» ¿Qué significa «lanzarse a la piscina»?',
        promptEn: '“He decided to lanzarse a la piscina.” What does it mean?',
        options: [
          {
            id: 'a',
            text: 'to go for a swim',
            note: 'Literally it’s “to throw oneself into the pool”, but it’s figurative: to take a risk and go for it.',
          },
          { id: 'b', text: 'to take the plunge' },
          { id: 'c', text: 'to give up', note: 'To give up is rendirse, or tirar la toalla (“to throw in the towel”).' },
          { id: 'd', text: 'to throw a party', note: 'To throw a party is montar una fiesta. Montar again!' },
        ],
        correctOptionId: 'b',
      },
      post: {
        prompt: '¿Cómo se dice «to take the plunge» en España? (a phrase with «piscina»)',
        promptEn: 'How do you say “to take the plunge” in Spain? (a phrase with “piscina”)',
        accept: ['lanzarse a la piscina', 'tirarse a la piscina', 'lanzarme a la piscina'],
      },
      match: ['lanzarse', 'lanzarme'],
    },
    {
      id: 'emprendedor',
      kind: 'meaning',
      word: 'emprendedora',
      gloss: 'entrepreneur',
      pre: {
        prompt: '¿Cómo se dice «entrepreneur» en español?',
        promptEn: 'How do you say “entrepreneur” in Spanish?',
        optionsLang: 'es',
        options: [
          { id: 'a', text: 'empleado', note: 'Empleado means “employee”: the opposite of what Andrés wants to be.' },
          { id: 'b', text: 'emprendido', note: 'Emprendido is a participle: “undertaken”. The person is an emprendedor.' },
          { id: 'c', text: 'emprendedor' },
          { id: 'd', text: 'entretenido', note: 'Entretenido means “entertaining”.' },
        ],
        correctOptionId: 'c',
      },
      post: {
        prompt: '¿Cómo se dice «entrepreneur» en español?',
        promptEn: 'How do you say “entrepreneur” in Spanish? (any gender)',
        accept: ['emprendedor', 'emprendedora'],
      },
      match: ['emprendedora'],
    },
  ],
};
