// ---------- Content ----------

/** One meaning of a word or phrase. The first sense of an entry has id "default". */
export interface Sense {
  id: string;
  gloss: string;
  /** Dictionary form, when it differs from the surface form */
  lemma?: string;
  /** Short grammar or usage note */
  note?: string;
}

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

/** Spanish text may contain markup: [le gusta] groups words, [mañana:morning] picks a sense. */
export interface Paragraph {
  es: string;
  en: string;
}

/** One exchange in the Q&A part: a statement, a question about it, and the answer. */
export interface QAItem {
  statement: Paragraph;
  question: Paragraph;
  answer: Paragraph;
}

export interface QuestionOption {
  id: string;
  text: string;
  /**
   * Why this distractor is wrong, shown after reading if the learner picked it.
   * Verb-form options that match another person's form get a note automatically.
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
  /** Part 3: statements, questions and answers */
  qa: QAItem[];
  targets: Target[];
}

// ---------- Learner state ----------

export type WordStatus = 'new' | 'learning' | 'known';

export interface WordRecord {
  status: WordStatus;
  /** Senses of this term the learner has looked up, across all readings */
  senses?: string[];
  lookups: number;
  updatedAt: number;
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

export interface LearnerState {
  version: 2;
  profile: { name: string };
  /** keyed by lexicon term: a lowercase word or phrase */
  words: Record<string, WordRecord>;
  lessons: Record<string, LessonProgress>;
  reviewQueue: ReviewItem[];
}
