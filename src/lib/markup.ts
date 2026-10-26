import { tokenize, type Token } from './tokenize';

/**
 * A piece of marked-up Spanish text.
 *   term  – a word or bracketed phrase that maps to a lexicon entry
 *   other – spaces and punctuation
 */
export type Segment =
  | { kind: 'term'; text: string; key: string; sense?: string; phrase: boolean }
  | { kind: 'other'; text: string };

const BRACKET = /\[([^\]:]+)(?::([\w-]+))?\]/g;

export function parseMarkup(es: string): Segment[] {
  const out: Segment[] = [];
  const pushPlain = (s: string) => {
    for (const t of tokenize(s)) {
      out.push(t.kind === 'word' ? { kind: 'term', text: t.text, key: t.key, phrase: false } : t);
    }
  };
  let last = 0;
  for (const m of es.matchAll(BRACKET)) {
    pushPlain(es.slice(last, m.index));
    const text = m[1].trim();
    out.push({
      kind: 'term',
      text,
      key: text.toLocaleLowerCase('es').replace(/\s+/g, ' '),
      sense: m[2],
      phrase: /\s/.test(text),
    });
    last = m.index + m[0].length;
  }
  pushPlain(es.slice(last));
  return out;
}

/** The text as a reader sees it, with markup removed. */
export function plainText(es: string): string {
  return es.replace(BRACKET, '$1');
}

/** Words inside a segment, for highlighting and evidence. */
export function segmentWords(seg: Segment): Token[] {
  return seg.kind === 'term' ? tokenize(seg.text).filter((t) => t.kind === 'word') : [];
}

/**
 * Group segments into unbreakable runs separated by whitespace, so punctuation
 * stays on the same line as the word it touches ("vendedor." / "—pregunta").
 */
export type SegmentRun = { kind: 'run'; segments: Segment[] } | { kind: 'space'; text: string };

export function toSegmentRuns(segments: Segment[]): SegmentRun[] {
  const runs: SegmentRun[] = [];
  let current: Segment[] = [];
  const flush = () => {
    if (current.length) runs.push({ kind: 'run', segments: current });
    current = [];
  };
  for (const s of segments) {
    if (s.kind === 'term') {
      current.push(s);
      continue;
    }
    for (const part of s.text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        flush();
        runs.push({ kind: 'space', text: part });
      } else {
        current.push({ kind: 'other', text: part });
      }
    }
  }
  flush();
  return runs;
}
