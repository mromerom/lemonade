import type { LearnerState, Text, WordStatus } from '../types';
import { tokenize } from './tokenize';

/** Unique trackable word keys in a text (proper nouns excluded). */
export function textWordKeys(text: Text): string[] {
  const keys = new Set<string>();
  for (const p of text.paragraphs) {
    for (const t of tokenize(p.es)) {
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
