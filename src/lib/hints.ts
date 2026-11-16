import type { AnswerIssue } from '../types';

/** Hints for a second try in the writing exercise: what to look at, never the fix. */

/** Used when the AI's hint is missing or gave the answer away (the server drops those). */
const GENERAL_HINTS: Record<string, string> = {
  gender: 'Check the gender of the noun here, and make the article or adjective match it.',
  agreement: 'Check that the words that go together agree in gender and number.',
  number: 'Check singular and plural: do the words that go together match?',
  person: 'Who is doing the action? Check the verb ending for that person.',
  tense: 'Think about when this happens, and whether it’s finished, ongoing or habitual.',
  'ser/estar': 'Is this what something is like, or where or how it is right now?',
  spelling: 'One word is spelled wrong: read it letter by letter.',
  accent: 'A word is missing an accent, or has one it shouldn’t.',
  'word choice': 'One word doesn’t mean what you want here.',
  'word order': 'Look at the order of the words.',
  'missing word': 'A small word is missing.',
  meaning: 'Part of your English sentence is missing or changed in the Spanish.',
};

export function hintFor(issue: AnswerIssue): string {
  return issue.hint ?? GENERAL_HINTS[issue.category] ?? 'Read this part again carefully.';
}

/** Does a text give away one of the fixes? (Used to hide comments on a first try.) */
export function givesAway(text: string, issues: AnswerIssue[]): boolean {
  const bare = (s: string) => ` ${s.toLocaleLowerCase('es').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()} `;
  return issues.some((i) => i.right.trim().length >= 2 && bare(text).includes(bare(i.right)));
}

