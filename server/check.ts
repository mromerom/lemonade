/**
 * POST /api/check: checks learners' answers to the reading questions with
 * Claude, in one call per lesson.
 *
 * The browser sends only the text id and the answers; the paragraphs,
 * questions and model answers come from the story files here on the server,
 * so the endpoint can't be used as a general-purpose chatbot.
 *
 * Vercel runs api/check.js, a single-file bundle of this file made by
 * `npm run build:api` (part of `npm run build`): Vercel compiles functions
 * file by file without bundling, and Node can't resolve the app's
 * extensionless imports that way. Commit api/check.js after changing this.
 *
 * Needs the ANTHROPIC_API_KEY environment variable (Vercel project settings,
 * or .env.local for `npm run dev`). Without it the endpoint answers 503 and
 * the app falls back to letting the learner compare answers themselves.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePrompts, type WritingAddon, type WritingTopic } from '../src/content/exercisesParse';
import { parseStory, type ParsedStory } from '../src/content/parse';
import { plainText } from '../src/lib/markup';
import { nounHint } from '../src/lib/nounGender';
import { ISSUE_CATEGORIES, type Paragraph } from '../src/types';

const MODEL = 'claude-haiku-5-5';
const MAX_ANSWER = 200;

// ---------- Stories ----------

let stories: Map<string, ParsedStory> | null = null;

function loadStories(): Map<string, ParsedStory> {
  if (stories) return stories;
  const dir = join(process.cwd(), 'src/content/texts');
  stories = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.txt'))) {
    const { story } = parseStory(readFileSync(join(dir, file), 'utf8'), `texts/${file}`);
    if (story) stories.set(story.id, story);
  }
  return stories;
}

interface Item {
  id: string;
  part: 'story' | 'retelling';
  paragraph: string;
  question: string;
  model: string;
  answer: string;
}

/** The questions answered, with what the model needs to judge each one. */
export function itemsFor(story: ParsedStory, answers: Record<string, string>): Item[] {
  const parts: ['story' | 'retelling', Paragraph[]][] = [
    ['story', story.story],
    ['retelling', story.retelling.paragraphs],
  ];
  return parts.flatMap(([part, paragraphs]) =>
    paragraphs.flatMap((p) => {
      const q = p.question;
      const answer = q && answers[q.id]?.trim().slice(0, MAX_ANSWER);
      if (!q || !answer) return [];
      return [{ id: q.id, part, paragraph: plainText(p.es), question: q.question.es, model: q.answer.es, answer }];
    }),
  );
}

// ---------- Prompt ----------

export function systemPrompt(story: ParsedStory): string {
  return `You check answers written by learners of Castilian Spanish (Spain), level ${story.level}, to reading-comprehension questions about a short story. Each question is about one paragraph, and the learner could see it while answering. You check two things only: whether the answer understands the paragraph, and whether its Spanish is grammatical. Be strict about those and nothing else.

Never report, correct or mention:
- capital letters (a sentence starting in lowercase is fine), punctuation, missing ¿ or ¡, or a missing final full stop;
- Castilian usage, informal but correct Spanish, or style you would phrase differently;
- an answer being shorter or simpler than the model answer.

meaning:
- "correct": true according to the paragraph and answers the question, even if worded differently from the model answer. The model answer is one good answer, not the only one.
- "partly": on the right track, but misses the key point or adds something the paragraph contradicts.
- "incorrect": doesn't answer the question, or says something the paragraph contradicts.
- In the retelling, ${story.retelling.narrator} asks about themself, so the learner should answer to them with tú (te, tu, verbs ending in -s). Answering about them with él/ella is a "person" issue, not a meaning issue.

issues: only real mistakes in the learner's Spanish. Never add an issue for meaning (explain meaning in comment). Pick the category by what is actually wrong:
- "spelling": letters inside one word are wrong (b/v, missing or extra h, ll/y, c/z/s, a missing or swapped letter). Not articles, not gender.
- "accent": only a written accent is missing or wrong.
- "gender": an article or adjective has the wrong gender for its noun ("el piscina", "a el piscina", "un casa", "contento" for a woman). For gender, end the tip with a rule of thumb when it helps: most nouns ending in -a are feminine and most ending in -o are masculine; if the noun is an exception (el día, el problema, el mapa, la mano, la foto), say so instead.
- "number": singular/plural mismatch. "agreement": other mismatches between words that go together.
- "person": the verb's person is wrong. "tense": the tense or mood is wrong. "ser/estar": ser where estar is needed, or the other way round.
- "word choice": a real word used with the wrong meaning. "word order", "missing word": as named.
For each issue, "wrong" and "right" are just the few words involved, as written and fixed. "tip" is the rule behind the fix, in plain English, at most 20 words, for a learner at ${story.level}.

corrected: the learner's answer with the smallest fixes for the issues listed, keeping their words. Empty when there are no issues.

alternative: only when meaning is "correct": one other natural way to answer, using words from the paragraph, at level ${story.level}. It must be clearly different from both the learner's answer and the model answer (not the same sentence with small changes), one short clause, no semicolons. Empty otherwise.

comment: at most 20 words of English about the meaning, speaking to the learner as "you": what they understood, or what the paragraph actually tells us. Specific, never just "Great job". Empty when the meaning is correct and there are no issues.`;
}

