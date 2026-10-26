import lexiconRaw from './lexicon.txt?raw';
import { parseLexicon, parseStory, type ParsedStory } from './parse';
import type { LexiconEntry, Sense } from '../types';

const parsed = parseLexicon(lexiconRaw);
if (parsed.errors.length && import.meta.env?.DEV) {
  console.warn('[lemonade] lexicon problems (run npm run check:content):', parsed.errors);
}

export const lexicon = parsed.lexicon;

export function lookupTerm(key: string): LexiconEntry | undefined {
  return lexicon[key];
}

/** The sense used in context, falling back to the default. */
export function senseOf(entry: LexiconEntry | undefined, senseId?: string): Sense | undefined {
  if (!entry) return undefined;
  return entry.senses.find((s) => s.id === (senseId ?? 'default')) ?? entry.senses[0];
}

export function loadStory(raw: string, file: string): ParsedStory {
  const { story, errors } = parseStory(raw, file);
  if (errors.length && import.meta.env?.DEV) {
    console.warn(`[lemonade] problems in ${file} (run npm run check:content):`, errors);
  }
  if (!story) throw new Error(`Couldn't read ${file}`);
  return story;
}
