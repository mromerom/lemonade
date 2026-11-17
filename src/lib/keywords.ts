import { lexicon } from '../content';
import type { KeyWord, LearnerState, PartOfSpeech, WritingSet } from '../types';
import { isSaved } from './textWords';

/**
 * Key words in the learner's English sentences (writing exercise), with
 * their Spanish dictionary form, so they can look up a word they don't know
 * yet. The AI picks the words and the meaning in context, once per set; our
 * lexicon is checked first, and without the AI it's the only source.
 */

const CONTENT: Partial<Record<PartOfSpeech, KeyWord['pos']>> = {
  noun: 'noun',
  verb: 'verb',
  adjective: 'adjective',
  adverb: 'adverb',
};

interface IndexHit {
  key: string;
  pos: KeyWord['pos'];
  gloss: string;
}

/**
 * English → Spanish, worked out from the lexicon's glosses ("stall; stand (at
 * a market)" gives "stall" and "stand"), for dictionary forms only: an entry
 * that points to another with lemma: is a conjugated or inflected form.
 */
const englishIndex = new Map<string, IndexHit[]>();
for (const entry of Object.values(lexicon)) {
  if (entry.name) continue;
  for (const sense of entry.senses) {
    const pos = sense.pos && CONTENT[sense.pos];
    if (!pos || (sense.lemma && sense.lemma !== entry.term)) continue;
    for (const part of sense.gloss.split(/[;,]/)) {
      const en = part
        .replace(/\([^)]*\)/g, '')
        .replace(/^\s*to\s+/i, '')
        .trim()
        .toLocaleLowerCase('en');
      if (!en || en.split(' ').length > 2) continue;
      const list = englishIndex.get(en) ?? [];
      if (!list.some((h) => h.key === entry.term)) list.push({ key: entry.term, pos, gloss: sense.gloss });
      englishIndex.set(en, list);
    }
  }
}

const IRREGULAR: Record<string, string> = {
  went: 'go', gone: 'go', did: 'do', done: 'do', made: 'make', took: 'take', taken: 'take', saw: 'see', seen: 'see',
  met: 'meet', had: 'have', ate: 'eat', eaten: 'eat', felt: 'feel', thought: 'think', bought: 'buy', told: 'tell',
  said: 'say', got: 'get', left: 'leave', came: 'come', ran: 'run', wrote: 'write', gave: 'give', given: 'give',
  children: 'child', people: 'person', better: 'good', best: 'good',
};

/** Possible base forms of an English word: went → go, mountains → mountain, cooked → cook. */
function baseForms(word: string): string[] {
  const w = word.toLocaleLowerCase('en');
  const out = [w];
  if (IRREGULAR[w]) out.push(IRREGULAR[w]);
  if (w.endsWith('ies')) out.push(`${w.slice(0, -3)}y`);
  if (w.endsWith('es')) out.push(w.slice(0, -2));
  if (w.endsWith('s')) out.push(w.slice(0, -1));
  if (w.endsWith('ed')) out.push(w.slice(0, -2), w.slice(0, -1));
  if (w.endsWith('ing')) out.push(w.slice(0, -3), `${w.slice(0, -3)}e`);
  return out;
}

const VERB_CUES = new Set(['i', 'you', 'he', 'she', 'we', 'they', 'to', 'will', "i'll", "we'll", 'would', 'can', 'could']);

/** Key words found in our lexicon only: what works without the AI. */
export function lexiconKeywords(sentence: string): KeyWord[] {
  const found: KeyWord[] = [];
  let previous = '';
  for (const m of sentence.matchAll(/[A-Za-z][A-Za-z'-]*/g)) {
    const hits = baseForms(m[0]).flatMap((b) => englishIndex.get(b) ?? []);
    // After a subject or "to", the word is most likely a verb ("I work", "to start").
    const verbish = VERB_CUES.has(previous);
    previous = m[0].toLocaleLowerCase('en');
    const hit = hits.find((h) => (h.pos === 'verb') === verbish) ?? hits[0];
    if (hit && !found.some((k) => k.lexiconKey === hit.key)) {
      found.push({ text: m[0], es: hit.key, pos: hit.pos, gloss: hit.gloss, lexiconKey: hit.key });
    }
  }
  return found;
}

/** The AI's key words, matched to our lexicon when the dictionary form is in it. Throws if the AI can't be reached. */
export async function fetchKeywords(sentences: string[]): Promise<KeyWord[][]> {
  const res = await fetch('/api/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'keywords', sentences }),
  });
  if (!res.ok) throw new Error(`Keywords failed: ${res.status}`);
  const { keywords } = (await res.json()) as { keywords: KeyWord[][] };
  return keywords.map((list) => list.map((k) => (lexicon[k.es] ? { ...k, lexiconKey: k.es } : k)));
}

/** Key words for a set: the AI's if it answered, otherwise what the lexicon finds. */
export async function keywordsForSet(set: WritingSet): Promise<KeyWord[][]> {
  const sentences = set.items.map((i) => i.english);
  try {
    return await fetchKeywords(sentences);
  } catch {
    return sentences.map(lexiconKeywords);
  }
}

/**
 * Is this word's Spanish already in the learner's word bank? For a lexicon
 * word, any saved form of it counts (fui, iba for ir).
 */
export function hasSaved(state: LearnerState, k: KeyWord): boolean {
  if (!k.lexiconKey) return Boolean(state.userWords?.[k.es]);
  if (isSaved(state, k.lexiconKey)) return true;
  return Object.values(lexicon).some(
    (e) => e.senses[0]?.lemma === k.lexiconKey && isSaved(state, e.term),
  );
}

/** Split an English sentence into text and the key words in it (first match of each, no overlaps). */
export function markKeywords(sentence: string, keywords: KeyWord[]): ({ text: string } | { text: string; word: KeyWord })[] {
  const spans: { start: number; end: number; word: KeyWord }[] = [];
  const lower = sentence.toLocaleLowerCase('en');
  for (const word of keywords) {
    const re = new RegExp(`\\b${word.text.toLocaleLowerCase('en').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    const m = re.exec(lower);
    if (!m) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (spans.some((s) => start < s.end && s.start < end)) continue;
    spans.push({ start, end, word });
  }
  spans.sort((a, b) => a.start - b.start);
  const out: ({ text: string } | { text: string; word: KeyWord })[] = [];
  let at = 0;
  for (const s of spans) {
    if (s.start > at) out.push({ text: sentence.slice(at, s.start) });
    out.push({ text: sentence.slice(s.start, s.end), word: s.word });
    at = s.end;
  }
  if (at < sentence.length) out.push({ text: sentence.slice(at) });
  return out;
}
