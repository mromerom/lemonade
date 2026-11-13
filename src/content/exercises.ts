/**
 * Content for the exercises: writing prompts (prompts.txt) and Proofread
 * sentences (proofread.txt). Parsed here, checked by scripts/check-content.ts.
 */
import promptsSource from './exercises/prompts.txt?raw';
import proofreadSource from './exercises/proofread.txt?raw';
import { parsePrompts, parseProofread } from './exercisesParse';

export * from './exercisesParse';

const prompts = parsePrompts(promptsSource);
const proofread = parseProofread(proofreadSource);

export const topics = prompts.topics;
export const addons = prompts.addons;
export const proofreadSeeds = proofread.items;

export const exerciseErrors = [...prompts.errors, ...proofread.errors];
