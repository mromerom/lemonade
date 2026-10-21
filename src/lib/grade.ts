import { findConfusions, type SpellingConfusion } from './spellingConfusions';

/**
 * Grading for typed comprehension answers.
 *
 * Verdicts separate "wrong answer" from smaller slips, so feedback can
 * tell a learner who misremembered from one who misspelled:
 *   correct   – every keyword present, spelled correctly
 *   accent    – right word, missing or wrong accent marks
 *   spelling  – right word, with a common Spanish spelling confusion (b/v, ll/y, …)
 *   typo      – right word, off by one letter
 *   incorrect – the keyword isn't there
 */
export type Verdict = 'correct' | 'accent' | 'spelling' | 'typo' | 'incorrect';

export interface Grade {
  verdict: Verdict;
  /** Confusions found, when verdict is 'spelling' */
  confusions: SpellingConfusion[];
}

const RANK: Record<Verdict, number> = { correct: 4, accent: 3, spelling: 2, typo: 1, incorrect: 0 };

export function isSlip(v: Verdict): boolean {
  return v === 'accent' || v === 'spelling' || v === 'typo';
}

export function normalize(s: string): string {
  return s
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** Edit distance counting insertions, deletions, substitutions and adjacent swaps. */
export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      // Swapped neighbors ("abeulo") count as one edit.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[a.length][b.length];
}

/** Strip accents but keep ü, so diéresis mistakes stay detectable. */
function stripKeepDieresis(s: string): string {
  return stripAccents(s.replace(/ü/g, '\uE000')).replace(/\uE000/g, 'ü');
}

function gradeWord(keyword: string, tokens: string[]): Grade {
  const kw = normalize(keyword);
  if (tokens.includes(kw)) return { verdict: 'correct', confusions: [] };

  // Spelling confusions are checked before accents so a missing ü is named as such.
  for (const t of tokens) {
    const found = findConfusions(t, kw);
    if (found) return { verdict: 'spelling', confusions: found };
  }

  const bare = stripAccents(kw);
  const bareTokens = tokens.map(stripAccents);
  if (bareTokens.includes(bare)) return { verdict: 'accent', confusions: [] };

  // A confusion with accents also missing, e.g. "limon" written as "llimon".
  const looseKw = stripKeepDieresis(kw);
  for (const t of tokens) {
    const found = findConfusions(stripKeepDieresis(t), looseKw);
    if (found) return { verdict: 'spelling', confusions: found };
  }

  if (bare.length >= 4 && bareTokens.some((t) => editDistance(t, bare) === 1)) {
    return { verdict: 'typo', confusions: [] };
  }
  return { verdict: 'incorrect', confusions: [] };
}

export function gradeAnswer(answer: string, keywordSets: string[][]): Grade {
  const tokens = normalize(answer).split(' ').filter(Boolean);
  let best: Grade = { verdict: 'incorrect', confusions: [] };
  for (const set of keywordSets) {
    // A set's verdict is its weakest word; the answer's verdict is the best set.
    const words = set.flatMap((k) => normalize(k).split(' '));
    const grades = words.map((w) => gradeWord(w, tokens));
    const worst = grades.reduce((a, g) => (RANK[g.verdict] < RANK[a.verdict] ? g : a), {
      verdict: 'correct' as Verdict,
      confusions: [] as SpellingConfusion[],
    });
    const confusions = grades.flatMap((g) => g.confusions);
    if (RANK[worst.verdict] > RANK[best.verdict]) best = { verdict: worst.verdict, confusions };
  }
  return best;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  correct: 'Correct',
  accent: 'Check the accents',
  spelling: 'Common spelling mix-up',
  typo: 'Looks like a typo',
  incorrect: 'Not quite',
};
