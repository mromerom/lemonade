/**
 * The -a/-o rule of thumb for a noun's gender, naming the common exceptions.
 * Used in gender tips, by the app's own checks and the AI check alike.
 */

const NOT_FEMININE = ['día', 'mapa', 'problema', 'idioma', 'sistema', 'tema', 'planeta', 'clima', 'programa'];
const NOT_MASCULINE = ['mano', 'foto', 'moto', 'radio'];

/** The -a/-o rule of thumb for an article's noun, or its exception. */
export function nounHint(noun?: string): string {
  if (!noun) return '';
  const n = noun.replace(/s$/, '');
  if (NOT_FEMININE.includes(n)) return ` «${n}» ends in -a but is masculine: one of the exceptions.`;
  if (NOT_MASCULINE.includes(n)) return ` «${n}» ends in -o but is feminine: one of the exceptions.`;
  if (n.endsWith('a')) return ' Rule of thumb: nouns ending in -a are almost always feminine.';
  if (n.endsWith('o')) return ' Rule of thumb: nouns ending in -o are almost always masculine.';
  return '';
}
