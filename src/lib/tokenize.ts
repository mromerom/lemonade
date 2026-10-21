export type Token =
  | { kind: 'word'; text: string; key: string }
  | { kind: 'other'; text: string };

const WORD = /(\p{L}+)/u;

/** Split text into word and non-word tokens, preserving everything. */
export function tokenize(text: string): Token[] {
  return text
    .split(WORD)
    .filter((part) => part.length > 0)
    .map((part) =>
      WORD.test(part) && /^\p{L}+$/u.test(part)
        ? { kind: 'word', text: part, key: wordKey(part) }
        : { kind: 'other', text: part },
    );
}

export function wordKey(word: string): string {
  return word.toLocaleLowerCase('es');
}

/**
 * Group tokens into unbreakable runs separated by whitespace, so punctuation
 * stays on the same line as the word it touches ("vendedor." / "—pregunta").
 */
export type Run = { kind: 'run'; tokens: Token[] } | { kind: 'space'; text: string };

export function toRuns(tokens: Token[]): Run[] {
  const runs: Run[] = [];
  let current: Token[] = [];
  const flush = () => {
    if (current.length) runs.push({ kind: 'run', tokens: current });
    current = [];
  };
  for (const t of tokens) {
    if (t.kind === 'word') {
      current.push(t);
      continue;
    }
    const parts = t.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        flush();
        runs.push({ kind: 'space', text: part });
      } else {
        current.push({ kind: 'other', text: part });
      }
    });
  }
  flush();
  return runs;
}
