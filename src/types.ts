// ---------- Content ----------

/** One meaning of a word or phrase. The first sense of an entry has id "default". */
export interface Sense {
  id: string;
  gloss: string;
  /** Dictionary form, when it differs from the surface form */
  lemma?: string;
  /** Short grammar or usage note */
  note?: string;
  /** Part of speech, e.g. "noun"; see PARTS_OF_SPEECH */
  pos?: PartOfSpeech;
  /** Verbs and verb phrases: which conjugation this is */
  form?: VerbForm;
}

/** Persons a lexicon form can be tagged with. */
export const FORM_PERSONS = ['yo', 'tú', 'él/ella', 'nosotros', 'vosotros', 'ellos/ellas'] as const;
export type FormPerson = (typeof FORM_PERSONS)[number];

/** Tenses and moods, plus the forms that have no person. */
export const TENSES = [
  'present', 'present subjunctive', 'imperfect', 'preterite', 'present perfect', 'future', 'conditional',
  'infinitive', 'gerund', 'participle',
] as const;
export type Tense = (typeof TENSES)[number];

/** A conjugated form: "yo, preterite" → { person: 'yo', tense: 'preterite' }. */
export interface VerbForm {
  person?: FormPerson;
  tense: Tense;
}

export const PARTS_OF_SPEECH = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'article', 'determiner',
  'preposition', 'conjunction', 'number', 'name', 'phrase',
] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

/** A word or phrase in the shared lexicon (src/content/lexicon.txt). */
export interface LexiconEntry {
  /** Lowercase surface form, e.g. "caras" or "le gusta" */
  term: string;
  senses: Sense[];
  /** Proper nouns are not highlighted or tracked */
  name?: boolean;
  /** Phrases: the sense each word has inside the phrase */
  words?: { word: string; sense?: string }[];
}

export type Lexicon = Record<string, LexiconEntry>;

/** Spanish and its English translation. */
export interface Translated {
  es: string;
  en: string;
}

/** Spanish text may contain markup: [le gusta] groups words, [mañana:morning] picks a sense. */
export interface Paragraph extends Translated {
  /** The reading question under this paragraph */
  question?: ReadingQuestion;
}

/**
 * A comprehension question under a paragraph, answered while reading and
 * checked on the results step. Beginner answers are a word or two and are
 * graded in the app; longer answers are checked by AI.
 */
export interface ReadingQuestion {
  /** "story-0", "retell-2": part and paragraph index */
  id: string;
  question: Translated;
  /** A model answer */
  answer: Translated;
  /** Other answers that count as correct (beginner levels) */
  accept: string[];
}

export interface QuestionOption {
  id: string;
  text: string;
  /**
   * On a trap: why it's wrong, shown after reading if the learner picked it.
   * On the correct option: why it's right, shown to every learner after reading.
   * Verb-form traps that match another person's form get a note automatically.
   */
  note?: string;
}

/** Subject labels for verb forms, in display order. */
export type Person = 'yo' | 'tú' | 'él/ella' | 'nosotros' | 'ellos/ellas';

interface TargetBase {
  id: string;
  /** Before reading: multiple choice, no feedback */
  pre: {
    prompt: string;
    /** Language of the options; defaults to English for meaning targets, Spanish for verb forms */
    optionsLang?: 'es' | 'en';
    /** English help for the prompt, shown on request */
    promptEn?: string;
    options: QuestionOption[];
    correctOptionId: string;
    /**
     * Other options that are also right, e.g. a regional variant. Give them a
     * note: it's shown after reading, even though the guess counts as correct.
     */
    alsoCorrect?: string[];
  };
  /** After reading: typed from memory */
  post: {
    prompt: string;
    promptEn?: string;
    /** Accepted answers, written with accents */
    accept: string[];
    /**
     * Wrong answers worth explaining when typed, mapped to the explanation,
     * e.g. a false friend: { excitante: 'Excitante is a false friend…' }
     */
    traps?: Record<string, string>;
    /**
     * Correct answers that deserve a note, e.g. regional or near-synonym
     * variants: { decidí: 'Common in Latin America…' }. Graded correct.
     */
    variants?: Record<string, string>;
  };
  /** Surface forms to find in the reading for evidence (lowercase) */
  match: string[];
  /** Optional phrase the evidence sentence must contain, when the forms appear more than once */
  evidenceHint?: string;
}

