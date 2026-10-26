/**
 * Parsers for the plain-text content files (see the comments at the top of
 * lexicon.txt and texts/*.txt for the format). Pure functions with no Vite
 * dependencies, so the content checker can run them in Node.
 */
import type { Lexicon, LexiconEntry, Paragraph, QAItem, Sense } from '../types';

export interface ParseError {
  file: string;
  line: number;
  message: string;
}

// ---------- Lexicon ----------

export function parseLexicon(raw: string, file = 'lexicon.txt'): { lexicon: Lexicon; errors: ParseError[] } {
  const lexicon: Lexicon = {};
  const errors: ParseError[] = [];
  let entry: LexiconEntry | null = null;
  let sense: Sense | null = null;

  raw.split(/\r?\n/).forEach((rawLine, i) => {
    const line = i + 1;
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) return;
    const indent = rawLine.length - rawLine.trimStart().length;
    const text = rawLine.trim();

    if (indent === 0) {
      const term = text.toLocaleLowerCase('es');
      if (lexicon[term]) errors.push({ file, line, message: `"${term}" is defined twice` });
      entry = { term, senses: [] };
      sense = null;
      lexicon[term] = entry;
      return;
    }
    if (!entry) {
      errors.push({ file, line, message: 'Indented line before any term' });
      return;
    }

    const senseMatch = /^sense\s+([\w-]+)\s*:\s*(.+)$/.exec(text);
    if (senseMatch) {
      if (!entry.senses.length) {
        errors.push({ file, line, message: `"${entry.term}" needs a gloss: line before its other senses` });
      }
      sense = { id: senseMatch[1], gloss: senseMatch[2].trim() };
      if (entry.senses.some((s) => s.id === sense!.id)) {
        errors.push({ file, line, message: `"${entry.term}" has two senses named "${sense.id}"` });
      }
      entry.senses.push(sense);
      return;
    }

    const field = /^(\w+)\s*:\s*(.*)$/.exec(text);
    if (!field) {
      errors.push({ file, line, message: `Can't read "${text}". Expected "key: value".` });
      return;
    }
    const [, key, value] = field;
    // Fields indented under a sense belong to that sense.
    const target = sense && indent > 2 ? sense : null;

    switch (key) {
      case 'gloss':
        if (target) target.gloss = value;
        else if (entry.senses[0]?.id === 'default') entry.senses[0].gloss = value;
        else entry.senses.unshift({ id: 'default', gloss: value });
        break;
      case 'lemma':
      case 'note': {
        const s = target ?? entry.senses.find((x) => x.id === 'default');
        if (!s) errors.push({ file, line, message: `"${key}" before "gloss" for "${entry.term}"` });
        else s[key] = value;
        break;
      }
      case 'name':
        entry.name = value === 'yes' || value === 'true';
        break;
      case 'words':
        entry.words = value.split(',').map((w) => {
          const [word, s] = w.trim().split(':');
          return { word: word.toLocaleLowerCase('es'), sense: s };
        });
        break;
      default:
        errors.push({ file, line, message: `Unknown field "${key}"` });
    }
  });

  for (const e of Object.values(lexicon)) {
    if (!e.senses.length && !e.name) errors.push({ file, line: 0, message: `"${e.term}" has no gloss` });
  }
  return { lexicon, errors };
}

// ---------- Stories ----------

export interface ParsedStory {
  id: string;
  /** Source file, relative to src/content */
  source: string;
  title: string;
  titleEn: string;
  level: string;
  summaryEn: string;
  story: Paragraph[];
  retelling: { narrator: string; example?: [string, string]; paragraphs: Paragraph[] };
  qa: QAItem[];
}

interface Block {
  line: number;
  lines: string[];
}

function blocks(lines: { n: number; text: string }[]): Block[] {
  const out: Block[] = [];
  let current: Block | null = null;
  for (const { n, text } of lines) {
    if (!text.trim()) {
      current = null;
      continue;
    }
    if (!current) {
      current = { line: n, lines: [] };
      out.push(current);
    }
    current.lines.push(text.trim());
  }
  return out;
}

function paragraph(block: Block, file: string, errors: ParseError[]): Paragraph {
  const es = block.lines.filter((l) => !l.startsWith('>')).join(' ');
  const en = block.lines
    .filter((l) => l.startsWith('>'))
    .map((l) => l.slice(1).trim())
    .join(' ');
  if (!es) errors.push({ file, line: block.line, message: 'Paragraph has a translation but no Spanish' });
  if (!en) errors.push({ file, line: block.line, message: 'Paragraph has no "> " translation' });
  return { es, en };
}

