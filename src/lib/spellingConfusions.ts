/**
 * Common Spanish spelling confusions: the learner knows the word but writes
 * a letter that sounds the same (or is easy to mix up).
 *
 * Each rule finds sites in the CORRECT word and says what a learner might
 * write there instead. To add a pattern, add a row.
 */
export interface SpellingConfusion {
  id: string;
  /** Short name shown to the learner */
  label: string;
  /** One-line explanation shown to the learner */
  explain: string;
  /** Where the mix-up can happen in the correct word (must be global) */
  site: RegExp;
  /** What the learner writes instead */
  replaceWith: string;
}

const FRONT_VOWEL = '(?=[eiéí])';
const VOWEL = '(?=[aeiouáéíóú])';

export const SPELLING_CONFUSIONS: SpellingConfusion[] = [
  {
    id: 'b-for-v',
    label: 'b / v',
    explain: 'B and V sound the same in Spanish. This word is spelled with V.',
    site: /v/g,
    replaceWith: 'b',
  },
  {
    id: 'v-for-b',
    label: 'b / v',
    explain: 'B and V sound the same in Spanish. This word is spelled with B.',
    site: /b/g,
    replaceWith: 'v',
  },
  {
    id: 'y-for-ll',
    label: 'll / y',
    explain: 'LL and Y sound the same in most of the Spanish-speaking world. This word is spelled with LL.',
    site: /ll/g,
    replaceWith: 'y',
  },
  {
    id: 'll-for-y',
    label: 'll / y',
    explain: 'LL and Y sound the same in most of the Spanish-speaking world. This word is spelled with Y.',
    site: new RegExp(`y${VOWEL}`, 'g'),
    replaceWith: 'll',
  },
  {
    // English often doubles L after a vowel for the same sound (last / ballast),
    // so English speakers write "abuello" or "pastell". Only flag L after a
    // vowel, before another vowel or at the end of the word: the places
    // English would double it. Word-initial L or L next to a consonant
    // (plaza, alto) isn't this mistake.
    id: 'll-for-l',
    label: 'l / ll',
    explain:
      "Unlike English (last, ballast), Spanish doesn't double L for the L sound. LL is a different sound, so this word has a single L.",
    site: /(?<=[aeiouáéíóúü])l(?![l])(?=[aeiouáéíóú]|$)/g,
    replaceWith: 'll',
  },
  {
    id: 'z-for-c',
    label: 'c / z',
    explain: 'Before E and I, Spanish writes the sound with C, not Z.',
    site: new RegExp(`c${FRONT_VOWEL}`, 'g'),
    replaceWith: 'z',
  },
  {
    id: 'missing-dieresis',
    label: 'ü',
    explain: 'This word needs ü so the U is pronounced between G and E or I (as in pingüino).',
    site: /ü/g,
    replaceWith: 'u',
  },
  {
    id: 'extra-dieresis',
    label: 'ü',
    explain: 'The U here is silent, so it takes no ü.',
    site: new RegExp(`(?<=g)u${FRONT_VOWEL}`, 'g'),
    replaceWith: 'ü',
  },
];

interface Site {
  start: number;
  end: number;
  rule: SpellingConfusion;
}

const MAX_SITES = 12;

/**
 * If `written` is `correct` with one or more common confusions applied,
 * returns the confusions involved; otherwise null.
 */
export function findConfusions(written: string, correct: string): SpellingConfusion[] | null {
  if (written === correct) return null;

  // Collect non-overlapping sites across all rules.
  const sites: Site[] = [];
  for (const rule of SPELLING_CONFUSIONS) {
    for (const m of correct.matchAll(rule.site)) {
      const start = m.index;
      const end = start + m[0].length;
      if (!sites.some((s) => start < s.end && s.start < end)) sites.push({ start, end, rule });
    }
  }
  if (sites.length === 0 || sites.length > MAX_SITES) return null;
  sites.sort((a, b) => a.start - b.start);

  // Try every combination of sites (2^n, n is small for a single word).
  for (let mask = 1; mask < 1 << sites.length; mask++) {
    let out = '';
    let pos = 0;
    const used: SpellingConfusion[] = [];
    sites.forEach((s, i) => {
      if (!(mask & (1 << i))) return;
      out += correct.slice(pos, s.start) + s.rule.replaceWith;
      pos = s.end;
      used.push(s.rule);
    });
    out += correct.slice(pos);
    if (out === written) return used;
  }
  return null;
}
