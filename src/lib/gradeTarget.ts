import type { Person, QuestionOption, Target } from '../types';
import { gradeAnswer, normalize, stripAccents, type Grade } from './grade';

export interface TargetGrade extends Grade {
  /** For verb-form targets: the person whose form the learner typed instead */
  usedPerson?: Person;
  /** For verb-form targets: the tense or mood of a wrong form the learner typed */
  usedTense?: string;
  /** Explanation for a typed trap answer (a false friend, a look-alike) */
  trapNote?: string;
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

/** Language the before-reading options are written in. */
export function optionsLang(target: Target): 'es' | 'en' {
  return target.pre.optionsLang ?? (target.kind === 'meaning' ? 'en' : 'es');
}

/**
 * Why a picked distractor is wrong: the option's own note, or for verb forms,
 * which person the picked form belongs to.
 */
export function distractorNote(target: Target, option: QuestionOption | undefined): string | null {
  if (!option || option.id === target.pre.correctOptionId) return null;
  if (option.note) return option.note;
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
