import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { LearnerState, LessonProgress, LessonStage, ReviewItem, WordStatus } from '../types';

const STORAGE_KEY = 'lemonade:learner:v1';
const DAY = 24 * 60 * 60 * 1000;

/** Words the demo learner already knows, so the reader looks like a real A1–A2 profile. */
const DEMO_KNOWN = [
  'a', 'al', 'casa', 'con', 'de', 'del', 'dos', 'el', 'en', 'es', 'este', 'está', 'hay',
  'la', 'las', 'los', 'para', 'pero', 'porque', 'qué', 'siempre', 'son', 'su', 'tres',
  'un', 'una', 'unas', 'y',
];

function createDemoState(): LearnerState {
  const now = Date.now();
  return {
    version: 1,
    profile: { name: 'Demo learner' },
    words: Object.fromEntries(
      DEMO_KNOWN.map((w) => [w, { status: 'known' as const, lookups: 0, updatedAt: now }]),
    ),
    lessons: {},
    reviewQueue: [],
  };
}

function load(): LearnerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LearnerState;
      if (parsed.version === 1) return parsed;
    }
  } catch {
    // Storage blocked or corrupt: fall through to a fresh demo profile.
  }
  return createDemoState();
}

function save(state: LearnerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore: the app still works for this session without persistence.
  }
}

type Action =
  | { type: 'lookupWord'; key: string }
  | { type: 'setWordStatus'; key: string; status: WordStatus }
  | { type: 'markKnown'; keys: string[] }
  | { type: 'startLesson'; textId: string }
  | { type: 'setStage'; textId: string; stage: LessonStage }
  | { type: 'setPreAnswer'; textId: string; questionId: string; optionId: string }
  | { type: 'setPostAnswer'; textId: string; questionId: string; answer: string }
  | { type: 'setCorrection'; textId: string; questionId: string; text: string }
  | { type: 'completeLesson'; textId: string; missedQuestionIds: string[] }
  | { type: 'restartLesson'; textId: string }
  | { type: 'resetAll' };

function emptyLesson(): LessonProgress {
  return { stage: 'pre', preAnswers: {}, postAnswers: {}, corrections: {}, startedAt: Date.now() };
}

function updateLesson(
  state: LearnerState,
  textId: string,
  fn: (l: LessonProgress) => LessonProgress,
): LearnerState {
  const current = state.lessons[textId] ?? emptyLesson();
  return { ...state, lessons: { ...state.lessons, [textId]: fn(current) } };
}

function reducer(state: LearnerState, action: Action): LearnerState {
  const now = Date.now();
  switch (action.type) {
    case 'lookupWord': {
      const prev = state.words[action.key];
      // Looking up a new word starts learning it (LingQ-style).
      const status: WordStatus = !prev || prev.status === 'new' ? 'learning' : prev.status;
      return {
        ...state,
        words: {
          ...state.words,
          [action.key]: { status, lookups: (prev?.lookups ?? 0) + 1, updatedAt: now },
        },
      };
    }
    case 'setWordStatus': {
      const prev = state.words[action.key];
      return {
        ...state,
        words: {
          ...state.words,
          [action.key]: { status: action.status, lookups: prev?.lookups ?? 0, updatedAt: now },
        },
      };
    }
    case 'markKnown': {
      const words = { ...state.words };
      for (const key of action.keys) {
        words[key] = { status: 'known', lookups: words[key]?.lookups ?? 0, updatedAt: now };
      }
      return { ...state, words };
    }
    case 'startLesson':
      return state.lessons[action.textId] ? state : updateLesson(state, action.textId, (l) => l);
    case 'setStage':
      return updateLesson(state, action.textId, (l) => ({ ...l, stage: action.stage }));
    case 'setPreAnswer':
      return updateLesson(state, action.textId, (l) => ({
        ...l,
        preAnswers: { ...l.preAnswers, [action.questionId]: action.optionId },
      }));
    case 'setPostAnswer':
      return updateLesson(state, action.textId, (l) => ({
        ...l,
        postAnswers: { ...l.postAnswers, [action.questionId]: action.answer },
      }));
    case 'setCorrection':
      return updateLesson(state, action.textId, (l) => ({
        ...l,
        corrections: { ...l.corrections, [action.questionId]: action.text },
      }));
    case 'completeLesson': {
      const fresh: ReviewItem[] = action.missedQuestionIds.map((questionId) => ({
        id: `${action.textId}:${questionId}`,
        textId: action.textId,
        questionId,
        createdAt: now,
        dueAt: now + 2 * DAY,
      }));
      const kept = state.reviewQueue.filter((r) => !fresh.some((f) => f.id === r.id));
      const next = updateLesson(state, action.textId, (l) => ({
        ...l,
        stage: 'done',
        completedAt: now,
      }));
      return { ...next, reviewQueue: [...kept, ...fresh] };
    }
    case 'restartLesson':
      return { ...state, lessons: { ...state.lessons, [action.textId]: emptyLesson() } };
    case 'resetAll':
      return createDemoState();
  }
}

interface Store {
  state: LearnerState;
  dispatch: React.Dispatch<Action>;
}

const LearnerContext = createContext<Store | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => save(state), [state]);
  return <LearnerContext.Provider value={{ state, dispatch }}>{children}</LearnerContext.Provider>;
}

export function useLearner(): Store {
  const store = useContext(LearnerContext);
  if (!store) throw new Error('useLearner must be used inside LearnerProvider');
  return store;
}

