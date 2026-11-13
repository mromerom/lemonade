import { proofreadSeeds } from '../content/exercises';
import type { LearnerState } from '../types';
import { normalize, stripAccents } from './grade';
import { isCorrectCheck } from './readingCheck';
import { readingQuestions } from './textWords';
import { texts } from '../data/texts';
import { isRightTranslation } from './writing';

/**
 * Proofread: the learner reads a sentence, selects the wrong words, fixes
 * them in place, or says there's no mistake. Sentences come from
 * proofread.txt and from the learner's own wrong answers.
 */

export interface ProofreadItem {
  id: string;
  sentence: string;
  /** Corrected versions; empty if there's no mistake */
  fixes: string[];
  note: string;
  area?: string;
  /** The learner wrote it, in the writing exercise or a reading */
  mine?: { from: string };
}

// ---------- The pool ----------

/** The learner's own sentences that had mistakes, with the AI's fix. */
export function ownSentences(state: LearnerState): ProofreadItem[] {
  const own: ProofreadItem[] = [];
  for (const set of state.writing?.sets ?? []) {
    set.items.forEach((item, i) => {
      const first = item.attempts[0];
      const c = first?.check;
      if (!c || isRightTranslation(c) || !c.corrected) return;
      own.push({
        id: `w:${set.id}:${i}`,
        sentence: first.spanish,
        fixes: [c.corrected],
        note: c.issues.map((x) => x.tip).join(' '),
        area: c.issues[0]?.category,
        mine: { from: `your translation of “${item.english}”` },
      });
    });
  }
  for (const text of texts) {
    const lesson = state.lessons[text.id];
    for (const q of readingQuestions(text)) {
      const c = lesson?.readingChecks?.[q.id];
      if (!c || c.source !== 'ai' || isCorrectCheck(c) || !c.corrected || !c.issues.length) continue;
      own.push({
        id: `r:${text.id}:${q.id}`,
        sentence: c.answer,
        fixes: [c.corrected],
        note: c.issues.map((x) => x.tip).join(' '),
        area: c.issues[0]?.category,
        mine: { from: `your answer in «${text.title}»` },
      });
    }
  }
  return own;
}

/**
 * A round of up to `size` sentences not resolved yet: up to half of them the
 * learner's own (newest first), the rest from the written set.
 */
export function buildRound(state: LearnerState, size = 6, includeResolved = false): ProofreadItem[] {
  const resolved = new Set(includeResolved ? [] : (state.proofread?.resolved ?? []));
  const own = ownSentences(state)
    .filter((i) => !resolved.has(i.id))
    .reverse()
    .slice(0, Math.ceil(size / 2));
  const seeds = proofreadSeeds.filter((s) => !resolved.has(s.id)).slice(0, size - own.length);
  // Mix them, but the same way every time for the same pool.
  const round = [...seeds];
  own.forEach((item, i) => round.splice(Math.min(round.length, 1 + i * 2), 0, item));
  return round;
}

export function poolSize(state: LearnerState) {
  const resolved = new Set(state.proofread?.resolved ?? []);
  const own = ownSentences(state).filter((i) => !resolved.has(i.id)).length;
  const seeds = proofreadSeeds.filter((s) => !resolved.has(s.id)).length;
  return { own, seeds, total: own + seeds };
}

// ---------- Tokens ----------

export interface Token {
  text: string;
  /** Words can be selected; spaces and punctuation can't */
  kind: 'word' | 'space' | 'punct';
}

export function tokenize(sentence: string): Token[] {
  return [...sentence.matchAll(/(\s+)|([\p{L}\p{N}'’-]+)|([^\s\p{L}\p{N}]+)/gu)].map((m) => ({
    text: m[0],
    kind: m[1] ? 'space' : m[2] ? 'word' : 'punct',
  }));
}

/** A selected run of tokens (start..end, inclusive) and what the learner typed for it. */
export interface Edit {
  start: number;
  end: number;
  text: string;
}

/** The sentence with the edits applied. An empty edit keeps the original words. */
export function applyEdits(tokens: Token[], edits: Edit[]): string {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const edit = edits.find((e) => e.start === i);
    if (edit) {
      out += edit.text.trim() || tokens.slice(edit.start, edit.end + 1).map((t) => t.text).join('');
      i = edit.end;
    } else out += tokens[i].text;
  }
  return out;
}

