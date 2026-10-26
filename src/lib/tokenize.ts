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

