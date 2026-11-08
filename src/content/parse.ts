/**
 * Parsers for the plain-text content files (see the comments at the top of
 * lexicon.txt and texts/*.txt for the format). Pure functions with no Vite
 * dependencies, so the content checker can run them in Node.
 */
import { FORM_PERSONS, PARTS_OF_SPEECH, TENSES, type FormPerson, type Tense, type VerbForm, type Lexicon, type LexiconEntry, type Paragraph, type PartOfSpeech, type ReadingQuestion, type Sense, type Translated } from '../types';

export interface ParseError {
  file: string;
  line: number;
  message: string;
}

// ---------- Lexicon ----------

/** Persons as written in the lexicon; "él", "ella", "usted" all mean él/ella. */
const PERSON_ALIASES: Record<string, FormPerson> = {
  él: 'él/ella', ella: 'él/ella', usted: 'él/ella', ellos: 'ellos/ellas', ellas: 'ellos/ellas', ustedes: 'ellos/ellas',
};

/** "yo, preterite" or "present" or "infinitive" → VerbForm, or an error message. */
export function parseForm(value: string): VerbForm | string {
  const parts = value.split(',').map((p) => p.trim());
  const tense = parts.pop() as Tense;
  if (!(TENSES as readonly string[]).includes(tense)) {
    return `Unknown tense "${tense}" in form. Use one of: ${TENSES.join(', ')}`;
  }
  if (!parts.length) return { tense };
  const raw = parts.join(',');
  const person = PERSON_ALIASES[raw] ?? raw;
  if (parts.length > 1 || !(FORM_PERSONS as readonly string[]).includes(person)) {
    return `Unknown person "${raw}" in form. Use one of: ${FORM_PERSONS.join(', ')}`;
  }
  if (['infinitive', 'gerund', 'participle'].includes(tense)) return `An ${tense} has no person: write "form: ${tense}"`;
  return { person: person as FormPerson, tense };
}

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
      case 'pos': {
        const s = target ?? entry.senses.find((x) => x.id === 'default');
        if (!(PARTS_OF_SPEECH as readonly string[]).includes(value)) {
          errors.push({ file, line, message: `Unknown pos "${value}". Use one of: ${PARTS_OF_SPEECH.join(', ')}` });
        } else if (!s) {
          errors.push({ file, line, message: `"pos" before "gloss" for "${entry.term}"` });
        } else {
          s.pos = value as PartOfSpeech;
        }
        break;
      }
      case 'form': {
        const s = target ?? entry.senses.find((x) => x.id === 'default');
        const parsed = parseForm(value);
        if (typeof parsed === 'string') errors.push({ file, line, message: parsed });
        else if (!s) errors.push({ file, line, message: `"form" before "gloss" for "${entry.term}"` });
        else s.form = parsed;
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
    // Other senses share the main part of speech unless they set their own.
    // A verb's other senses are the same conjugation unless they say otherwise.
    const main = e.senses[0];
    for (const s of e.senses.slice(1)) {
      s.pos ??= main?.pos;
      if (s.pos === main?.pos) s.form ??= main?.form;
    }
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

/**
 * A paragraph block: Spanish lines, "> " translation lines, then optionally
 * its question:
 *
 *   Q: ¿Qué compra el abuelo?     the question
 *   > What does grandpa buy?
 *   A: Naranjas.                  a model answer
 *   > Oranges.
 *   accept: unas naranjas | dos kilos de naranjas
 */
function paragraph(block: Block, id: string, file: string, errors: ParseError[]): Paragraph {
  const q = block.lines.findIndex((l) => /^Q:/.test(l));
  const body = q < 0 ? block.lines : block.lines.slice(0, q);
  const es = body.filter((l) => !l.startsWith('>')).join(' ');
  const en = body
    .filter((l) => l.startsWith('>'))
    .map((l) => l.slice(1).trim())
    .join(' ');
  if (!es) errors.push({ file, line: block.line, message: 'Paragraph has a translation but no Spanish' });
  if (!en) errors.push({ file, line: block.line, message: 'Paragraph has no "> " translation' });
  const para: Paragraph = { es, en };
  if (q >= 0) {
    const question = readingQuestion(block.lines.slice(q), id, file, block.line, errors);
    if (question) para.question = question;
  }
  return para;
}

function readingQuestion(
  lines: string[],
  id: string,
  file: string,
  line: number,
  errors: ParseError[],
): ReadingQuestion | null {
  const part = (tag: 'Q' | 'A'): Translated | null => {
    const i = lines.findIndex((l) => l.startsWith(`${tag}:`));
    if (i < 0) return null;
    const next = lines[i + 1];
    if (!next?.startsWith('>')) errors.push({ file, line, message: `${tag}: line has no "> " translation after it` });
    return { es: lines[i].slice(2).trim(), en: next?.startsWith('>') ? next.slice(1).trim() : '' };
  };
  const question = part('Q');
  const answer = part('A');
  if (!question || !answer) {
    errors.push({ file, line, message: 'A paragraph question needs a Q: line and an A: line' });
    return null;
  }
  const acceptLine = lines.find((l) => /^accept:/i.test(l));
  const accept = acceptLine
    ? acceptLine
        .slice(acceptLine.indexOf(':') + 1)
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  for (const l of lines) {
    if (!/^(Q:|A:|>|accept:)/i.test(l)) errors.push({ file, line, message: `Can't read "${l}" in the question` });
  }
  return { id, question, answer, accept };
}

const SECTIONS = { historia: 'story', retelling: 'retelling' } as const;

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
      if (name === ('preguntas' as string)) {
        errors.push({ file, line: l.n, message: 'There is no Preguntas section any more: put a Q:/A: question under each paragraph.' });
        current = null;
      } else if (!(name in SECTIONS)) {
        errors.push({ file, line: l.n, message: `Unknown section "${heading[1]}". Use Historia or Retelling.` });
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

  const story = blocks(sections.story ?? []).map((b, i) => paragraph(b, `story-${i}`, file, errors));
  const retold = blocks(sections.retelling ?? []).map((b, i) => paragraph(b, `retell-${i}`, file, errors));

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
    },
    errors,
  };
}