export function userPrompt(items: Item[]): string {
  return items
    .map(
      (i) =>
        `<item id="${i.id}" part="${i.part}">\n<paragraph>${i.paragraph}</paragraph>\n<question>${i.question}</question>\n<model_answer>${i.model}</model_answer>\n<learner_answer>${i.answer.replace(/</g, '‹')}</learner_answer>\n</item>`,
    )
    .join('\n');
}

const TOOL = {
  name: 'report_checks',
  description: 'Report the check of every learner answer.',
  input_schema: {
    type: 'object',
    properties: {
      checks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            meaning: { type: 'string', enum: ['correct', 'partly', 'incorrect'] },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string', enum: [...ISSUE_CATEGORIES] },
                  wrong: { type: 'string' },
                  right: { type: 'string' },
                  tip: { type: 'string' },
                },
                required: ['category', 'wrong', 'right', 'tip'],
              },
            },
            corrected: { type: 'string' },
            alternative: { type: 'string' },
            comment: { type: 'string' },
          },
          required: ['id', 'meaning', 'issues', 'corrected', 'alternative', 'comment'],
        },
      },
    },
    required: ['checks'],
  },
};

interface RawCheck {
  id: string;
  meaning: string;
  issues: { category: string; wrong: string; right: string; tip: string }[];
  corrected: string;
  alternative?: string;
  comment: string;
}

/** Bump when the prompt or the cleaning changes, so saved checks are made again. */
export const CHECK_VERSION = 2;

/** Lowercase, no punctuation or ¿¡: what's left is what the check is about. */
const bare = (s: string) =>
  s
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ARTICLES = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al', 'del', 'lo']);

/** "a el piscina" → "a la piscina" is gender, whatever the model called it. */
function articleOnly(wrong: string, right: string): boolean {
  const w = bare(wrong).split(' ');
  const r = bare(right).split(' ');
  const diff = (a: string[], b: string[]) => a.filter((x) => !b.includes(x));
  const changed = [...diff(w, r), ...diff(r, w)];
  return changed.length > 0 && changed.every((x) => ARTICLES.has(x));
}

/**
 * Keep only well-formed checks for items that were asked about, and drop what
 * the prompt says not to report even if the model reports it anyway:
 * capitalization or punctuation "fixes", meaning issues, a "correction" or
 * "alternative" that is really the same sentence.
 */
export function cleanChecks(raw: unknown, items: Item[], options: { keepMeaning?: boolean } = {}) {
  const list = (raw as { checks?: RawCheck[] })?.checks ?? [];
  const categories = new Set<string>(ISSUE_CATEGORIES);
  const out: Record<string, unknown> = {};
  for (const c of list) {
    const item = items.find((i) => i.id === c.id);
    if (!item || !['correct', 'partly', 'incorrect'].includes(c.meaning)) continue;
    const issues = (c.issues ?? [])
      .filter((i) => categories.has(i.category) && (options.keepMeaning || i.category !== 'meaning'))
      .filter((i) => bare(i.wrong) !== bare(i.right))
      .map((i) => {
        const category = i.category === 'spelling' && articleOnly(i.wrong, i.right) ? 'gender' : i.category;
        // Gender tips end with the -a/-o rule of thumb if the model left it out.
        const noun = bare(i.right).split(' ').pop();
        const tip =
          category === 'gender' && !/-a\b|-o\b|rule of thumb|exception/i.test(i.tip)
            ? `${i.tip.trim()}${nounHint(noun)}`
            : i.tip;
        return { category, wrong: i.wrong, right: i.right, tip: tip.slice(0, 260) };
      })
      .slice(0, 4);
    const corrected = issues.length && c.corrected && bare(c.corrected) !== bare(item.answer) ? c.corrected : undefined;
    const alternative =
      (c.meaning === 'correct' || options.keepMeaning) &&
      c.alternative &&
      ![item.answer, item.model, corrected ?? ''].some((s) => bare(s) === bare(c.alternative!))
        ? c.alternative
        : undefined;
    out[c.id] = {
      meaning: c.meaning,
      issues,
      corrected: corrected?.slice(0, 300),
      alternative: alternative?.slice(0, 200),
      comment: c.comment?.slice(0, 200) || undefined,
      v: CHECK_VERSION,
    };
  }
  return out;
}

