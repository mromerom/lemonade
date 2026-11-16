/**
 * Tenses a hint can point to, with their Spanish names and a rough English
 * equivalent (there's rarely an exact one-to-one match). No imports, so the
 * server can use this too.
 */
export const HINT_TENSES = [
  'present',
  'preterite',
  'imperfect',
  'present perfect',
  'pluperfect',
  'future',
  'conditional',
  'present subjunctive',
  'imperfect subjunctive',
  'imperative',
] as const;
export type HintTense = (typeof HINT_TENSES)[number];

export const TENSE_INFO: Record<HintTense, { es: string; en: string; roughly: string }> = {
  present: { es: 'presente', en: 'present', roughly: 'I do, I’m doing' },
  preterite: { es: 'pretérito indefinido', en: 'preterite', roughly: 'I did (a finished action, at a point in time)' },
  imperfect: { es: 'pretérito imperfecto', en: 'imperfect', roughly: 'I was doing, I used to do' },
  'present perfect': { es: 'pretérito perfecto', en: 'present perfect', roughly: 'I have done (or I did, today)' },
  pluperfect: { es: 'pluscuamperfecto', en: 'pluperfect', roughly: 'I had done' },
  future: { es: 'futuro', en: 'future', roughly: 'I will do' },
  conditional: { es: 'condicional', en: 'conditional', roughly: 'I would do' },
  'present subjunctive': {
    es: 'presente de subjuntivo',
    en: 'present subjunctive',
    roughly: '(that) I do: after wishes, doubts, or cuando about the future',
  },
  'imperfect subjunctive': {
    es: 'imperfecto de subjuntivo',
    en: 'imperfect subjunctive',
    roughly: '(if) I did: after si in hypotheticals',
  },
  imperative: { es: 'imperativo', en: 'imperative', roughly: 'do! (an order or request)' },
};

/** Persons in the order of a conjugation table. */
export const TABLE_PERSONS = ['yo', 'tú', 'él/ella', 'nosotros', 'vosotros', 'ellos/ellas'] as const;
export type TablePerson = (typeof TABLE_PERSONS)[number];

/** A verb conjugated in one tense, for the table a hint opens. */
export interface Conjugation {
  verb: string;
  tense: HintTense;
  forms: Record<TablePerson, string>;
}