/** "What does X mean?" before, "How do you say Y?" after. */
export interface MeaningTarget extends TargetBase {
  kind: 'meaning';
  word: string;
  gloss: string;
}

/** Pick, then type, the right form of a verb for a subject. */
export interface FormTarget extends TargetBase {
  kind: 'form';
  verb: string;
  person: Person;
  tense: string;
  /** All forms of this verb in this tense, used to name a wrong-person answer */
  forms: Partial<Record<Person, string>>;
  /**
   * Same-person forms in the wrong tense or mood, mapped to a label, so a
   * typed "emociona" for "emocione" is named as "present indicative", not a typo.
   */
  wrongForms?: Record<string, string>;
}

export type Target = MeaningTarget | FormTarget;

export interface Text {
  id: string;
  /** Source file, relative to src/content */
  source: string;
  title: string;
  titleEn: string;
  level: string;
  summaryEn: string;
  /** Part 1: told about the character */
  story: Paragraph[];
  /** Part 2: the same story told by the character */
  retelling: {
    narrator: string;
    /** A before/after pair to point out, e.g. ['Lucía va', 'voy'] */
    example?: [string, string];
    paragraphs: Paragraph[];
  };
  targets: Target[];
}

// ---------- Learner state ----------

export type WordStatus = 'new' | 'learning' | 'known';

export interface WordRecord {
  /** Status of the main meaning (sense "default") */
  status: WordStatus;
  /** Status of each other meaning, by sense id ("puestos:job" can be learning while "puestos" is known) */
  senseStatus?: Record<string, WordStatus>;
  /** Senses of this term the learner has looked up, across all readings */
  senses?: string[];
  lookups: number;
  updatedAt: number;
  /** When the term entered the word bank (first looked up or marked); older saves fall back to updatedAt */
  addedAt?: number;
}

/** What a mistake in a written answer is about; the results step suggests focus areas from these. */
export const ISSUE_CATEGORIES = [
  'person', 'tense', 'gender', 'number', 'agreement', 'spelling', 'accent', 'word choice', 'word order',
  'missing word', 'meaning', 'other',
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export interface AnswerIssue {
  category: IssueCategory;
  /** The words as the learner wrote them */
  wrong: string;
  /** The same words fixed */
  right: string;
  /** One short tip, in English */
  tip: string;
}

/** The check of one reading-question answer. */
export interface ReadingCheck {
  /** The answer that was checked: a changed answer is checked again */
  answer: string;
  /** app: graded in the app (short answers); ai: checked by AI; self: the learner compared it themselves */
  source: 'app' | 'ai' | 'self';
  /** Does the answer say the right thing about the paragraph? */
  meaning: 'correct' | 'partly' | 'incorrect';
  issues: AnswerIssue[];
  /** The learner's answer with the smallest fixes, when it needed any */
  corrected?: string;
  /** One sentence about the meaning, in English */
  comment?: string;
  /** Another way to answer, different from the learner's and the model answer (AI checks) */
  alternative?: string;
  /** Version of the AI check that made this; older checks are made again */
  v?: number;
}

export type LessonStage = 'pre' | 'read' | 'post' | 'compare' | 'done';

export interface LessonProgress {
  stage: LessonStage;
  /** targetId -> optionId */
  preAnswers: Record<string, string>;
  /** targetId -> typed answer */
  postAnswers: Record<string, string>;
  /** targetId -> learner's typed correction */
  corrections: Record<string, string>;
  /** Reading question id -> typed answer; editable until the results step */
  readingAnswers?: Record<string, string>;
  /** Reading question id -> how the answer was checked */
  readingChecks?: Record<string, ReadingCheck>;
  startedAt: number;
  completedAt?: number;
}

/** A missed word or verb form to bring back later (spaced review, future milestone) */
export interface ReviewItem {
  id: string;
  textId: string;
  targetId: string;
  createdAt: number;
  dueAt: number;
}

/** A group of words the learner selected (shift-click) and saved with their own meaning. */
export interface UserPhrase {
  text: string;
  gloss: string;
  /** Lexicon terms of the words in the group, in order */
  words: string[];
  createdAt: number;
}

export interface LearnerState {
  version: 2;
  profile: { name: string };
  /** keyed by lexicon term: a lowercase word or phrase */
  words: Record<string, WordRecord>;
  lessons: Record<string, LessonProgress>;
  reviewQueue: ReviewItem[];
  /** Phrases the learner grouped themselves, keyed like words (lowercase text) */
  userPhrases?: Record<string, UserPhrase>;
}
