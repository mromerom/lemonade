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

Reading content lives in `src/data/texts/`. Spelling mix-up rules and their explanations are in `src/lib/spellingConfusions.ts`.

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
  data/texts/       reading content: paragraphs, glossary, questions
  lib/              tokenizer, answer grading, word stats
  store/            learner state (reducer + localStorage)
  pages/            Library, Lesson
  components/       Layout, lesson steps (Stepper, PreQuestions, Reader, PostQuestions, Comparison)
```
