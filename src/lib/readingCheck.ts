import type { AnswerIssue, ReadingCheck, ReadingQuestion, Text } from '../types';
import { gradeAnswer, normalize, stripAccents } from './grade';
import { nounHint } from './nounGender';
import { readingQuestions } from './textWords';

/**
 * Checking answers to the questions under each paragraph.
 *
 * Beginner answers are a word or two, so the app grades them itself against
 * the model answer and the story's "accept:" list, naming gender and number
 * slips ("una pastel", "contento"). Longer answers go to an AI check (see
 * api/check.ts); when that isn't available, the learner compares their answer
 * with the model answer themselves.
 */

/** Beginner levels are graded in the app. */
export function checkedInApp(text: Text): boolean {
  return text.level.startsWith('A');
}

const GENDER_PAIRS = [
  ['el', 'la'],
  ['un', 'una'],
  ['los', 'las'],
  ['unos', 'unas'],
];
const NUMBER_PAIRS = [
  ['el', 'los'],
  ['la', 'las'],
  ['un', 'unos'],
  ['una', 'unas'],
];

const ARTICLES = new Set(GENDER_PAIRS.flat());

const pairIn = (pairs: string[][], a: string, b: string) => pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

/** How two words differ when they're the same word with another gender or number, else null. */
function inflectionSlip(typed: string, right: string): 'gender' | 'number' | null {
  if (pairIn(GENDER_PAIRS, typed, right)) return 'gender';
  if (pairIn(NUMBER_PAIRS, typed, right)) return 'number';
  const split = (w: string) => {
    const m = /^(.*?)([oa]?)(s?)$/.exec(w)!;
    return { stem: m[1], vowel: m[2], plural: m[3] };
  };
  const a = split(typed);
  const b = split(right);
  if (a.stem !== b.stem || a.stem.length < 2) return null;
  if (a.vowel !== b.vowel && a.vowel && b.vowel) return 'gender';
  if (a.plural !== b.plural && a.vowel === b.vowel) return 'number';
  return null;
}

const SLIP_TIPS = {
  gender: (right: string, noun?: string) => `Match the gender: «${right}».${nounHint(noun)}`,
  number: (right: string) => `Match singular or plural: «${right}».`,
};


/** Grade a short (beginner) answer against the model answer and the accepted answers. */
export function checkShort(q: ReadingQuestion, answer: string): ReadingCheck {
  const typed = normalize(answer);
  const candidates = [q.answer.es, ...q.accept].map(normalize).filter(Boolean);
  const base = { answer, source: 'app' as const, issues: [] as AnswerIssue[] };

  if (candidates.includes(typed)) return { ...base, meaning: 'correct' };

  // Same words with another gender or number: right meaning, grammar slip.
  const words = typed.split(' ');
  for (const c of candidates) {
    const right = c.split(' ');
    if (right.length !== words.length) continue;
    const issues: AnswerIssue[] = [];
    let explained = true;
    words.forEach((w, i) => {
      if (w === right[i]) return;
      const slip = inflectionSlip(w, right[i]);
      if (!slip) explained = false;
      else
        issues.push({
          category: slip,
          wrong: w,
          right: right[i],
          // For an article, the noun after it decides the gender.
          tip: SLIP_TIPS[slip](right[i], ARTICLES.has(right[i]) ? right[i + 1] : undefined),
        });
    });
    if (explained && issues.length) {
      return { ...base, meaning: 'correct', issues, corrected: right.join(' ') };
    }
  }

  // The right words, maybe with an accent or spelling slip.
  const grade = gradeAnswer(answer, candidates.map((c) => [c]));
  switch (grade.verdict) {
    case 'correct':
      return { ...base, meaning: 'correct' };
    case 'accent': {
      const right = candidates.find((c) => stripAccents(c) === stripAccents(typed)) ?? normalize(q.answer.es);
      return {
        ...base,
        meaning: 'correct',
        issues: [{ category: 'accent', wrong: answer.trim(), right, tip: 'Check the accent marks.' }],
      };
    }
    case 'spelling':
    case 'typo':
      return {
        ...base,
        meaning: 'correct',
        issues: [
          {
            category: 'spelling',
            wrong: answer.trim(),
            right: normalize(q.answer.es),
            tip: grade.confusions[0]?.label ? `${grade.confusions[0].label}.` : 'Check the spelling.',
          },
        ],
      };
    default:
      return { ...base, meaning: 'incorrect' };
  }
}

/** Must match CHECK_VERSION in server/check.ts: AI checks from an older version are made again. */
export const AI_CHECK_VERSION = 2;

/** A check is still good if it was made for the answer as it is now (and, for AI checks, by the current check). */
export function isCurrent(check: ReadingCheck | undefined, answer: string): check is ReadingCheck {
  return Boolean(
    check &&
      normalize(check.answer) === normalize(answer) &&
      (check.source !== 'ai' || check.v === AI_CHECK_VERSION),
  );
}

/** Same words, ignoring capitals and punctuation. */
export const sameWords = (a: string, b: string) => normalize(a) === normalize(b);

/** Right meaning, and no mistakes other than accents. */
export function isCorrectCheck(check: ReadingCheck | undefined): boolean {
  return Boolean(check && check.meaning === 'correct' && check.issues.every((i) => i.category === 'accent'));
}

/** Answers that still need the AI (or the learner) to check them. */
export function needsAiCheck(text: Text, answers: Record<string, string>, checks: Record<string, ReadingCheck>) {
  if (checkedInApp(text)) return [];
  return readingQuestions(text).filter((q) => !isCurrent(checks[q.id], answers[q.id] ?? ''));
}

export interface CheckRequest {
  textId: string;
  answers: Record<string, string>;
}

export interface CheckResponse {
  checks: Record<string, Omit<ReadingCheck, 'answer' | 'source'>>;
}

/** Ask the AI check for these answers. Throws when it isn't reachable (offline, preview, no key). */
export async function fetchAiChecks(textId: string, answers: Record<string, string>): Promise<Record<string, ReadingCheck>> {
  const res = await fetch('/api/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ textId, answers } satisfies CheckRequest),
  });
  if (!res.ok) throw new Error(`Check failed: ${res.status}`);
  const data = (await res.json()) as CheckResponse;
  return Object.fromEntries(
    Object.entries(data.checks)
      .filter(([id]) => id in answers)
      .map(([id, c]) => [id, { ...c, answer: answers[id], source: 'ai' as const }]),
  );
}