function qaItem(block: Block, file: string, errors: ParseError[]): QAItem | null {
  const part = (tag: 'S' | 'Q' | 'A'): Paragraph | null => {
    const i = block.lines.findIndex((l) => l.startsWith(`${tag}:`));
    if (i < 0) return null;
    const next = block.lines[i + 1];
    return { es: block.lines[i].slice(2).trim(), en: next?.startsWith('>') ? next.slice(1).trim() : '' };
  };
  const statement = part('S');
  const question = part('Q');
  const answer = part('A');
  if (!statement || !question || !answer) {
    errors.push({ file, line: block.line, message: 'Each Preguntas item needs S:, Q: and A: lines' });
    return null;
  }
  for (const [name, p] of [['S', statement], ['Q', question], ['A', answer]] as const) {
    if (!p.en) errors.push({ file, line: block.line, message: `${name}: line has no "> " translation after it` });
  }
  return { statement, question, answer };
}

const SECTIONS = { historia: 'story', retelling: 'retelling', preguntas: 'qa' } as const;

export function parseStory(raw: string, file: string): { story: ParsedStory | null; errors: ParseError[] } {
  const errors: ParseError[] = [];
  const all = raw.split(/\r?\n/).map((text, i) => ({ n: i + 1, text }));

  // Front matter
  const meta: Record<string, string> = {};
  let start = 0;
  if (all[0]?.text.trim() === '---') {
    const end = all.findIndex((l, i) => i > 0 && l.text.trim() === '---');
    if (end < 0) {
      errors.push({ file, line: 1, message: 'Front matter starts with --- but never ends' });
      return { story: null, errors };
    }
    for (const { n, text } of all.slice(1, end)) {
      const m = /^(\w+)\s*:\s*(.*)$/.exec(text.trim());
      if (m) meta[m[1]] = m[2].trim();
      else if (text.trim()) errors.push({ file, line: n, message: `Can't read front matter line "${text}"` });
    }
    start = end + 1;
  }
  for (const key of ['id', 'title', 'titleEn', 'level', 'summary', 'narrator']) {
    if (!meta[key]) errors.push({ file, line: 1, message: `Front matter is missing "${key}"` });
  }

  // Sections ("## Name"); other lines starting with # are comments.
  const sections: Record<string, { n: number; text: string }[]> = {};
  let current: string | null = null;
  for (const l of all.slice(start)) {
    const t = l.text.trim();
    const heading = /^##\s+(.+)$/.exec(t);
    if (heading) {
      const name = heading[1].trim().toLowerCase() as keyof typeof SECTIONS;
      if (!(name in SECTIONS)) {
        errors.push({ file, line: l.n, message: `Unknown section "${heading[1]}". Use Historia, Retelling or Preguntas.` });
        current = null;
      } else {
        current = SECTIONS[name];
        sections[current] = [];
      }
      continue;
    }
    if (t.startsWith('#')) continue;
    if (current) sections[current].push(l);
    else if (t) errors.push({ file, line: l.n, message: 'Text outside any ## section' });
  }
  for (const s of Object.values(SECTIONS)) {
    if (!sections[s]) errors.push({ file, line: 0, message: `Missing section for ${s}` });
  }

  const story = blocks(sections.story ?? []).map((b) => paragraph(b, file, errors));
  const retold = blocks(sections.retelling ?? []).map((b) => paragraph(b, file, errors));
  const qa = blocks(sections.qa ?? [])
    .map((b) => qaItem(b, file, errors))
    .filter((q): q is QAItem => q !== null);

  let example: [string, string] | undefined;
  if (meta.example) {
    const [a, b] = meta.example.split('=>').map((s) => s.trim());
    if (a && b) example = [a, b];
    else errors.push({ file, line: 1, message: 'example should look like "Lucía va => voy"' });
  }

  return {
    story: {
      id: meta.id ?? '',
      source: file,
      title: meta.title ?? '',
      titleEn: meta.titleEn ?? '',
      level: meta.level ?? '',
      summaryEn: meta.summary ?? '',
      story,
      retelling: { narrator: meta.narrator ?? '', example, paragraphs: retold },
      qa,
    },
    errors,
  };
}
