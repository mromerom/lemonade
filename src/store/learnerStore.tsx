import { lexicon } from '../content';
import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { LearnerState, LessonProgress, LessonStage, ReviewItem, WordStatus } from '../types';

const STORAGE_KEY = 'lemonade:learner:v2';
const DAY = 24 * 60 * 60 * 1000;

/**
 * The demo learner's word bank, so a reading looks like it would for a real
 * A2–B1 learner: mostly known words, some being learned, and the new ones
 * stand out. Words the readings teach (their targets) are left out on purpose.
 */
const DEMO_KNOWN = [
  // grammar words
  'a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'le', 'lo', 'me', 'mi', 'mis', 'se',
  'su', 'sus', 'un', 'una', 'unas', 'y', 'que', 'qué', 'no', 'sí', 'si', 'por', 'para', 'pero',
  'porque', 'como', 'cómo', 'muy', 'más', 'también', 'todos', 'todas', 'mucho', 'muchos', 'yo', 'tú',
  'algo', 'nunca', 'ahora', 'hoy', 'primero', 'segundo',
  // common verbs
  'es', 'son', 'está', 'hay', 'tiene', 'tengo', 'vive', 'vivo', 'quiere', 'quiero', 'va', 'van',
  'trabaja', 'trabajando', 'comprar', 'vender', 'ayudar',
  // everyday nouns and adjectives
  'casa', 'años', 'mes', 'meses', 'semanas', 'domingo', 'sábados', 'dos', 'tres', 'treinta', 'treinta y dos', 'sol',
  'pan', 'café', 'madre', 'amiga', 'abuelo', 'ciudad', 'idea', 'internet', 'software', 'proyecto',
  'productos', 'servicios', 'plataforma', 'frutas', 'flores', 'naranja', 'naranjas', 'limón', 'río',
  'grande', 'pequeña', 'kilo', 'kilos', 'euros', 'trabajo',
];

/** Words the demo learner has looked up before but is still learning (yellow). */
const DEMO_LEARNING = [
  'mercado', 'plaza', 'verduras', 'vecina', 'roja', 'amarillas', 'contenta', 'ofertas', 'empleo',
  'sueldo', 'compañeros', 'ingeniero', 'empresa', 'negocio', 'durante', 'mientras', 'mañana',
  'tardes', 'cientos', 'iguales', 'reuniones', 'pantallas', 'ofertas de empleo', 'sin embargo',
];

function createDemoState(): LearnerState {
  const now = Date.now();
  return {
    version: 2,
    profile: { name: 'Demo learner' },
    words: Object.fromEntries([
      // Stagger the added times a minute apart so "order added" has an order.
      ...DEMO_KNOWN.map((w, i) => [
        w,
        { status: 'known' as const, lookups: 0, updatedAt: now, addedAt: now - (DEMO_KNOWN.length + DEMO_LEARNING.length - i) * 60_000 },
      ]),
      ...DEMO_LEARNING.map((w, i) => [
        w,
        { status: 'learning' as const, lookups: 1, updatedAt: now, addedAt: now - (DEMO_LEARNING.length - i) * 60_000 },
      ]),
    ]),
    lessons: {},
    reviewQueue: [],
  };
}

/**
 * Drop saved words that no longer exist in the lexicon (an author renamed or
 * removed them, e.g. "le dice nada"). The learner's own phrases are kept.
 */
function pruneRemovedTerms(state: LearnerState): LearnerState {
  const words = Object.fromEntries(
    Object.entries(state.words).filter(([key]) => lexicon[key] || state.userPhrases?.[key]),
  );
  return Object.keys(words).length === Object.keys(state.words).length ? state : { ...state, words };
}

