import { lookupTerm } from '../content';
import type { LearnerState, Text, WordStatus } from '../types';
import { parseMarkup, plainText } from './markup';
import { tokenize } from './tokenize';

/** Every Spanish string in a text (with markup): story, retelling, and Q&A. */
export function spanishStrings(text: Text): string[] {
  return [
    ...text.story.map((p) => p.es),
    ...text.retelling.paragraphs.map((p) => p.es),
    ...text.qa.flatMap((q) => [q.statement.es, q.question.es, q.answer.es]),
  ];
}

/** Unique trackable terms in a text: words and bracketed phrases, proper nouns excluded. */
export function textWordKeys(text: Text): string[] {
  const keys = new Set<string>();
  for (const s of spanishStrings(text)) {
    for (const seg of parseMarkup(s)) {
      if (seg.kind === 'term' && !lookupTerm(seg.key)?.name) keys.add(seg.key);
    }
  }
  return [...keys];
}

export function statusCounts(text: Text, state: LearnerState): Record<WordStatus, number> {
  const counts: Record<WordStatus, number> = { new: 0, learning: 0, known: 0 };
  for (const key of textWordKeys(text)) counts[state.words[key]?.status ?? 'new']++;
  return counts;
}

export function wordStatus(state: LearnerState, key: string): WordStatus {
  return state.words[key]?.status ?? 'new';
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
