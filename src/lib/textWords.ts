import type { LearnerState, Text, WordStatus } from '../types';
import { tokenize } from './tokenize';

/** Every Spanish string in a text: story, retelling, and Q&A. */
export function spanishStrings(text: Text): string[] {
  return [
    ...text.story.map((p) => p.es),
    ...text.retelling.paragraphs.map((p) => p.es),
    ...text.qa.flatMap((q) => [q.statement.es, q.question.es, q.answer.es]),
  ];
}

/** Unique trackable word keys in a text (proper nouns excluded). */
export function textWordKeys(text: Text): string[] {
  const keys = new Set<string>();
  for (const s of spanishStrings(text)) {
    for (const t of tokenize(s)) {
      if (t.kind === 'word' && !text.glossary[t.key]?.name) keys.add(t.key);
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

/** Split a paragraph into sentences, keeping punctuation. */
export function sentences(es: string): string[] {
  return es.split(/(?<=[.!?])\s+/).filter(Boolean);
}

export interface Evidence {
  story: string;
  retelling?: string;
}

/**
 * The first story sentence using any of the target's forms, plus the matching
 * sentence from the retelling (the two parts are written in parallel).
 */
export function findEvidence(text: Text, match: string[]): Evidence | null {
  const forms = new Set(match.map((m) => m.toLocaleLowerCase('es')));
  for (let p = 0; p < text.story.length; p++) {
    const storySentences = sentences(text.story[p].es);
    for (let s = 0; s < storySentences.length; s++) {
      const hit = tokenize(storySentences[s]).some((t) => t.kind === 'word' && forms.has(t.key));
      if (hit) {
        const retold = text.retelling.paragraphs[p] && sentences(text.retelling.paragraphs[p].es)[s];
        return { story: storySentences[s], retelling: retold };
      }
    }
  }
  return null;
}
