import { lexicon } from '../content';
import { texts } from '../data/texts';
import type { LearnerState, PartOfSpeech, Sense, Target, Text, WordStatus } from '../types';
import { gradeTarget } from './gradeTarget';
import { parseMarkup, plainText, type Segment } from './markup';
import { tokenize } from './tokenize';
import { normalize } from './grade';

export type LevelBand = 'beginner' | 'intermediate' | 'advanced';

export const LEVEL_BAND_LABEL: Record<LevelBand, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** CEFR level of a text → band: A1–A2 beginner, B1–B2 intermediate, C1–C2 advanced. */
export function levelBand(level: string): LevelBand {
  if (level.startsWith('A')) return 'beginner';
  if (level.startsWith('B')) return 'intermediate';
  return 'advanced';
}

/** A sentence a term appeared in, from a story or retelling. */
export interface Context {
  textId: string;
  textTitle: string;
  level: string;
  /** Marked-up Spanish sentence */
  sentence: string;
}

export interface BankEntry {
  key: string;
  /** Spanish as shown */
  es: string;
  /** English meaning (main sense, or the learner's own for their phrases) */
  en: string;
  senses: Sense[];
  pos: PartOfSpeech[];
  status: Exclude<WordStatus, 'new'>;
  addedAt: number;
  levels: string[];
  bands: LevelBand[];
  /** Missed in a reading's after-reading questions */
  missed: boolean;
  /** Grouped by the learner with shift-click */
  userPhrase: boolean;
}

// ---------- Index of where each term appears (built once) ----------

interface Occurrence {
  text: Text;
  sentence: string;
}

/** Split marked-up text into sentences without breaking inside [brackets]. */
function markedSentences(es: string): string[] {
  return es.split(/(?<=[.!?])\s+(?![^[]*\])/).filter(Boolean);
}

const occurrences = new Map<string, Occurrence[]>();
for (const text of texts) {
  for (const para of [...text.story, ...text.retelling.paragraphs]) {
    for (const sentence of markedSentences(para.es)) {
      for (const seg of parseMarkup(sentence)) {
        if (seg.kind !== 'term') continue;
        // A phrase counts for itself and for each word in it ("armé" in "me armé de valor").
        const keys = [seg.key, ...(seg.phrase ? tokenize(seg.text).filter((t) => t.kind === 'word').map((t) => t.key) : [])];
        for (const key of keys) {
          const list = occurrences.get(key) ?? [];
          if (!list.some((o) => o.sentence === sentence)) list.push({ text, sentence });
          occurrences.set(key, list);
        }
      }
    }
  }
}

/** Sentences a term appeared in, story first. Learner phrases are found by their text. */
export function contextsFor(key: string, limit = 4): Context[] {
  let found = occurrences.get(key) ?? [];
  if (!found.length && key.includes(' ')) {
    found = texts.flatMap((text) =>
      [...text.story, ...text.retelling.paragraphs]
        .flatMap((p) => markedSentences(p.es))
        .filter((s) => normalize(plainText(s)).includes(normalize(key)))
        .map((sentence) => ({ text, sentence })),
    );
  }
  return found.slice(0, limit).map((o) => ({
    textId: o.text.id,
    textTitle: o.text.title,
    level: o.text.level,
    sentence: o.sentence,
  }));
}

/** Which segments of a marked-up sentence to highlight for a term. */
export function highlightSegments(sentence: string, key: string): { seg: Segment; hit: boolean }[] {
  const words = key.split(' ');
  const segs = parseMarkup(sentence);
  return segs.map((seg) => ({
    seg,
    hit:
      seg.kind === 'term' &&
      (seg.key === key ||
        // the word sits inside a bracketed phrase
        (seg.phrase && words.length === 1 && seg.key.split(' ').includes(key)) ||
        // a learner's own phrase: highlight its words
        (words.length > 1 && !lexicon[key] && words.includes(seg.key))),
  }));
}

// ---------- Missed words ----------

/** The lexicon term a question is about: the word for meanings, the answer form for verbs. */
export function targetTerm(target: Target): string | undefined {
  const candidates =
    target.kind === 'meaning'
      ? [target.word, ...target.match]
      : [target.post.accept[0], ...target.match];
  return candidates.map((c) => c.toLocaleLowerCase('es')).find((c) => lexicon[c]);
}

/** Terms from questions answered wrong after reading, in readings that reached the results. */
export function missedTerms(state: LearnerState): Set<string> {
  const missed = new Set<string>();
  for (const text of texts) {
    const lesson = state.lessons[text.id];
    if (!lesson || (lesson.stage !== 'compare' && lesson.stage !== 'done')) continue;
    for (const t of text.targets) {
      if (gradeTarget(t, lesson.postAnswers[t.id] ?? '').verdict === 'correct') continue;
      const term = targetTerm(t);
      if (term) missed.add(term);
    }
  }
  return missed;
}

// ---------- The bank ----------

export function wordBank(state: LearnerState): BankEntry[] {
  const missed = missedTerms(state);
  const keys = new Set<string>([
    ...Object.entries(state.words)
      .filter(([, r]) => r.status !== 'new')
      .map(([k]) => k),
    ...missed,
    ...Object.keys(state.userPhrases ?? {}),
  ]);

  const entries: BankEntry[] = [];
  for (const key of keys) {
    const entry = lexicon[key];
    if (entry?.name) continue;
    const record = state.words[key];
    const userPhrase = state.userPhrases?.[key];
    const levels = [...new Set(contextsFor(key, 99).map((c) => c.level))].sort();
    const senses = entry?.senses ?? [];
    entries.push({
      key,
      es: userPhrase?.text ?? key,
      en: userPhrase?.gloss || senses[0]?.gloss || '—',
      senses,
      pos: userPhrase ? ['phrase'] : [...new Set(senses.map((s) => s.pos).filter((p): p is PartOfSpeech => !!p))],
      status: record?.status === 'known' ? 'known' : 'learning',
      addedAt: record?.addedAt ?? userPhrase?.createdAt ?? record?.updatedAt ?? 0,
      levels,
      bands: [...new Set(levels.map(levelBand))],
      missed: missed.has(key),
      userPhrase: Boolean(userPhrase),
    });
  }
  return entries;
}

/** Most recently added first. */
export function recentEntries(state: LearnerState, n = 10): BankEntry[] {
  return wordBank(state)
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, n);
}
