# Lemonade

A LingQ-style Spanish reading platform built for CS6460 (Foundations of Educational Technology), Georgia Tech. Lemonade is about making the best of learner mistakes.

## Milestone 1: reading view

Each reading teaches a small set of **targets**: new words and verb forms.

1. **Guess.** Multiple choice on each target before reading, with no feedback (pretesting). Meaning questions ("What does *bufanda* mean?") and verb-form questions ("Todos los sábados, (yo) ___ al mercado.").
2. **Read.** The reading has two parts, modeled on LingQ Mini Stories:
   - **La historia:** the story, told in the third person.
   - **Retelling:** the same story told by the character, so the learner sees each verb change (*Lucía va* becomes *voy*).

   Each paragraph ends with a comprehension question the learner must answer, with the paragraph in view (adjunct questions). Beginner (A) answers are a word or two; intermediate (B) answers are a short sentence about something the paragraph implies, often in another person or tense. In the retelling, the character asks about themself and the learner answers with *tú*. Answers can be changed until the results.

   Tap any word for a gloss and grammar note. Words are tracked as new, learning or known.
3. **Recall.** The same targets, typed from memory: English to Spanish for words, the missing form for verbs.
4. **Compare.** One result at a time, like slides: first the questions answered while reading, then the words and verb forms. Beginner answers are graded in the app, naming gender and number slips (*una pastel*, *contento*). Sentence answers are checked by AI (see below). The last slide shows the scores and up to three things to focus on, or, if everything was right, a reading with words the learner hasn't seen.

   For the words and verb forms: scores before and after reading. Grading separates a wrong verb form ("*lleva* is the él/ella form") from accent slips, common spelling mix-ups (b/v, ll/y, l/ll, c/z, ü) and typos. For verb forms, the matching story and retelling sentences are shown side by side. The learner types each correction, and missed targets are queued for spaced review.

All learner data stays in `localStorage`. **Reset demo** in the header restores the demo learner profile.

## Writing a reading

Each reading has three parts:

| File | What goes in it |
|---|---|
| `src/content/texts/<name>.txt` | The story and retelling with translations, and a question under each paragraph. The format is described at the top of `mercado.txt`. |
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

### AI check

`server/check.ts` (bundled into `api/check.js` by `npm run build:api`, part of `npm run build`) is a Vercel function that checks sentence answers with Claude (Haiku), one call per reading. The browser sends only the reading's id and the answers; the paragraphs, questions and model answers are read from the story files on the server, so the endpoint can't be used for anything else. The model must answer through a fixed schema (meaning: correct, partly or incorrect; issues by category with a tip; a minimally corrected answer), and results are saved with the lesson, so an answer is only checked again if it changes.

It needs an Anthropic API key:

- **Vercel:** Project → Settings → Environment Variables → `ANTHROPIC_API_KEY`.
- **Locally:** put `ANTHROPIC_API_KEY=...` in `.env.local` (git-ignored). `npm run dev` serves `/api/check` too.

Without a key, or offline, the results step asks learners to compare their answer with the model answer themselves.

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