// ---------- Handler ----------

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** One Claude call that must answer through `tool`; returns the tool's input. */
async function callClaude(key: string, system: string, user: string, tool: typeof TOOL, maxTokens: number) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    console.error('Anthropic API error', res.status, await res.text());
    throw json({ error: 'The AI check failed.' }, 502);
  }
  const data = (await res.json()) as { content: { type: string; input?: unknown }[] };
  return data.content.find((c) => c.type === 'tool_use')?.input;
}

type Body = {
  mode?: 'reading' | 'translation' | 'prompts';
  textId?: string;
  answers?: Record<string, string>;
} & TranslationRequest &
  PromptsRequest;

export async function POST(request: Request): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'The AI check is not set up (no ANTHROPIC_API_KEY).' }, 503);

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send JSON.' }, 400);
  }
  try {
    if (body.mode === 'translation') return await checkTranslation(key, body);
    if (body.mode === 'prompts') return await writePrompts(key, body);
    return await checkReading(key, body);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

async function checkReading(key: string, body: Body): Promise<Response> {
  const story = body.textId ? loadStories().get(body.textId) : undefined;
  if (!story || typeof body.answers !== 'object' || !body.answers) return json({ error: 'Unknown text.' }, 400);
  const items = itemsFor(story, body.answers);
  if (!items.length) return json({ checks: {} });
  const input = await callClaude(key, systemPrompt(story), userPrompt(items), TOOL, 400 + 250 * items.length);
  return json({ checks: cleanChecks(input, items) });
}

// ---------- Writing exercise: translations ----------

let writing: ReturnType<typeof parsePrompts> | null = null;

function loadWriting() {
  writing ??= parsePrompts(readFileSync(join(process.cwd(), 'src/content/exercises/prompts.txt'), 'utf8'));
  return writing;
}

interface TranslationRequest {
  topic?: string;
  addon?: string;
  english?: string;
  spanish?: string;
}

export function translationPrompt(topic?: WritingTopic, addon?: WritingAddon): string {
  return `You check a translation into Castilian Spanish (Spain). A learner of Spanish wrote a sentence about their own life in English, then translated it. You check whether the Spanish says what the English says, and whether it is grammatical. Be strict about those and nothing else.
${topic ? `
This set practises ${topic.title}: ${topic.about} Look closely at that, but report every real mistake.` : ''}${addon ? `
It also practises ${addon.title}: ${addon.about}` : ''}

Never report, correct or mention: capital letters, punctuation, missing ¿ or ¡, or a missing final full stop; Castilian usage, informal but correct Spanish, or style you would phrase differently. The English may be informal or slightly ungrammatical; translate its intended meaning and never correct the English.

meaning:
- "correct": the Spanish says what the English means, even if it's not word for word.
- "partly": most of it, but part of the meaning is missing, changed or unclear.
- "incorrect": it says something different, or can't be understood.

issues: only real mistakes in the Spanish. Categories:
- "spelling": letters inside one word are wrong (b/v, missing or extra h, ll/y, c/z/s, a missing or swapped letter). Not articles, not gender.
- "accent": only a written accent is missing or wrong.
- "gender": an article or adjective has the wrong gender for its noun. End the tip with the -a/-o rule of thumb when it helps, or name the exception (el día, el problema, la mano).
- "number", "agreement", "person", "tense" (tense or mood, including si + imperfect subjunctive), "ser/estar", "word choice" (a real word with the wrong meaning, or an English word or false friend), "word order", "missing word".
- "meaning": a part of the English that the Spanish leaves out or changes. Use it only when the grammar is fine but the meaning isn't.
For each issue, "wrong" and "right" are just the few words involved; "tip" is the rule behind the fix, in plain English, at most 20 words.

corrected: the learner's Spanish with the smallest fixes for the issues, keeping their words. Empty when there are no issues.
alternative: a natural Castilian translation of the English, clearly different from the learner's and from corrected. Empty if the learner's is already the most natural way.
comment: at most 20 words of English to the learner as "you": what they did well or the main thing to fix. Specific, never just "Great job".`;
}

const TRANSLATION_TOOL = {
  name: 'report_translation',
  description: 'Report the check of the translation.',
  input_schema: {
    type: 'object',
    properties: {
      meaning: { type: 'string', enum: ['correct', 'partly', 'incorrect'] },
      issues: TOOL.input_schema.properties.checks.items.properties.issues,
      corrected: { type: 'string' },
      alternative: { type: 'string' },
      comment: { type: 'string' },
    },
    required: ['meaning', 'issues', 'corrected', 'alternative', 'comment'],
  },
} as unknown as typeof TOOL;

async function checkTranslation(key: string, body: Body): Promise<Response> {
  const english = body.english?.trim().slice(0, 240);
  const spanish = body.spanish?.trim().slice(0, 300);
  if (!english || !spanish) return json({ error: 'Send english and spanish.' }, 400);
  const { topics, addons } = loadWriting();
  const topic = topics.find((t) => t.id === body.topic);
  const addon = addons.find((a) => a.id === body.addon);
  const input = (await callClaude(
    key,
    translationPrompt(topic, addon),
    `<english>${english.replace(/</g, '‹')}</english>\n<spanish>${spanish.replace(/</g, '‹')}</spanish>`,
    TRANSLATION_TOOL,
    900,
  )) as RawCheck | undefined;
  const item: Item = { id: 't', part: 'story', paragraph: '', question: '', model: '', answer: spanish };
  const cleaned = cleanChecks({ checks: input ? [{ ...input, id: 't' }] : [] }, [item], { keepMeaning: true }).t;
  if (!cleaned) return json({ error: 'The AI check failed.' }, 502);
  return json({ check: cleaned });
}

// ---------- Writing exercise: more prompts when a topic runs out ----------

interface PromptsRequest {
  topic?: string;
  count?: number;
  avoid?: string[];
}

const PROMPTS_TOOL = {
  name: 'write_prompts',
  description: 'Return the new writing prompts.',
  input_schema: {
    type: 'object',
    properties: { prompts: { type: 'array', items: { type: 'string' } } },
    required: ['prompts'],
  },
} as unknown as typeof TOOL;

async function writePrompts(key: string, body: Body): Promise<Response> {
  const topic = loadWriting().topics.find((t) => t.id === body.topic);
  if (!topic) return json({ error: 'Unknown topic.' }, 400);
  const count = Math.min(Math.max(body.count ?? 5, 1), 5);
  const avoid = (body.avoid ?? []).slice(0, 60).map((s) => String(s).slice(0, 160));
  const input = (await callClaude(
    key,
    `You write short writing prompts, in English, for an adult learning Spanish. The learner answers each prompt with one sentence about their own life in English, then translates it into Spanish. These prompts practise ${topic.title}: ${topic.about} Each prompt must make the English answer use that (a prompt for the past makes them write in the past). Each one starts with "Write about", fits on one line (under 100 characters), can be answered by anyone from their own life, and is different from the examples and from every prompt in the avoid list.`,
    `Examples:\n${topic.prompts.map((p) => `- ${p}`).join('\n')}\n\nAvoid:\n${avoid.map((p) => `- ${p}`).join('\n') || '(none)'}\n\nWrite ${count} new prompts.`,
    PROMPTS_TOOL,
    600,
  )) as { prompts?: unknown } | undefined;
  const prompts = (Array.isArray(input?.prompts) ? input.prompts : [])
    .filter((p): p is string => typeof p === 'string' && /^Write about /.test(p) && p.length <= 140)
    .filter((p) => !avoid.includes(p) && !topic.prompts.includes(p))
    .slice(0, count);
  return json({ prompts });
}
