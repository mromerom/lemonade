import type { Person, Target } from '../types';
import { gradeAnswer, normalize, stripAccents, type Grade } from './grade';

export interface TargetGrade extends Grade {
  /** For verb-form targets: the person whose form the learner typed instead */
  usedPerson?: Person;
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

  const tokens = normalize(typed).split(' ');
  const accepted = target.post.accept.map((a) => normalize(a));
  if (accepted.some((a) => tokens.includes(a))) return { verdict: 'correct', confusions: [] };

  if (target.kind === 'form') {
    const bareTokens = tokens.map(stripAccents);
    for (const [person, form] of Object.entries(target.forms) as [Person, string][]) {
      if (person === target.person) continue;
      if (bareTokens.includes(stripAccents(normalize(form)))) {
        return { verdict: 'form', confusions: [], usedPerson: person };
      }
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
