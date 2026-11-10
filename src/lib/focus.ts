import { texts } from '../data/texts';
import type { LearnerState, ReadingCheck, Target, Text } from '../types';
import type { TargetGrade } from './gradeTarget';
import { targetAnswer, targetLabel } from './gradeTarget';
import { textTerms, wordStatus } from './textWords';

/**
 * What to work on next, from the mistakes in one lesson: at most three areas,
 * the most frequent first. Later these will link to exercises.
 */

export type FocusArea =
  | 'person'
  | 'tense'
  | 'verbs'
  | 'gender'
  | 'number'
  | 'agreement'
  | 'spelling'
  | 'accent'
  | 'vocabulary'
  | 'sentences'
  | 'meaning';

export const FOCUS_TEXT: Record<FocusArea, { title: string; body: string }> = {
  person: { title: 'Who’s doing it', body: 'Match the verb to its subject: yo, tú, él/ella, nosotros…' },
  tense: {
    title: 'Tenses',
    body: 'What was going on (imperfecto), what happened once (indefinido), what will happen (futuro).',
  },
  verbs: { title: 'Verb forms', body: 'The forms of the new verbs in this reading.' },
  gender: { title: 'Gender', body: 'Articles and adjectives take the gender of their noun: un pastel, una bufanda roja.' },
  number: { title: 'Singular and plural', body: 'Articles and adjectives take the number of their noun: las naranjas caras.' },
  agreement: { title: 'Agreement', body: 'Words that go together share gender and number.' },
  spelling: { title: 'Spelling', body: 'Common mix-ups like b/v, ll/y and c/z.' },
  accent: { title: 'Accent marks', body: 'Accents can change the meaning (tomo, tomó), so they’re worth getting right.' },
  vocabulary: { title: 'New words', body: 'Words from this reading that didn’t stick yet.' },
  sentences: { title: 'Building sentences', body: 'Word order and the small words that hold a sentence together.' },
  meaning: {
    title: 'Reading for meaning',
    body: 'Look past the words to what the paragraph tells you: why things happen, what people feel.',
  },
};

const FROM_CATEGORY: Partial<Record<string, FocusArea>> = {
  person: 'person',
  tense: 'tense',
  gender: 'gender',
  number: 'number',
  agreement: 'agreement',
  spelling: 'spelling',
  accent: 'accent',
  'word choice': 'vocabulary',
  'word order': 'sentences',
  'missing word': 'sentences',
  meaning: 'meaning',
};

export interface Focus {
  area: FocusArea;
  title: string;
  body: string;
  /** Up to two examples, "wrong → right"; wrong is empty for a blank answer */
  examples: { wrong: string; right: string }[];
  count: number;
}

export function focusAreas(
  checks: { check: ReadingCheck | undefined; model: string }[],
  words: { target: Target; grade: TargetGrade; typed: string }[],
  limit = 3,
): Focus[] {
  const found = new Map<FocusArea, Focus>();
  const add = (area: FocusArea, example?: { wrong: string; right: string }) => {
    const f = found.get(area) ?? { area, ...FOCUS_TEXT[area], examples: [], count: 0 };
    f.count++;
    if (example && f.examples.length < 2 && !f.examples.some((e) => e.right === example.right)) f.examples.push(example);
    found.set(area, f);
  };

  for (const { check: c, model } of checks) {
    if (!c) continue;
    for (const issue of c.issues) {
      const area = FROM_CATEGORY[issue.category];
      if (area) add(area, issue.right ? { wrong: issue.wrong, right: issue.right } : undefined);
    }
    if (c.meaning !== 'correct') add('meaning', { wrong: c.answer, right: model });
  }

  for (const { target, grade, typed } of words) {
    const right = targetAnswer(target);
    const example = { wrong: typed, right };
    switch (grade.verdict) {
      case 'correct':
        break;
      case 'accent':
        add('accent', example);
        break;
      case 'spelling':
        add('spelling', example);
        break;
      case 'typo':
        // A slip of the fingers, not something to study.
        break;
      case 'form':
        add(grade.usedPerson ? 'person' : 'tense', example);
        break;
      case 'incorrect':
        add(target.kind === 'form' ? 'verbs' : 'vocabulary', { wrong: typed, right: target.kind === 'form' ? `${targetLabel(target)}: ${right}` : right });
        break;
    }
  }

  return [...found.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** A reading not finished yet with the most words this learner hasn't seen. */
export function recommendText(state: LearnerState, current: Text): { text: Text; newWords: number } | null {
  const options = texts
    .filter((t) => t.id !== current.id && state.lessons[t.id]?.stage !== 'done')
    .map((t) => ({ text: t, newWords: textTerms(t).filter((u) => wordStatus(state, u.key, u.sense) === 'new').length }))
    .filter((o) => o.newWords > 0)
    .sort((a, b) => b.newWords - a.newWords);
  return options[0] ?? null;
}
