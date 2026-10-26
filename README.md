# Lemonade

A LingQ-style Spanish reading platform built for CS6460 (Foundations of Educational Technology), Georgia Tech. Lemonade is about making the best of learner mistakes.

## Milestone 1: reading view

Each reading teaches a small set of **targets**: new words and verb forms.

1. **Guess.** Multiple choice on each target before reading, with no feedback (pretesting). Meaning questions ("What does *bufanda* mean?") and verb-form questions ("Todos los sábados, (yo) ___ al mercado.").
2. **Read.** The reading has three parts, modeled on LingQ Mini Stories:
   - **La historia:** the story, told in the third person.
   - **Retelling:** the same story told by the character, so the learner sees each verb change (*Lucía va* becomes *voy*).
   - **Preguntas y respuestas:** a statement, a question about it, and a tap-to-reveal answer.

   Tap any word for a gloss and grammar note. Words are tracked as new, learning or known.
3. **Recall.** The same targets, typed from memory: English to Spanish for words, the missing form for verbs.
4. **Compare.** Scores before and after reading. Grading separates a wrong verb form ("*lleva* is the él/ella form") from accent slips, common spelling mix-ups (b/v, ll/y, l/ll, c/z, ü) and typos. For verb forms, the matching story and retelling sentences are shown side by side. The learner types each correction, and missed targets are queued for spaced review.

All learner data stays in `localStorage`. **Reset demo** in the header restores the demo learner profile.

## Writing a reading

Each reading has three parts:

| File | What goes in it |
|---|---|
| `src/content/texts/<name>.txt` | The story, retelling and Q&A, with translations. The format is described at the top of `mercado.txt`. |
| `src/content/lexicon.txt` | Every word and phrase, shared by all readings, with senses. The format is described at the top of the file. |
| `src/data/texts/<name>.ts` | The questions (targets), with options and trap notes. Register it in `src/data/texts/index.ts`. |

Markup in the story text:

- `[le gusta]` groups words into one term. The reader highlights and tracks it as a unit, and its card lists each word's meaning.
- `[mañana:morning]` uses a specific sense. Without it, a word uses its first (`gloss:`) meaning.

Which terms a learner already knows is worked out at runtime from their saved words. You don't list it per story.

`npm run check:content` checks everything and prints each reading's phrases and senses. It runs before every build and fails on unknown words, missing senses, a retelling that doesn't line up with the story, or a question about a word that isn't in the text.

Spelling mix-up rules and their explanations are in `src/lib/spellingConfusions.ts`.

## Development

Requires Node 24 LTS, 24.22.1 or later (see `.nvmrc`; run `nvm use`).

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build
npm run lint
```

Stack: Vite, React, TypeScript, CSS Modules, React Router. Deployed on Vercel. `vercel.json` rewrites routes to the SPA.

## Structure

```
src/
  content/          story text files, shared lexicon, parser
  data/texts/       questions for each reading
  lib/              tokenizer, answer grading, word stats
  store/            learner state (reducer + localStorage)
  pages/            Library, Lesson
  components/       Layout, lesson steps (Stepper, PreQuestions, Reader, PostQuestions, Comparison)
```
