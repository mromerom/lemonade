/**
 * Checks every reading and the lexicon, then prints each reading's terms.
 * Runs before every build (npm run build) and on its own: npm run check:content
 *
 * Errors stop the build. Warnings don't.
 */
import { readFileSync } from 'node:fs';
import { parseLexicon, parseStory } from '../src/content/parse';
import { texts } from '../src/data/texts';
import { parseMarkup, plainText } from '../src/lib/markup';
import { findEvidence, sentences, spanishStrings } from '../src/lib/textWords';
import { tokenize } from '../src/lib/tokenize';

const errors: string[] = [];
const warnings: string[] = [];

const lexRaw = readFileSync(new URL('../src/content/lexicon.txt', import.meta.url), 'utf8');
const { lexicon, errors: lexErrors } = parseLexicon(lexRaw);
for (const e of lexErrors) errors.push(`lexicon.txt:${e.line}  ${e.message}`);

// Phrase entries: each word must exist, with the named sense.
for (const entry of Object.values(lexicon)) {
  for (const w of entry.words ?? []) {
    const part = lexicon[w.word];
    if (!part) errors.push(`lexicon.txt  "${entry.term}" lists "${w.word}", which isn't in the lexicon`);
    else if (w.sense && !part.senses.some((s) => s.id === w.sense)) {
      errors.push(`lexicon.txt  "${entry.term}" uses "${w.word}:${w.sense}", but "${w.word}" has no sense "${w.sense}"`);
    }
  }
}

const used = new Set<string>();

for (const text of texts) {
  const file = text.source;

  // Re-parse the source for line-level errors (the app only warns).
  const src = readFileSync(new URL(`../src/content/${text.source}`, import.meta.url), 'utf8');
  for (const e of parseStory(src, file).errors) errors.push(`${file}:${e.line}  ${e.message}`);

  const phrases = new Map<string, number>();
  const senseUses = new Map<string, number>();
  const unknown = new Set<string>();

  for (const s of spanishStrings(text)) {
    if (/\[[^\]]*$|^[^[]*\]/.test(s)) errors.push(`${file}  Unbalanced bracket in "${s}"`);
    for (const seg of parseMarkup(s)) {
      if (seg.kind !== 'term') continue;
      used.add(seg.key);
      const entry = lexicon[seg.key];
      if (!entry) {
        unknown.add(seg.key);
        continue;
      }
      for (const w of entry.words ?? []) used.add(w.word);
      if (seg.phrase) phrases.set(seg.key, (phrases.get(seg.key) ?? 0) + 1);
      if (seg.sense) {
        if (!entry.senses.some((x) => x.id === seg.sense)) {
          errors.push(`${file}  [${seg.text}:${seg.sense}]: "${seg.key}" has no sense "${seg.sense}"`);
        }
        const k = `${seg.key}:${seg.sense}`;
        senseUses.set(k, (senseUses.get(k) ?? 0) + 1);
      }
    }
  }
  for (const k of unknown) errors.push(`${file}  "${k}" isn't in lexicon.txt`);

  // Retelling must line up with the story.
  if (text.story.length !== text.retelling.paragraphs.length) {
    errors.push(`${file}  Story has ${text.story.length} paragraphs, retelling has ${text.retelling.paragraphs.length}`);
  } else {
    text.story.forEach((p, i) => {
      const a = sentences(p.es).length;
      const b = sentences(text.retelling.paragraphs[i].es).length;
      if (a !== b) errors.push(`${file}  Paragraph ${i + 1}: story has ${a} sentences, retelling has ${b}`);
    });
  }

  // Targets must point at something in the text.
  const plainWords = new Set(
    spanishStrings(text).flatMap((s) =>
      tokenize(plainText(s))
        .filter((t) => t.kind === 'word')
        .map((t) => t.key),
    ),
  );
  for (const t of text.targets) {
    if (!t.pre.options.some((o) => o.id === t.pre.correctOptionId)) {
      errors.push(`${file}  target "${t.id}": correctOptionId "${t.pre.correctOptionId}" isn't an option`);
    }
    if (!t.post.accept.length) errors.push(`${file}  target "${t.id}" has no accepted answers`);
    if (t.evidenceHint && !findEvidence(text, t.match, t.evidenceHint)) {
      errors.push(`${file}  target "${t.id}": no story sentence has both ${JSON.stringify(t.match)} and "${t.evidenceHint}"`);
    }
    const missing = t.match.filter((m) => !plainWords.has(m.toLocaleLowerCase('es')));
    if (missing.length === t.match.length) {
      errors.push(`${file}  target "${t.id}": none of ${JSON.stringify(t.match)} appear in the text`);
    } else if (missing.length) {
      warnings.push(`${file}  target "${t.id}": ${JSON.stringify(missing)} don't appear in the text`);
    }
  }

  // Summary for the author
  console.log(`\n${text.title}  (${text.id})`);
  console.log(`  ${phrases.size} phrases: ${[...phrases].map(([k, n]) => `[${k}]×${n}`).join(', ') || 'none'}`);
  console.log(`  senses used: ${[...senseUses].map(([k, n]) => `${k}×${n}`).join(', ') || 'none'}`);
  console.log(`  ${text.targets.length} targets: ${text.targets.map((t) => t.id).join(', ')}`);
}

for (const term of Object.keys(lexicon)) {
  if (!used.has(term)) warnings.push(`lexicon.txt  "${term}" isn't used by any reading`);
}

console.log('');
for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`error    ${e}`);
console.log(`\n${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);

