# Lemonade

A LingQ-style Spanish reading platform built for CS6460 (Foundations of Educational Technology), Georgia Tech. Lemonade is about making the best of learner mistakes.

## Milestone 1: reading view

Each reading runs in four steps:

1. **Guess.** Multiple-choice comprehension questions before reading, with no feedback (pretesting).
2. **Read.** Tap any word for a gloss and grammar note. Words are tracked as new, learning or known, and each paragraph has a translation toggle.
3. **Recall.** The same questions, answered by typing from memory with the text hidden (retrieval practice).
4. **Compare.** Scores before and after reading. Grading separates wrong answers from accent slips and likely typos. The learner sees the passage that holds each answer and types the correction out. Missed questions are queued for spaced review.

All learner data stays in `localStorage`. **Reset demo** in the header restores the demo learner profile.

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
