import type { Person, QuestionOption, Target } from '../types';
import { gradeAnswer, normalize, stripAccents, type Grade } from './grade';

export interface TargetGrade extends Grade {
  /** For verb-form targets: the person whose form the learner typed instead */
  usedPerson?: Person;
  /** For verb-form targets: the tense or mood of a wrong form the learner typed */
  usedTense?: string;
  /** Explanation for a typed trap answer (a false friend, a look-alike) */
  trapNote?: string;
  /** Note for a correct variant answer (regional form, near-synonym) */
  variantNote?: string;
}

/** True when the normalized phrase appears in the answer as whole words. */
function containsPhrase(answerNorm: string, phrase: string, bare = false): boolean {
  const a = bare ? stripAccents(answerNorm) : answerNorm;
  const p = bare ? stripAccents(normalize(phrase)) : normalize(phrase);
  return ` ${a} `.includes(` ${p} `);
}

/**
 * Grade a typed answer for one target.
 *
 * For verb forms, another person's form of the same verb ("lleva" for "llevo")
 * is a grammar mistake, not a typo, so it's checked before spelling and typos.
 */
export function gradeTarget(target: Target, answer: string): TargetGrade {
  const typed = answer.trim();
  if (!typed) return { verdict: 'incorrect', confusions: [] };

  const norm = normalize(typed);
  // Accepted answers may be several words ("he decidido", "lanzarse a la piscina").
  if (target.post.accept.some((a) => containsPhrase(norm, a))) return { verdict: 'correct', confusions: [] };
  for (const [variant, note] of Object.entries(target.post.variants ?? {})) {
    if (containsPhrase(norm, variant)) return { verdict: 'correct', confusions: [], variantNote: note };
    if (containsPhrase(norm, variant, true)) return { verdict: 'accent', confusions: [], variantNote: note };
  }

  for (const [trap, note] of Object.entries(target.post.traps ?? {})) {
    if (containsPhrase(norm, trap, true)) return { verdict: 'incorrect', confusions: [], trapNote: note };
  }

  if (target.kind === 'form') {
    for (const [person, form] of Object.entries(target.forms) as [Person, string][]) {
      if (person === target.person || normalize(form) === normalize(targetAnswer(target))) continue;
      if (containsPhrase(norm, form, true)) return { verdict: 'form', confusions: [], usedPerson: person };
    }
    for (const [form, tense] of Object.entries(target.wrongForms ?? {})) {
      if (containsPhrase(norm, form, true)) return { verdict: 'form', confusions: [], usedTense: tense };
    }
  }

  return gradeAnswer(typed, target.post.accept.map((a) => [a]));
}

/** Short label for a target, e.g. "bufanda" or "ir · nosotros". */
export function targetLabel(target: Target): string {
  return target.kind === 'meaning' ? target.word : `${target.verb} · ${target.person}`;
}

/** The answer to show as correct. */
export function targetAnswer(target: Target): string {
  return target.post.accept[0];
}

/** Why the correct answer is right: the correct option's note, if it has one. */
export function correctNote(target: Target): { answer: string; note: string } | null {
  const option = target.pre.options.find((o) => o.id === target.pre.correctOptionId);
  return option?.note ? { answer: option.text, note: option.note } : null;
}

/** True for the correct option or any also-correct variant. */
export function isCorrectOption(target: Target, optionId: string | undefined): boolean {
  return optionId === target.pre.correctOptionId || Boolean(optionId && target.pre.alsoCorrect?.includes(optionId));
}

/** Language the before-reading options are written in. */
export function optionsLang(target: Target): 'es' | 'en' {
  return target.pre.optionsLang ?? (target.kind === 'meaning' ? 'en' : 'es');
}

/**
 * A note on the picked option: its own note (why a trap is wrong, or what to
 * know about a correct variant), or for wrong verb forms, which person or
 * tense the picked form belongs to.
 */
export function distractorNote(target: Target, option: QuestionOption | undefined): string | null {
  // The correct option's note is shown separately, as "why it's right".
  if (!option || option.id === target.pre.correctOptionId) return null;
  // Traps and also-correct variants can carry their own note.
  if (option.note) return option.note;
  if (isCorrectOption(target, option.id)) return null;
  if (target.kind === 'form') {
    const match = (Object.entries(target.forms) as [Person, string][]).find(
      ([, form]) => normalize(form) === normalize(option.text),
    );
    if (match) return `«${option.text}» is the ${match[0]} form. With ${target.person}, it's «${targetAnswer(target)}».`;
    const tense = target.wrongForms?.[normalize(option.text)];
    if (tense) return `«${option.text}» is the ${tense}. Here it's «${targetAnswer(target)}».`;
  }
  return null;
}
