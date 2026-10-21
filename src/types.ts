// ---------- Content ----------

export interface GlossEntry {
  /** English meaning in this context */
  gloss: string;
  /** Dictionary form, when it differs from the surface form */
  lemma?: string;
  /** Short grammar note, e.g. "3rd person singular, present" */
  note?: string;
  /** Proper nouns are not highlighted or tracked */
  name?: boolean;
}

export interface Paragraph {
  es: string;
  en: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface ComprehensionQuestion {
  id: string;
  prompt: string;
  promptEn: string;
  /** Multiple-choice options shown before reading */
  options: QuestionOption[];
  correctOptionId: string;
  /** Model answer shown in the comparison */
  answer: string;
  /**
   * Typed answers are graded by keywords. The answer is correct when it
   * contains every word of at least one set. Write keywords with accents.
   */
  keywordSets: string[][];
  /** Index of the paragraph that contains the answer */
  evidenceParagraph: number;
}

export interface Text {
  id: string;
  title: string;
  titleEn: string;
  level: string;
  summaryEn: string;
  paragraphs: Paragraph[];
  glossary: Record<string, GlossEntry>;
  questions: ComprehensionQuestion[];
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
  /** questionId -> optionId */
  preAnswers: Record<string, string>;
  /** questionId -> typed answer */
  postAnswers: Record<string, string>;
  /** questionId -> learner's typed correction */
  corrections: Record<string, string>;
  startedAt: number;
  completedAt?: number;
}

/** A missed question to bring back later (spaced review, future milestone) */
export interface ReviewItem {
  id: string;
  textId: string;
  questionId: string;
  createdAt: number;
  dueAt: number;
}

export interface LearnerState {
  version: 1;
  profile: { name: string };
  /** keyed by lowercase surface form */
  words: Record<string, WordRecord>;
  lessons: Record<string, LessonProgress>;
  reviewQueue: ReviewItem[];
}
