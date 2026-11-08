import { lookupTerm } from '../content';
import type { LearnerState, Text, WordStatus } from '../types';
import { parseMarkup, plainText } from './markup';
import { tokenize } from './tokenize';

/** Every marked-up Spanish string in a text: story and retelling. Questions are plain text. */
export function spanishStrings(text: Text): string[] {
  return [...text.story, ...text.retelling.paragraphs].map((p) => p.es);
}

/** Every paragraph question, story first. */
export function readingQuestions(text: Text) {
  return [...text.story, ...text.retelling.paragraphs].flatMap((p) => (p.question ? [p.question] : []));
}

/** Spanish strings the learner reads and taps: story and retelling (questions are plain text). */
export function readingStrings(text: Text): string[] {
  return [...text.story.map((p) => p.es), ...text.retelling.paragraphs.map((p) => p.es)];
}

/** A term with the meaning it has at one spot in a text. */
export interface TermUse {
  key: string;
  sense: string;
}

/**
 * Unique trackable terms in a text, one per meaning ("puestos" and
 * "puestos:job" are two): words and bracketed phrases, proper nouns excluded.
 */
export function textTerms(text: Text): TermUse[] {
  const seen = new Map<string, TermUse>();
  for (const s of readingStrings(text)) {
    for (const seg of parseMarkup(s)) {
      if (seg.kind !== 'term' || lookupTerm(seg.key)?.name) continue;
      const sense = seg.sense ?? 'default';
      seen.set(`${seg.key}:${sense}`, { key: seg.key, sense });
    }
  }
  return [...seen.values()];
}

export function statusCounts(text: Text, state: LearnerState): Record<WordStatus, number> {
  const counts: Record<WordStatus, number> = { new: 0, learning: 0, known: 0 };
  for (const t of textTerms(text)) counts[wordStatus(state, t.key, t.sense)]++;
  return counts;
}

/** Status of one meaning of a term; the main meaning unless a sense is given. */
export function wordStatus(state: LearnerState, key: string, sense = 'default'): WordStatus {
  const record = state.words[key];
  if (!record) return 'new';
  return sense === 'default' ? record.status : (record.senseStatus?.[sense] ?? 'new');
}

/** Saved in any meaning. */
export function isSaved(state: LearnerState, key: string): boolean {
  const record = state.words[key];
  return Boolean(record && (record.status !== 'new' || Object.values(record.senseStatus ?? {}).some((s) => s !== 'new')));
}

/** Split a paragraph into sentences (markup removed), keeping punctuation. */
export function sentences(es: string): string[] {
  return plainText(es).split(/(?<=[.!?])\s+/).filter(Boolean);
}

export interface Evidence {
  story: string;
  retelling?: string;
}

/**
 * The first story sentence using any of the target's forms, plus the matching
 * sentence from the retelling (the two parts are written in parallel).
 */
export function findEvidence(text: Text, match: string[], hint?: string): Evidence | null {
  const forms = new Set(match.map((m) => m.toLocaleLowerCase('es')));
  const needle = hint?.toLocaleLowerCase('es');
  for (let p = 0; p < text.story.length; p++) {
    const storySentences = sentences(text.story[p].es);
    for (let s = 0; s < storySentences.length; s++) {
      const hit =
        tokenize(storySentences[s]).some((t) => t.kind === 'word' && forms.has(t.key)) &&
        (!needle || storySentences[s].toLocaleLowerCase('es').includes(needle));
      if (hit) {
        const retold = text.retelling.paragraphs[p] && sentences(text.retelling.paragraphs[p].es)[s];
        return { story: storySentences[s], retelling: retold };
      }
    }
  }
  return null;
}
