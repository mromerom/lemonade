import { lexicon } from '../content';
import { texts } from '../data/texts';
import { FORM_PERSONS, TENSES, type LearnerState, type PartOfSpeech, type Sense, type Target, type Text, type VerbForm, type WordStatus } from '../types';
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
  /** Which sense of the term the sentence uses ("default" unless marked) */
  sense: string;
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
  sense: string;
}

/** Split marked-up text into sentences without breaking inside [brackets]. */
function markedSentences(es: string): string[] {
  return es.split(/(?<=[.!?])\s+(?![^[]*\])/).filter(Boolean);
}

const occurrences = new Map<string, Occurrence[]>();
/** Terms that appear as their own segment, not only inside a bracketed phrase. */
const standalone = new Set<string>();
for (const text of texts) {
  for (const para of [...text.story, ...text.retelling.paragraphs]) {
    for (const sentence of markedSentences(para.es)) {
      for (const seg of parseMarkup(sentence)) {
        if (seg.kind !== 'term') continue;
        standalone.add(seg.key);
        // A phrase counts for itself and for each word in it ("armé" in "me armé de valor").
        const inner = seg.phrase ? tokenize(seg.text).filter((t) => t.kind === 'word').map((t) => t.key) : [];
        const phraseWords = lexicon[seg.key]?.words ?? [];
        const uses: [string, string][] = [
          [seg.key, seg.sense ?? 'default'],
          // a word inside a phrase has the sense the phrase lists for it
          ...inner.map((k): [string, string] => [k, phraseWords.find((w) => w.word === k)?.sense ?? 'default']),
        ];
        for (const [key, sense] of uses) {
          const list = occurrences.get(key) ?? [];
          if (!list.some((o) => o.sentence === sentence)) list.push({ text, sentence, sense });
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
        .map((sentence) => ({ text, sentence, sense: 'default' })),
    );
  }
  return found.slice(0, limit).map((o) => ({
    textId: o.text.id,
    textTitle: o.text.title,
    level: o.text.level,
    sentence: o.sentence,
    sense: o.sense,
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

// ---------- Grouping by dictionary form ----------

/**
 * The dictionary form a term is filed under: "voy" → "ir", "le gusta" →
 * "gustar". Only when the lexicon has an entry for it, so a plural like
 * "flores" (lemma "flor", no entry) stays on its own.
 */
export function groupKeyOf(term: string): string {
  const lemma = lexicon[term]?.senses[0]?.lemma;
  return lemma && lexicon[lemma] ? lemma : term;
}

/** Every lexicon term filed under each dictionary form. */
const members = new Map<string, string[]>();
for (const term of Object.keys(lexicon)) {
  if (lexicon[term].name) continue;
  const key = groupKeyOf(term);
  members.set(key, [...(members.get(key) ?? []), term]);
}

const TENSE_LABEL: Partial<Record<VerbForm['tense'], string>> = {
  preterite: 'preterite (indefinido)',
  imperfect: 'imperfect (imperfecto)',
  'present perfect': 'present perfect (pretérito perfecto)',
  'present subjunctive': 'present subjunctive (subjuntivo)',
};

/** "yo · preterite (indefinido)" */
export function formLabel(form: VerbForm): string {
  return [form.person, TENSE_LABEL[form.tense] ?? form.tense].filter(Boolean).join(' · ');
}

function formOrder(f?: VerbForm): number {
  if (!f) return 999;
  return TENSES.indexOf(f.tense) * 10 + (f.person ? FORM_PERSONS.indexOf(f.person) + 1 : 0);
}

/** One form of a dictionary word, with its own status. */
export interface BankForm {
  key: string;
  en: string;
  form?: VerbForm;
  /** "new" for forms met in a reading but not saved yet */
  status: WordStatus;
  missed: boolean;
  addedAt: number;
}

/** A sentence for the detail panel, with the form and meaning it shows. */
export interface FormContext extends Context {
  formKey: string;
  form?: VerbForm;
  /** The meaning used in this sentence, when the word has more than one */
  gloss: string;
}

/** The headword's sense matching a form's sense ("puestos:job" → "puesto:job"). */
function groupSense(groupKey: string, formKey: string, senseId: string): Sense | undefined {
  return (
    lexicon[groupKey]?.senses.find((s) => s.id === senseId) ??
    lexicon[formKey]?.senses.find((s) => s.id === senseId)
  );
}

/**
 * Sentences for a group, chosen for variety. Verbs: one per tense, then one
 * per person. Nouns and adjectives: one per form (singular, plural) so the
 * words around them can be compared. Then one per meaning not shown yet.
 */
export function groupContexts(groupKey: string, forms: BankForm[], limit = 4): FormContext[] {
  const pool: FormContext[] = [];
  for (const f of forms) {
    for (const c of contextsFor(f.key, 99)) {
      if (pool.some((p) => p.sentence === c.sentence)) continue;
      const sense = groupSense(groupKey, f.key, c.sense);
      pool.push({ ...c, formKey: f.key, form: f.form, gloss: sense?.gloss ?? f.en });
    }
  }
  // Main meaning first, so singular and plural are compared with the same meaning.
  pool.sort((a, b) => Number(a.sense !== 'default') - Number(b.sense !== 'default'));
  const verb = forms.some((f) => f.form);
  const passes: ((c: FormContext) => string)[] = verb
    ? [
        (c) => c.form?.tense ?? c.formKey,
        (c) => `${c.form?.tense ?? c.formKey}|${c.form?.person ?? ''}`,
        (c) => c.gloss,
      ]
    : [(c) => c.formKey, (c) => c.gloss];
  const picked: FormContext[] = [];
  for (const keyOf of passes) {
    const seen = new Set(picked.map(keyOf));
    for (const c of pool) {
      if (picked.length >= limit) return picked;
      if (picked.includes(c) || seen.has(keyOf(c))) continue;
      picked.push(c);
      seen.add(keyOf(c));
    }
  }
  return picked;
}

/** "puestos" → "plural", for the subtitle of a noun or adjective group. */
export function inflectionLabel(head: string, form: string): string {
  if (form === `${head}s` || form === `${head}es` || (head.endsWith('z') && form === `${head.slice(0, -1)}ces`)) {
    return 'plural';
  }
  return 'also';
}

/** Senses of a group that appear in the readings, main sense first. */
function seenSenses(groupKey: string, forms: BankForm[]): Sense[] {
  const out: Sense[] = [];
  for (const f of forms) {
    for (const c of contextsFor(f.key, 99)) {
      const sense = groupSense(groupKey, f.key, c.sense);
      if (sense && !out.some((s) => s.gloss === sense.gloss)) out.push(sense);
    }
  }
  return out.sort((a, b) => Number(a.id !== 'default') - Number(b.id !== 'default'));
}

// ---------- The bank ----------
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
    const userPhrase = state.userPhrases?.[key];
    // Skip names, and words an author has since removed from the lexicon.
    if (entry?.name || (!entry && !userPhrase)) continue;
    const record = state.words[key];
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

/** A word bank row: a dictionary form and the forms of it the learner has met. */
export interface BankGroup {
  key: string;
  es: string;
  en: string;
  pos: PartOfSpeech[];
  /** Meanings: all of them for a word, or the ones seen in readings for a group */
  senses: Sense[];
  /** Verb groups list each form with its own status; nouns and adjectives don't */
  verb: boolean;
  /** Known only when every form is known, so the bank never overstates what the learner knows */
  status: Exclude<WordStatus, 'new'>;
  forms: BankForm[];
  known: number;
  addedAt: number;
  levels: string[];
  bands: LevelBand[];
  missed: boolean;
  userPhrase: boolean;
}

/** The word bank grouped by dictionary form. */
export function bankGroups(state: LearnerState): BankGroup[] {
  const saved = wordBank(state);
  const byGroup = new Map<string, BankEntry[]>();
  for (const e of saved) {
    const key = e.userPhrase ? e.key : groupKeyOf(e.key);
    byGroup.set(key, [...(byGroup.get(key) ?? []), e]);
  }

  const groups: BankGroup[] = [];
  for (const [key, entries] of byGroup) {
    const head = lexicon[key];
    if (entries[0].userPhrase) {
      const e = entries[0];
      groups.push({
        ...e,
        verb: false,
        forms: [{ key: e.key, en: e.en, status: e.status, missed: e.missed, addedAt: e.addedAt }],
        known: e.status === 'known' ? 1 : 0,
      });
      continue;
    }
    // Forms: the saved ones, plus forms met in a reading but not saved yet.
    const keys = (members.get(key) ?? [key]).filter(
      (k) => entries.some((e) => e.key === k) || standalone.has(k),
    );
    const forms: BankForm[] = keys
      .map((k) => {
        const e = entries.find((x) => x.key === k);
        const sense = lexicon[k]?.senses[0];
        return {
          key: k,
          en: sense?.gloss ?? '—',
          form: sense?.form,
          status: e?.status ?? state.words[k]?.status ?? 'new',
          missed: e?.missed ?? false,
          addedAt: e?.addedAt ?? 0,
        };
      })
      .sort((a, b) => formOrder(a.form) - formOrder(b.form) || a.key.localeCompare(b.key, 'es'));
    const levels = [...new Set(entries.flatMap((e) => e.levels).concat(keys.flatMap((k) => contextsFor(k, 99).map((c) => c.level))))].sort();
    const known = forms.filter((f) => f.status === 'known').length;
    const verb = forms.some((f) => f.form);
    // A group shows the meanings met in readings ("puesto": stall, and job from "puestos").
    const seen = forms.length > 1 || forms[0]?.key !== key ? seenSenses(key, forms) : [];
    const senses = seen.length ? seen : (head?.senses ?? entries[0].senses);
    groups.push({
      key,
      es: key,
      en: senses[0]?.gloss ?? entries[0].en,
      pos: head
        ? [...new Set(head.senses.map((s) => s.pos).filter((p): p is PartOfSpeech => !!p))]
        : [...new Set(entries.flatMap((e) => e.pos))],
      senses,
      verb,
      status: known === forms.length ? 'known' : 'learning',
      forms,
      known,
      addedAt: Math.max(...entries.map((e) => e.addedAt)),
      levels,
      bands: [...new Set(levels.map(levelBand))],
      missed: entries.some((e) => e.missed),
      userPhrase: false,
    });
  }
  return groups;
}
