import { addons, topics, type WritingAddon, type WritingTopic } from '../content/exercises';
import type { LearnerState, ReadingCheck, TranslationCheck, WritingSet } from '../types';
import { areaFor, focusCollector, type Focus, type FocusArea } from './focus';
import { normalize } from './grade';

/**
 * The writing exercise: the learner writes five sentences about their own
 * life in English, one per prompt, then translates them. Each translation is
 * checked by AI right away; wrong ones come back once at the end.
 */

export const MIXED = 'mixed';
export const SET_SIZE = 5;

export const mixedTopic: WritingTopic = {
  id: MIXED,
  title: 'Mixed',
  about: 'One prompt from each topic: present, past, future, hypotheticals, ser vs estar.',
  prompts: [],
};

export const topicById = (id: string): WritingTopic | undefined =>
  id === MIXED ? mixedTopic : topics.find((t) => t.id === id);
export const addonById = (id?: string): WritingAddon | undefined => addons.find((a) => a.id === id);

/** Right meaning, and no mistakes other than accents (which are still shown). */
export function isRightTranslation(check: TranslationCheck | undefined): boolean {
  return Boolean(check && check.meaning === 'correct' && check.issues.every((i) => i.category === 'accent'));
}

/** The set in progress, if any. */
export function currentSet(state: LearnerState): WritingSet | undefined {
  return state.writing?.sets.find((s) => s.stage !== 'done');
}

/**
 * Prompts for a new set, unseen ones first: for one topic, five of its
 * prompts; for Mixed, one from each topic. `missing` says how many more are
 * needed because the topic ran out (the AI can write those).
 */
export function pickPrompts(state: LearnerState, topicId: string): { prompts: string[]; missing: number } {
  const used = new Set(state.writing?.usedPrompts ?? []);
  const fresh = (list: string[]) => list.filter((p) => !used.has(p));
  if (topicId === MIXED) {
    return {
      prompts: topics.slice(0, SET_SIZE).map((t) => fresh(t.prompts)[0] ?? t.prompts[Math.floor(Math.random() * t.prompts.length)]),
      missing: 0,
    };
  }
  const topic = topicById(topicId);
  const prompts = fresh(topic?.prompts ?? []).slice(0, SET_SIZE);
  return { prompts, missing: SET_SIZE - prompts.length };
}

/** New prompts from the AI when a topic's bank runs out. Throws if the AI can't be reached. */
export async function fetchPrompts(topic: string, count: number, avoid: string[]): Promise<string[]> {
  const res = await fetch('/api/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'prompts', topic, count, avoid }),
  });
  if (!res.ok) throw new Error(`Prompts failed: ${res.status}`);
  return ((await res.json()) as { prompts: string[] }).prompts ?? [];
}

/** Fill a set: bank prompts first, then AI prompts, then (offline) already-seen prompts again. */
export async function promptsForSet(state: LearnerState, topicId: string): Promise<string[]> {
  const { prompts, missing } = pickPrompts(state, topicId);
  if (!missing) return prompts;
  const topic = topicById(topicId);
  let extra: string[] = [];
  try {
    extra = await fetchPrompts(topicId, missing, [...(state.writing?.usedPrompts ?? []), ...prompts]);
  } catch {
    // No AI: reuse prompts this learner has seen, least recent first.
  }
  const reuse = (topic?.prompts ?? []).filter((p) => !prompts.includes(p) && !extra.includes(p));
  return [...prompts, ...extra, ...reuse].slice(0, SET_SIZE);
}

export function newSet(topic: string, addon: string | undefined, prompts: string[]): WritingSet {
  return {
    id: `w${Date.now().toString(36)}`,
    topic,
    addon,
    createdAt: Date.now(),
    stage: 'write',
    items: prompts.map((prompt) => ({ prompt, english: '', attempts: [] })),
    queue: [],
    pos: 0,
  };
}

/** Ask the AI to check one translation. Throws if it can't be reached. */
export async function checkTranslation(set: WritingSet, english: string, spanish: string): Promise<TranslationCheck> {
  const res = await fetch('/api/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'translation', topic: set.topic, addon: set.addon, english, spanish }),
  });
  if (!res.ok) throw new Error(`Check failed: ${res.status}`);
  const { check } = (await res.json()) as { check: TranslationCheck & { v?: number } };
  const { v: _v, ...rest } = check;
  return rest;
}

/** What to work on, from the mistakes in a set's translations (first and second tries). */
export function writingFocus(set: WritingSet): Focus[] {
  const focus = focusCollector();
  for (const item of set.items) {
    for (const a of item.attempts) {
      const c = a.check;
      if (!c) continue;
      for (const issue of c.issues) {
        const area = areaFor(issue.category);
        if (area) focus.add(area, issue.right ? { wrong: issue.wrong, right: issue.right } : undefined);
      }
    }
  }
  return focus.top();
}

export interface Suggestion {
  topic?: string;
  addon?: string;
  title: string;
  about: string;
}

/**
 * Three things to try next when a set had no mistakes: topics and add-ons
 * this learner hasn't practised yet (or least), main topics first.
 */
export function suggestNext(state: LearnerState, done: WritingSet): Suggestion[] {
  const sets = state.writing?.sets.filter((s) => s.stage === 'done') ?? [];
  const count = (pick: (s: WritingSet) => boolean) => sets.filter(pick).length;
  const t = topics
    .filter((x) => x.id !== done.topic)
    .map((x) => ({ topic: x.id, title: x.title, about: x.about, n: count((s) => s.topic === x.id) }))
    .sort((a, b) => a.n - b.n);
  const a = addons
    .filter((x) => x.id !== done.addon)
    .map((x) => ({ addon: x.id, title: x.title, about: x.about, n: count((s) => s.addon === x.id) }))
    .sort((p, q) => p.n - q.n);
  return [t[0], t[1], a[0]].filter(Boolean).map(({ n: _n, ...s }) => s);
}

/** A focus area's suggested topic and add-on, for the next set. */
export function nextFromFocus(focus: Focus[]): { topic?: string; addon?: string } {
  const pick: { topic?: string; addon?: string } = {};
  for (const f of focus) {
    const p = PRACTICE_FOR[f.area];
    if (p?.topic && !pick.topic) pick.topic = p.topic;
    if (p?.addon && !pick.addon) pick.addon = p.addon;
  }
  return pick;
}

const PRACTICE_FOR: Partial<Record<FocusArea, { topic?: string; addon?: string }>> = {
  person: { topic: 'present' },
  tense: { topic: 'past' },
  serestar: { topic: 'serestar' },
  verbs: { addon: 'irregular' },
  gender: { addon: 'gender' },
  number: { addon: 'adjectives' },
  agreement: { addon: 'adjectives' },
  accent: { addon: 'accents' },
};

/** A reading-answer check in the shape the summaries use. */
export const asReadingCheck = (c: TranslationCheck, spanish: string): ReadingCheck => ({
  ...c,
  answer: spanish,
  source: 'ai',
});

export const sameText = (a: string, b: string) => normalize(a) === normalize(b);
