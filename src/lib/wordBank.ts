import { lexicon } from '../content';
import { texts } from '../data/texts';
import { FORM_PERSONS, TENSES, type LearnerState, type PartOfSpeech, type Sense, type Target, type Text, type VerbForm, type WordStatus } from '../types';
import { gradeTarget } from './gradeTarget';
import { parseMarkup, plainText, type Segment } from './markup';
import { tokenize } from './tokenize';
import { normalize } from './grade';
import { isSaved, wordStatus } from './textWords';

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

/** One form of a dictionary word, in one meaning, with its status in that meaning. */
export interface BankForm {
  key: string;
  en: string;
  form?: VerbForm;
  /** "new" for forms met in a reading but not saved yet */
  status: WordStatus;
  missed: boolean;
}

/** One meaning of a dictionary word, with the forms it was seen in. */
export interface BankMeaning {
  /** Sense id, shared by the forms ("puesto:job", "puestos:job") */
  id: string;
  gloss: string;
  pos?: PartOfSpeech;
  note?: string;
  forms: BankForm[];
  /** Known when every form is known in this meaning; "new" when none is saved yet */
  status: WordStatus;
  known: number;
}

/** A sentence for the detail panel, with the form it shows. */
export interface FormContext extends Context {
  formKey: string;
  form?: VerbForm;
}

/** The headword's sense matching a form's sense ("puestos:job" → "puesto:job"). */
function groupSense(groupKey: string, formKey: string, senseId: string): Sense | undefined {
  return (
    lexicon[groupKey]?.senses.find((s) => s.id === senseId) ??
    lexicon[formKey]?.senses.find((s) => s.id === senseId)
  );
}

/**
 * Sentences for one meaning, chosen for variety. Verbs: one per tense, then
 * one per person. Nouns and adjectives: one per form (singular, plural), so
 * the words around them can be compared.
 */
export function meaningContexts(meaning: BankMeaning, limit = 4): FormContext[] {
  const pool: FormContext[] = [];
  for (const f of meaning.forms) {
    for (const c of contextsFor(f.key, 99)) {
      if (c.sense !== meaning.id || pool.some((p) => p.sentence === c.sentence)) continue;
      pool.push({ ...c, formKey: f.key, form: f.form });
    }
  }
  const verb = meaning.forms.some((f) => f.form);
  const passes: ((c: FormContext) => string)[] = verb
    ? [(c) => c.form?.tense ?? c.formKey, (c) => `${c.form?.tense ?? c.formKey}|${c.form?.person ?? ''}`]
    : [(c) => c.formKey];
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

// ---------- The bank ----------

/** Saved terms, one per form, for the "recently added" row. */
export function wordBank(state: LearnerState): BankEntry[] {
  const missed = missedTerms(state);
  const keys = new Set<string>([
    ...Object.keys(state.words).filter((k) => isSaved(state, k)),
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
    const statuses = [record?.status, ...Object.values(record?.senseStatus ?? {})].filter((s) => s && s !== 'new');
    entries.push({
      key,
      es: userPhrase?.text ?? key,
      en: userPhrase?.gloss || senses[0]?.gloss || '—',
      senses,
      pos: userPhrase ? ['phrase'] : [...new Set(senses.map((s) => s.pos).filter((p): p is PartOfSpeech => !!p))],
      status: statuses.length && statuses.every((s) => s === 'known') ? 'known' : 'learning',
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

export type GroupStatus = 'learning' | 'known' | 'mixed';

/** A word bank row: a dictionary form, its meanings, and the forms of it the learner has seen. */
export interface BankGroup {
  key: string;
  es: string;
  /** Every meaning, "stall; stand | job; position" */
  en: string;
  pos: PartOfSpeech[];
  meanings: BankMeaning[];
  /** Every form, in any meaning */
  forms: string[];
  /** Verb groups list each form with its own status; nouns and adjectives don't */
  verb: boolean;
  /**
   * Known only when every saved meaning is known, mixed when some are, so
   * the bank never overstates what the learner knows.
   */
  status: GroupStatus;
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
      const form: BankForm = { key: e.key, en: e.en, status: e.status, missed: e.missed };
      groups.push({
        ...e,
        verb: false,
        forms: [e.key],
        meanings: [{ id: 'default', gloss: e.en, forms: [form], status: e.status, known: e.status === 'known' ? 1 : 0 }],
      });
      continue;
    }

    // Each (form, meaning) pair: seen in a reading or saved by the learner.
    const pairs = new Map<string, Set<string>>();
    const add = (sense: string, form: string) => pairs.set(sense, (pairs.get(sense) ?? new Set()).add(form));
    for (const k of members.get(key) ?? [key]) {
      const saved = entries.some((e) => e.key === k);
      if (!saved && !standalone.has(k)) continue;
      for (const c of contextsFor(k, 99)) add(c.sense, k);
      const record = state.words[k];
      if (record?.status && record.status !== 'new') add('default', k);
      for (const [sense, st] of Object.entries(record?.senseStatus ?? {})) if (st !== 'new') add(sense, k);
    }

    const meanings: BankMeaning[] = [...pairs]
      .map(([id, formKeys]) => {
        const first = [...formKeys][0];
        const sense = groupSense(key, first, id);
        const forms: BankForm[] = [...formKeys]
          .map((k) => {
            const s = lexicon[k]?.senses.find((x) => x.id === id);
            return {
              key: k,
              en: s?.gloss ?? '—',
              form: s?.form,
              status: wordStatus(state, k, id),
              missed: entries.some((e) => e.key === k && e.missed),
            };
          })
          .sort((a, b) => formOrder(a.form) - formOrder(b.form) || a.key.localeCompare(b.key, 'es'));
        const known = forms.filter((f) => f.status === 'known').length;
        // A verb form not saved yet counts against the meaning (you don't know
        // the tense until you know its forms). A noun's singular and plural share
        // one status, so only the saved ones count.
        const counted = forms.some((f) => f.form) ? forms : forms.filter((f) => f.status !== 'new');
        const status: WordStatus = !counted.length
          ? 'new'
          : counted.every((f) => f.status === 'known')
            ? 'known'
            : 'learning';
        return { id, gloss: sense?.gloss ?? '—', pos: sense?.pos, note: sense?.note, forms, status, known };
      })
      .sort((a, b) => Number(a.id !== 'default') - Number(b.id !== 'default'));

    const savedMeanings = meanings.filter((m) => m.status !== 'new');
    const knownMeanings = savedMeanings.filter((m) => m.status === 'known').length;
    const status: GroupStatus =
      knownMeanings === savedMeanings.length ? 'known' : knownMeanings > 0 ? 'mixed' : 'learning';
    const forms = [...new Set(meanings.flatMap((m) => m.forms.map((f) => f.key)))];
    const levels = [...new Set(forms.flatMap((k) => contextsFor(k, 99).map((c) => c.level)))].sort();

    groups.push({
      key,
      es: key,
      en: meanings.map((m) => m.gloss).join(' | ') || (head?.senses[0]?.gloss ?? entries[0].en),
      pos: head
        ? [...new Set(head.senses.map((s) => s.pos).filter((p): p is PartOfSpeech => !!p))]
        : [...new Set(entries.flatMap((e) => e.pos))],
      meanings,
      forms,
      verb: meanings.some((m) => m.forms.some((f) => f.form)),
      status,
      addedAt: Math.max(...entries.map((e) => e.addedAt)),
      levels,
      bands: [...new Set(levels.map(levelBand))],
      missed: entries.some((e) => e.missed),
      userPhrase: false,
    });
  }
  return groups;
}
