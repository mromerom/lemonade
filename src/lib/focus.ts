import { texts } from '../data/texts';
import type { LearnerState, ReadingCheck, Target, Text } from '../types';
import type { TargetGrade } from './gradeTarget';
import { targetAnswer, targetLabel } from './gradeTarget';
import { textTerms, wordStatus } from './textWords';

/**
 * What to work on next, from the mistakes in one lesson: at most three areas,
 * the most frequent first, each with a link to an exercise that practises it.
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
  | 'serestar'
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
  serestar: { title: 'Ser and estar', body: 'Ser for what something is like, estar for where it is and how it is right now.' },
  meaning: {
    title: 'Reading for meaning',
    body: 'Look past the words to what the paragraph tells you: why things happen, what people feel.',
  },
};

const FROM_CATEGORY: Partial<Record<string, FocusArea>> = {
  person: 'person',
  tense: 'tense',
  'ser/estar': 'serestar',
  'ser-estar': 'serestar',
  'missing-word': 'sentences',
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

/** The focus area for an issue category or a Proofread area. */
export function areaFor(category: string | undefined): FocusArea | undefined {
  return category ? FROM_CATEGORY[category] : undefined;
}

/**
 * Where to practise each area: a writing topic, a writing add-on, or
 * Proofread. Areas without one (meaning, new words) aren't linked.
 */
export const PRACTICE: Partial<Record<FocusArea, { topic?: string; addon?: string; proofread?: boolean }>> = {
  person: { topic: 'present' },
  tense: { topic: 'past' },
  verbs: { addon: 'irregular' },
  serestar: { topic: 'serestar' },
  gender: { addon: 'gender' },
  number: { addon: 'adjectives' },
  agreement: { addon: 'adjectives' },
  accent: { addon: 'accents' },
  spelling: { proofread: true },
  sentences: { proofread: true },
};

/** A link to practise an area, or null. */
export function practiceLink(area: FocusArea): string | null {
  const p = PRACTICE[area];
  if (!p) return null;
  if (p.proofread) return '/exercises/proofread';
  const q = new URLSearchParams();
  if (p.topic) q.set('topic', p.topic);
  if (p.addon) q.set('addon', p.addon);
  return `/exercises/write?${q}`;
}

/** Collects mistakes into focus areas: the most frequent first, at most `limit`. */
export function focusCollector() {
  const found = new Map<FocusArea, Focus>();
  return {
    add(area: FocusArea, example?: { wrong: string; right: string }) {
      const f = found.get(area) ?? { area, ...FOCUS_TEXT[area], examples: [], count: 0 };
      f.count++;
      if (example && f.examples.length < 2 && !f.examples.some((e) => e.right === example.right)) f.examples.push(example);
      found.set(area, f);
    },
    top(limit = 3): Focus[] {
      return [...found.values()].sort((a, b) => b.count - a.count).slice(0, limit);
    },
  };
}

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
