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
import { parseStory, type ParsedStory } from '../src/content/parse';
import { plainText } from '../src/lib/markup';
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
  return `You check answers written by learners of Castilian Spanish (Spain), level ${story.level}, to reading-comprehension questions about a short story. Each question is about one paragraph, and the learner could see it while answering.

How to judge:
- meaning: "correct" if the answer is true according to the paragraph and answers the question, even when worded differently from the model answer. "partly" if it is on the right track but misses the key point, or adds something the paragraph contradicts. "incorrect" if it doesn't answer the question or says something the paragraph contradicts. The model answer is one good answer, not the only one.
- In the retelling, ${story.retelling.narrator} asks the questions about themself, so the learner should answer to them with tú (te, tu, verbs ending in -s). Answering about them with él/ella is a "person" issue, not a meaning issue.
- issues: only real mistakes in the learner's Spanish (person, tense, gender, number, agreement, spelling, accent, word choice, word order, missing word). Don't flag: a missing capital letter or final full stop, a missing "¿", Castilian usage, informal but correct Spanish, or a shorter answer than the model's. If the meaning is wrong, add one issue with category "meaning" whose "right" is the key fact from the paragraph.
- wrong/right: the few words involved, as the learner wrote them and fixed.
- tip: the rule behind the fix, in plain English, at most 15 words, for a learner at ${story.level}.
- corrected: the learner's answer with the smallest fixes, keeping their words. Empty if there is nothing to fix.
- comment: at most 20 words of English about the meaning, speaking to the learner as "you". Encouraging and specific, never just "Great job". Empty when the meaning is correct and there are no issues.`;
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
            comment: { type: 'string' },
          },
          required: ['id', 'meaning', 'issues', 'corrected', 'comment'],
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
  comment: string;
}

/** Keep only well-formed checks for items that were asked about. */
export function cleanChecks(raw: unknown, items: Item[]) {
  const list = (raw as { checks?: RawCheck[] })?.checks ?? [];
  const ids = new Set(items.map((i) => i.id));
  const categories = new Set<string>(ISSUE_CATEGORIES);
  const out: Record<string, unknown> = {};
  for (const c of list) {
    if (!ids.has(c.id) || !['correct', 'partly', 'incorrect'].includes(c.meaning)) continue;
    const answer = items.find((i) => i.id === c.id)!.answer;
    out[c.id] = {
      meaning: c.meaning,
      issues: (c.issues ?? [])
        .filter((i) => categories.has(i.category))
        .slice(0, 4)
        .map((i) => ({ category: i.category, wrong: i.wrong, right: i.right, tip: i.tip.slice(0, 160) })),
      // A "correction" identical to the answer isn't one.
      corrected: c.corrected && c.corrected.trim() !== answer ? c.corrected.slice(0, 300) : undefined,
      comment: c.comment?.slice(0, 200) || undefined,
    };
  }
  return out;
}

// ---------- Handler ----------

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'The AI check is not set up (no ANTHROPIC_API_KEY).' }, 503);

  let body: { textId?: string; answers?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send JSON.' }, 400);
  }
  const story = body.textId ? loadStories().get(body.textId) : undefined;
  if (!story || typeof body.answers !== 'object' || !body.answers) return json({ error: 'Unknown text.' }, 400);
  const items = itemsFor(story, body.answers);
  if (!items.length) return json({ checks: {} });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400 + 250 * items.length,
      system: systemPrompt(story),
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content: userPrompt(items) }],
    }),
  });
  if (!res.ok) {
    console.error('Anthropic API error', res.status, await res.text());
    return json({ error: 'The AI check failed.' }, 502);
  }
  const data = (await res.json()) as { content: { type: string; input?: unknown }[] };
  const tool = data.content.find((c) => c.type === 'tool_use');
  return json({ checks: cleanChecks(tool?.input, items) });
}
