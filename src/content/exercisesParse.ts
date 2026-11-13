/** Parsers for the exercise content files. No imports, so the server can use them too. */

export interface WritingTopic {
  id: string;
  title: string;
  about: string;
  prompts: string[];
}

export interface WritingAddon {
  id: string;
  title: string;
  about: string;
  /** The line added under each prompt */
  twist: string;
}

export interface ProofreadSeed {
  id: string;
  sentence: string;
  /** Corrected versions; empty when the sentence has no mistake */
  fixes: string[];
  note: string;
  area?: string;
}

export interface ContentError {
  file: string;
  line: number;
  message: string;
}

/** Lines with their numbers, comments dropped. */
function lines(source: string) {
  return source
    .split('\n')
    .map((text, i) => ({ text: text.trim(), n: i + 1 }))
    .filter((l) => !l.text.startsWith('#') || l.text.startsWith('## '));
}

export function parsePrompts(source: string, file = 'exercises/prompts.txt') {
  const topics: WritingTopic[] = [];
  const addons: WritingAddon[] = [];
  const errors: ContentError[] = [];
  let current: { kind: 'topic'; v: WritingTopic } | { kind: 'addon'; v: WritingAddon } | null = null;

  for (const { text, n } of lines(source)) {
    if (!text) continue;
    const head = /^## (topic|addon) ([a-z-]+)$/.exec(text);
    if (head) {
      if (head[1] === 'topic') {
        const v: WritingTopic = { id: head[2], title: '', about: '', prompts: [] };
        topics.push(v);
        current = { kind: 'topic', v };
      } else {
        const v: WritingAddon = { id: head[2], title: '', about: '', twist: '' };
        addons.push(v);
        current = { kind: 'addon', v };
      }
      continue;
    }
    if (!current) {
      errors.push({ file, line: n, message: `Text before the first "## topic" or "## addon": ${text}` });
      continue;
    }
    if (text.startsWith('- ') && current.kind === 'topic') {
      current.v.prompts.push(text.slice(2).trim());
      continue;
    }
    const field = /^(title|about|twist):\s*(.*)$/.exec(text);
    if (field && !(field[1] === 'twist' && current.kind === 'topic')) {
      (current.v as unknown as Record<string, string>)[field[1]] = field[2];
      continue;
    }
    errors.push({ file, line: n, message: `Can't read "${text}"` });
  }

  for (const t of topics) {
    if (!t.title) errors.push({ file, line: 0, message: `Topic "${t.id}" has no title` });
    if (t.prompts.length < 5) errors.push({ file, line: 0, message: `Topic "${t.id}" needs at least 5 prompts` });
  }
  for (const a of addons) {
    if (!a.title || !a.twist) errors.push({ file, line: 0, message: `Add-on "${a.id}" needs a title and a twist` });
  }
  return { topics, addons, errors };
}

export function parseProofread(source: string, file = 'exercises/proofread.txt') {
  const items: ProofreadSeed[] = [];
  const errors: ContentError[] = [];
  const blocks: { n: number; lines: string[] }[] = [];
  let block: { n: number; lines: string[] } | null = null;
  for (const { text, n } of lines(source)) {
    if (!text) {
      block = null;
      continue;
    }
    if (!block) blocks.push((block = { n, lines: [] }));
    block.lines.push(text);
  }

  for (const b of blocks) {
    const [sentence, ...rest] = b.lines;
    const item: ProofreadSeed = { id: `seed-${items.length + 1}`, sentence, fixes: [], note: '' };
    let correct = false;
    for (const l of rest) {
      const field = /^(fix|note|area):\s*(.*)$/.exec(l);
      if (l === 'correct') correct = true;
      else if (field?.[1] === 'fix') item.fixes.push(field[2]);
      else if (field?.[1] === 'note') item.note = field[2];
      else if (field?.[1] === 'area') item.area = field[2];
      else errors.push({ file, line: b.n, message: `Can't read "${l}"` });
    }
    if (correct && item.fixes.length) errors.push({ file, line: b.n, message: 'A sentence is either "correct" or has fix: lines, not both' });
    if (!correct && !item.fixes.length) errors.push({ file, line: b.n, message: 'Add fix: lines, or "correct" if there is no mistake' });
    if (!item.note) errors.push({ file, line: b.n, message: 'Every sentence needs a note: explaining the mistake, or why it is right' });
    if (item.fixes.some((f) => f === sentence)) errors.push({ file, line: b.n, message: 'A fix is the same as the sentence' });
    items.push(item);
  }
  return { items, errors };
}
