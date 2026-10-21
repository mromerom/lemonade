/**
 * Grading for typed comprehension answers.
 *
 * Verdicts separate "wrong answer" from smaller slips, so feedback can
 * tell a learner who misremembered from one who mistyped:
 *   correct  – every keyword present, spelled correctly
 *   accent   – right word, missing or wrong accent marks
 *   typo     – right word, off by one letter
 *   incorrect – the keyword isn't there
 */
export type Verdict = 'correct' | 'accent' | 'typo' | 'incorrect';

const RANK: Record<Verdict, number> = { correct: 3, accent: 2, typo: 1, incorrect: 0 };

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
    }
  }
  return dp[a.length][b.length];
}

function gradeWord(keyword: string, tokens: string[]): Verdict {
  const kw = normalize(keyword);
  if (tokens.includes(kw)) return 'correct';
  const bare = stripAccents(kw);
  const bareTokens = tokens.map(stripAccents);
  if (bareTokens.includes(bare)) return 'accent';
  if (bare.length >= 4 && bareTokens.some((t) => editDistance(t, bare) === 1)) return 'typo';
  return 'incorrect';
}

export function gradeAnswer(answer: string, keywordSets: string[][]): Verdict {
  const tokens = normalize(answer).split(' ').filter(Boolean);
  let best: Verdict = 'incorrect';
  for (const set of keywordSets) {
    // A set's verdict is its weakest word; the answer's verdict is the best set.
    const words = set.flatMap((k) => normalize(k).split(' '));
    const verdict = words
      .map((w) => gradeWord(w, tokens))
      .reduce<Verdict>((worst, v) => (RANK[v] < RANK[worst] ? v : worst), 'correct');
    if (RANK[verdict] > RANK[best]) best = verdict;
  }
  return best;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  correct: 'Correct',
  accent: 'Check the accents',
  typo: 'Looks like a typo',
  incorrect: 'Not quite',
};
