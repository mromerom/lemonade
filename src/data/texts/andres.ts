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
          {
            id: 'b', text: 'emocionante',
            note: 'Emocionante comes from emoción: something that stirs up your feelings. That’s “exciting”.',
          },
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
        emocioné:
          'yo form of the preterite (“I excited”). The accent on the last é changes both the person and the tense. Without it, emocione is the present subjunctive',
        emociona:
          'present indicative. After «no hay ni uno que…» the thing doesn’t exist, so Spanish requires the subjunctive',
        emocionaría:
          'conditional (“would excite”). You may hear it in speech, but standard Spanish uses the present subjunctive here',
        emocionó: 'preterite (“excited”). With «no hay» in the present, use the present subjunctive',
      },
      pre: {
        prompt: 'Hay cientos de puestos, pero no hay ni uno que le ___ a Andrés.',
        promptEn: 'There are hundreds of positions, but not a single one excites Andrés. (emocionar = to excite)',
        options: [
          {
            id: 'a',
            text: 'emocioné',
            note: 'One accent mark changes everything. Emocioné, stressed on the last syllable (e-mo-cio-NÉ), is yo in the preterite: “I excited” (me emocioné = I got excited). Emocione, stressed on CIO (e-mo-CIO-ne), is the present subjunctive this sentence needs.',
          },
          {
            id: 'b', text: 'emocione',
            note: 'Emocione is the present subjunctive. «No hay ni uno que…» describes something that doesn’t exist, and that always takes the subjunctive. The subject is «ni uno» (one puesto), so it’s singular.',
          },
          { id: 'c', text: 'emocionen', note: 'Emocionen is plural. The subject is «ni uno» (not a single one), so it’s singular: emocione.' },
          { id: 'd', text: 'emociones', note: 'Emociones is the tú form. The subject is «ni uno», a puesto, not you.' },
        ],
        correctOptionId: 'b',
      },
      post: {
        prompt: 'Hay cientos de puestos, pero no hay ni uno que le ___ a Andrés. (emocionar)',
        promptEn: 'There are hundreds of positions, but not a single one excites Andrés.',
        accept: ['emocione'],
      },
      match: ['emocione'],
      evidenceHint: 'ni uno',
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
          {
            id: 'c', text: 'to start a business',
            note: 'Emprender is to take on something new, especially a business. Marta, who set up her own pyme, is asking why Andrés doesn’t do the same.',
          },
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
      tense: 'pretérito indefinido',
      forms: { yo: 'armé', tú: 'armaste', 'él/ella': 'armó', nosotros: 'armamos', 'ellos/ellas': 'armaron' },
      wrongForms: {
        armaba:
          'imperfecto, for ongoing or repeated actions. «Al final» marks one completed moment, so the indefinido',
        armo: 'present. The sentence is in the past («le di vueltas»)',
      },
      pre: {
        prompt: 'Le di vueltas a la idea durante semanas y, al final, me ___ de valor.',
        promptEn: 'I mulled the idea over for weeks and, in the end, I plucked up my courage. (armarse de valor = to pluck up courage)',
        options: [
          {
            id: 'a',
            text: 'armó',
            note: 'Armó, with the accent on the ó, is él/ella: “he plucked up”. «Le di» (I gave) tells you the subject is yo, so it’s armé.',
          },
          {
            id: 'b',
            text: 'armaba',
            note: 'Armaba is the imperfecto, for ongoing or repeated actions (like «le daba miedo»). «Al final» marks one completed moment, so the indefinido: armé.',
          },
          {
            id: 'c',
            text: 'armé',
            note: '«Le di vueltas» tells you two things: the subject is yo, and the sentence is in the past. «Al final» marks one completed moment, so it’s the indefinido: me armé de valor.',
          },
          { id: 'd', text: 'armo', note: 'Armo is the present. The sentence is in the past: «le di vueltas».' },
        ],
        correctOptionId: 'c',
      },
      post: {
        prompt: 'Le di vueltas a la idea durante semanas y, al final, me ___ de valor. (armarse)',
        promptEn: 'I mulled the idea over for weeks and, in the end, I plucked up my courage.',
        accept: ['armé'],
      },
      match: ['armó', 'armé'],
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
          {
            id: 'b', text: 'a small or medium-sized company',
            note: 'Pyme is short for pequeña y mediana empresa: a small or medium-sized company. It’s written in lowercase, like a regular word.',
          },
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
        decido: 'present (“I decide”). The decision already happened this morning',
      },
      pre: {
        prompt: 'Esta mañana ___ dar el paso: voy a montar mi propio negocio.',
        promptEn: 'This morning I decided to take the step: I’m going to set up my own business. (decidir = to decide)',
        options: [
          { id: 'a', text: 'decidí', note: 'Both are correct. In most of Spain, something that happened today («esta mañana») usually takes the pretérito perfecto: he decidido. In Latin America, and in parts of Spain such as the Canary Islands, Galicia and Asturias, the simple past decidí is the usual choice.' },
          { id: 'b', text: 'ha decidido' },
          {
            id: 'c', text: 'he decidido',
            note: 'He decidido is the pretérito perfecto, the usual past in most of Spain for something that happened today («esta mañana»). «Voy» and «mi» tell you the subject is yo, so it’s he, not ha.',
          },
          { id: 'd', text: 'decido', note: 'Decido is present: “I decide”. The decision already happened this morning.' },
        ],
        correctOptionId: 'c',
        alsoCorrect: ['a'],
      },
      post: {
        prompt: 'Esta mañana ___ dar el paso: voy a montar mi propio negocio. (decidir)',
        promptEn: 'This morning I decided to take the step: I’m going to set up my own business.',
        accept: ['he decidido'],
        variants: {
          decidí: 'Both are correct. In most of Spain, something that happened today («esta mañana») usually takes the pretérito perfecto: he decidido. In Latin America, and in parts of Spain such as the Canary Islands, Galicia and Asturias, the simple past decidí is the usual choice.',
        },
      },
      match: ['decidido'],
    },
    {
      id: 'lanzarse',
      kind: 'meaning',
      word: 'lanzarse a la piscina',
      gloss: 'to take the plunge',
      pre: {
        prompt: '«A veces hay que lanzarse a la piscina.» ¿Qué significa «lanzarse a la piscina»?',
        promptEn: '“Sometimes you have to lanzarse a la piscina.” What does it mean?',
        options: [
          {
            id: 'a',
            text: 'to go for a swim',
            note: 'Literally it’s “to throw oneself into the pool”, but it’s figurative: to take a risk and go for it.',
          },
          {
            id: 'b', text: 'to take the plunge',
            note: 'Lanzarse a la piscina means taking a risk and going for it. Marta tells Andrés that sometimes you have to, and in the end he does: he decides to dar el paso (take the step).',
          },
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
      match: ['lanzarse'],
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
          {
            id: 'c', text: 'emprendedor',
            note: 'An emprendedor (emprendedora for a woman) is someone who starts a new venture, like Marta with her pyme.',
          },
          { id: 'd', text: 'entretenido', note: 'Entretenido means “entertaining”.' },
        ],
        correctOptionId: 'c',
      },
      post: {
        prompt: '¿Cómo se dice «entrepreneur» en español?',
        promptEn: 'How do you say “entrepreneur” in Spanish? (any gender)',
        accept: ['emprendedor', 'emprendedora'],
        variants: {
          empresario: 'Correct, with a different feel. Empresario is a business owner or businessperson in general, often of an established company. An emprendedor is someone starting something new: closer to a startup founder.',
          empresaria: 'Correct, with a different feel. Empresario is a business owner or businessperson in general, often of an established company. An emprendedor is someone starting something new: closer to a startup founder.',
        },
      },
      match: ['emprendedora'],
    },
  ],
};