function load(): LearnerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LearnerState;
      if (parsed.version === 2) return pruneRemovedTerms(parsed);
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
  | { type: 'lookupWord'; key: string; sense?: string }
  | { type: 'setWordStatus'; key: string; status: WordStatus }
  | { type: 'markKnown'; keys: string[] }
  | { type: 'startLesson'; textId: string }
  | { type: 'setStage'; textId: string; stage: LessonStage }
  | { type: 'setPreAnswer'; textId: string; targetId: string; optionId: string }
  | { type: 'setPostAnswer'; textId: string; targetId: string; answer: string }
  | { type: 'setCorrection'; textId: string; targetId: string; text: string }
  | {
      type: 'completeLesson';
      textId: string;
      missedTargetIds: string[];
      /** Lexicon terms for the missed targets: they join the word bank as "learning" */
      missedTerms?: string[];
    }
  | { type: 'restartLesson'; textId: string }
  | { type: 'savePhrase'; key: string; text: string; gloss: string; words: string[] }
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
      // Looking up a new term starts learning it (LingQ-style).
      const status: WordStatus = !prev || prev.status === 'new' ? 'learning' : prev.status;
      const sense = action.sense ?? 'default';
      const senses = prev?.senses?.includes(sense) ? prev.senses : [...(prev?.senses ?? []), sense];
      return {
        ...state,
        words: {
          ...state.words,
          [action.key]: {
            status,
            senses,
            lookups: (prev?.lookups ?? 0) + 1,
            updatedAt: now,
            addedAt: prev?.addedAt ?? now,
          },
        },
      };
    }
    case 'setWordStatus': {
      const prev = state.words[action.key];
      return {
        ...state,
        words: {
          ...state.words,
          [action.key]: {
            ...prev,
            status: action.status,
            lookups: prev?.lookups ?? 0,
            updatedAt: now,
            addedAt: prev?.addedAt ?? now,
          },
        },
      };
    }
    case 'markKnown': {
      const words = { ...state.words };
      for (const key of action.keys) {
        words[key] = {
          ...words[key],
          status: 'known',
          lookups: words[key]?.lookups ?? 0,
          updatedAt: now,
          addedAt: words[key]?.addedAt ?? now,
        };
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
        preAnswers: { ...l.preAnswers, [action.targetId]: action.optionId },
      }));
    case 'setPostAnswer':
      return updateLesson(state, action.textId, (l) => ({
        ...l,
        postAnswers: { ...l.postAnswers, [action.targetId]: action.answer },
      }));
    case 'setCorrection':
      return updateLesson(state, action.textId, (l) => ({
        ...l,
        corrections: { ...l.corrections, [action.targetId]: action.text },
      }));
    case 'completeLesson': {
      const fresh: ReviewItem[] = action.missedTargetIds.map((targetId) => ({
        id: `${action.textId}:${targetId}`,
        textId: action.textId,
        targetId,
        createdAt: now,
        dueAt: now + 2 * DAY,
      }));
      const kept = state.reviewQueue.filter((r) => !fresh.some((f) => f.id === r.id));
      const next = updateLesson(state, action.textId, (l) => ({
        ...l,
        stage: 'done',
        completedAt: now,
      }));
      // Missed words go into the word bank as "learning" (a known word drops back to learning).
      const words = { ...next.words };
      for (const key of action.missedTerms ?? []) {
        const prev = words[key];
        words[key] = {
          ...prev,
          status: 'learning',
          lookups: prev?.lookups ?? 0,
          updatedAt: now,
          addedAt: prev?.addedAt ?? now,
        };
      }
      return { ...next, words, reviewQueue: [...kept, ...fresh] };
    }
    case 'restartLesson':
      return { ...state, lessons: { ...state.lessons, [action.textId]: emptyLesson() } };
    case 'savePhrase': {
      const prev = state.words[action.key];
      return {
        ...state,
        userPhrases: {
          ...state.userPhrases,
          [action.key]: { text: action.text, gloss: action.gloss, words: action.words, createdAt: now },
        },
        words: {
          ...state.words,
          [action.key]: {
            ...prev,
            status: prev && prev.status !== 'new' ? prev.status : 'learning',
            lookups: (prev?.lookups ?? 0) + 1,
            updatedAt: now,
            addedAt: prev?.addedAt ?? now,
          },
        },
      };
    }
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