// ---------- Where the mistakes are ----------

const words = (s: string) => normalize(s).split(' ').filter(Boolean);

/** Indices (into the word list) of words that differ from the fix; insertions mark both neighbours. */
function changedWords(sentence: string, fix: string): { spans: number[][]; size: number } {
  const a = words(sentence);
  const b = words(fix);
  // Longest common subsequence, to line up the words that stay.
  const L = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const spans: number[][] = [];
  let current: number[] = [];
  let i = 0;
  let j = 0;
  let size = 0;
  const close = () => {
    if (current.length) spans.push(current);
    current = [];
  };
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      close();
      i++;
      j++;
    } else if (i < a.length && j < b.length && L[i + 1][j + 1] === L[i][j]) {
      // A word replaced by another.
      size++;
      if (!current.includes(i)) current.push(i);
      i++;
      j++;
    } else if (j < b.length && (i >= a.length || L[i][j + 1] >= L[i + 1][j])) {
      // A word added in the fix: the mistake is next to it.
      size++;
      if (!current.length) current = [Math.max(0, i - 1), Math.min(a.length - 1, i)].filter((x, k, arr) => arr.indexOf(x) === k);
      j++;
    } else {
      size++;
      if (!current.includes(i)) current.push(i);
      i++;
    }
  }
  close();
  return { spans, size };
}

/** The fix closest to the sentence: its changes are where the mistakes are. */
export function mistakeSpans(item: ProofreadItem): number[][] {
  if (!item.fixes.length) return [];
  return item.fixes.map((f) => changedWords(item.sentence, f)).sort((x, y) => x.size - y.size)[0].spans;
}

/** Word indices (as counted by mistakeSpans) covered by an edit. */
export function editWordIndices(tokens: Token[], edit: Edit): number[] {
  let w = -1;
  const out: number[] = [];
  tokens.forEach((t, i) => {
    if (t.kind !== 'word') return;
    w++;
    if (i >= edit.start && i <= edit.end) out.push(w);
  });
  return out;
}

// ---------- Grading ----------

export type ProofreadVerdict =
  /** No mistake, and the learner said so */
  | 'right'
  /** Mistakes found and fixed */
  | 'fixed'
  /** Fixed, apart from accents */
  | 'almost'
  /** Every mistake found, but not (all) fixed right */
  | 'found'
  /** Some mistakes found */
  | 'partly'
  /** There was a mistake and the learner didn't find it */
  | 'missed'
  /** No mistake, but the learner changed something */
  | 'changed';

export interface ProofreadResult {
  verdict: ProofreadVerdict;
  /** The sentence as the learner left it */
  result: string;
  /** Which mistake spans the learner's selections touched */
  found: boolean[];
}

const bare = (s: string) => normalize(s).replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

export function gradeProofread(item: ProofreadItem, tokens: Token[], edits: Edit[] | 'no-mistake'): ProofreadResult {
  const spans = mistakeSpans(item);
  const result = edits === 'no-mistake' ? item.sentence : applyEdits(tokens, edits);
  const touched = edits === 'no-mistake' ? [] : edits.flatMap((e) => editWordIndices(tokens, e));
  const found = spans.map((s) => s.some((w) => touched.includes(w)));
  const unchanged = bare(result) === bare(item.sentence);

  if (!item.fixes.length) return { verdict: unchanged ? 'right' : 'changed', result, found };
  if (item.fixes.some((f) => bare(f) === bare(result))) return { verdict: 'fixed', result, found: found.map(() => true) };
  if (item.fixes.some((f) => stripAccents(bare(f)) === stripAccents(bare(result)))) {
    return { verdict: 'almost', result, found: found.map(() => true) };
  }
  if (unchanged || !found.some(Boolean)) return { verdict: 'missed', result, found };
  return { verdict: found.every(Boolean) ? 'found' : 'partly', result, found };
}

/** Fixed, or rightly left alone: the sentence doesn't come back. */
export const resolves = (v: ProofreadVerdict) => v === 'right' || v === 'fixed';

/** The fix to show: the one nearest to what the learner wrote. */
export function bestFix(item: ProofreadItem, result: string): string | undefined {
  if (!item.fixes.length) return undefined;
  const score = (f: string) => changedWords(result, f).size;
  return [...item.fixes].sort((a, b) => score(a) - score(b))[0];
}
