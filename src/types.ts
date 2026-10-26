// ---------- Content ----------

export interface GlossEntry {
  /** English meaning in this context */
  gloss: string;
  /** Dictionary form, when it differs from the surface form */
  lemma?: string;
  /** Short grammar note, e.g. "yo, present" */
  note?: string;
  /** Proper nouns are not highlighted or tracked */
  name?: boolean;
}

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
  };
  /** After reading: typed from memory */
  post: {
    prompt: string;
    promptEn?: string;
    /** Accepted answers, written with accents */
    accept: string[];
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
}

export type Target = MeaningTarget | FormTarget;

export interface Text {
  id: string;
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
  glossary: Record<string, GlossEntry>;
  targets: Target[];
}

// ---------- Learner state ----------

export type WordStatus = 'new' | 'learning' | 'known';

export interface WordRecord {
  status: WordStatus;
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
  /** keyed by lowercase surface form */
  words: Record<string, WordRecord>;
  lessons: Record<string, LessonProgress>;
  reviewQueue: ReviewItem[];
}
