// Generated from server/check.ts by npm run build:api. Don't edit this file.

// server/check.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// src/types.ts
var ISSUE_CATEGORIES = [
  "person",
  "tense",
  "gender",
  "number",
  "agreement",
  "spelling",
  "accent",
  "word choice",
  "word order",
  "missing word",
  "meaning",
  "other"
];

// src/content/parse.ts
function blocks(lines) {
  const out = [];
  let current = null;
  for (const { n, text } of lines) {
    if (!text.trim()) {
      current = null;
      continue;
    }
    if (!current) {
      current = { line: n, lines: [] };
      out.push(current);
    }
    current.lines.push(text.trim());
  }
  return out;
}
function paragraph(block, id, file, errors) {
  const q = block.lines.findIndex((l) => /^Q:/.test(l));
  const body = q < 0 ? block.lines : block.lines.slice(0, q);
  const es = body.filter((l) => !l.startsWith(">")).join(" ");
  const en = body.filter((l) => l.startsWith(">")).map((l) => l.slice(1).trim()).join(" ");
  if (!es) errors.push({ file, line: block.line, message: "Paragraph has a translation but no Spanish" });
  if (!en) errors.push({ file, line: block.line, message: 'Paragraph has no "> " translation' });
  const para = { es, en };
  if (q >= 0) {
    const question = readingQuestion(block.lines.slice(q), id, file, block.line, errors);
    if (question) para.question = question;
  }
  return para;
}
function readingQuestion(lines, id, file, line, errors) {
  const part = (tag) => {
    const i = lines.findIndex((l) => l.startsWith(`${tag}:`));
    if (i < 0) return null;
    const next = lines[i + 1];
    if (!next?.startsWith(">")) errors.push({ file, line, message: `${tag}: line has no "> " translation after it` });
    return { es: lines[i].slice(2).trim(), en: next?.startsWith(">") ? next.slice(1).trim() : "" };
  };
  const question = part("Q");
  const answer = part("A");
  if (!question || !answer) {
    errors.push({ file, line, message: "A paragraph question needs a Q: line and an A: line" });
    return null;
  }
  const acceptLine = lines.find((l) => /^accept:/i.test(l));
  const accept = acceptLine ? acceptLine.slice(acceptLine.indexOf(":") + 1).split("|").map((s) => s.trim()).filter(Boolean) : [];
  for (const l of lines) {
    if (!/^(Q:|A:|>|accept:)/i.test(l)) errors.push({ file, line, message: `Can't read "${l}" in the question` });
  }
  return { id, question, answer, accept };
}
var SECTIONS = { historia: "story", retelling: "retelling" };
function parseStory(raw, file) {
  const errors = [];
  const all = raw.split(/\r?\n/).map((text, i) => ({ n: i + 1, text }));
  const meta = {};
  let start = 0;
  if (all[0]?.text.trim() === "---") {
    const end = all.findIndex((l, i) => i > 0 && l.text.trim() === "---");
    if (end < 0) {
      errors.push({ file, line: 1, message: "Front matter starts with --- but never ends" });
      return { story: null, errors };
    }
    for (const { n, text } of all.slice(1, end)) {
      const m = /^(\w+)\s*:\s*(.*)$/.exec(text.trim());
      if (m) meta[m[1]] = m[2].trim();
      else if (text.trim()) errors.push({ file, line: n, message: `Can't read front matter line "${text}"` });
    }
    start = end + 1;
  }
  for (const key of ["id", "title", "titleEn", "level", "summary", "narrator"]) {
    if (!meta[key]) errors.push({ file, line: 1, message: `Front matter is missing "${key}"` });
  }
  const sections = {};
  let current = null;
  for (const l of all.slice(start)) {
    const t = l.text.trim();
    const heading = /^##\s+(.+)$/.exec(t);
    if (heading) {
      const name = heading[1].trim().toLowerCase();
      if (name === "preguntas") {
        errors.push({ file, line: l.n, message: "There is no Preguntas section any more: put a Q:/A: question under each paragraph." });
        current = null;
      } else if (!(name in SECTIONS)) {
        errors.push({ file, line: l.n, message: `Unknown section "${heading[1]}". Use Historia or Retelling.` });
        current = null;
      } else {
        current = SECTIONS[name];
        sections[current] = [];
      }
      continue;
    }
    if (t.startsWith("#")) continue;
    if (current) sections[current].push(l);
    else if (t) errors.push({ file, line: l.n, message: "Text outside any ## section" });
  }
  for (const s of Object.values(SECTIONS)) {
    if (!sections[s]) errors.push({ file, line: 0, message: `Missing section for ${s}` });
  }
  const story = blocks(sections.story ?? []).map((b, i) => paragraph(b, `story-${i}`, file, errors));
  const retold = blocks(sections.retelling ?? []).map((b, i) => paragraph(b, `retell-${i}`, file, errors));
  let example;
  if (meta.example) {
    const [a, b] = meta.example.split("=>").map((s) => s.trim());
    if (a && b) example = [a, b];
    else errors.push({ file, line: 1, message: 'example should look like "Luc\xEDa va => voy"' });
  }
  return {
    story: {
      id: meta.id ?? "",
      source: file,
      title: meta.title ?? "",
      titleEn: meta.titleEn ?? "",
      level: meta.level ?? "",
      summaryEn: meta.summary ?? "",
      story,
      retelling: { narrator: meta.narrator ?? "", example, paragraphs: retold }
    },
    errors
  };
}

// src/lib/tokenize.ts
var WORD = new RegExp("(\\p{L}+)", "u");

// src/lib/markup.ts
var BRACKET = /\[([^\]:]+)(?::([\w-]+))?\]/g;
function plainText(es) {
  return es.replace(BRACKET, "$1");
}

// server/check.ts
var MODEL = "claude-haiku-5-5";
var MAX_ANSWER = 200;
var stories = null;
function loadStories() {
  if (stories) return stories;
  const dir = join(process.cwd(), "src/content/texts");
  stories = /* @__PURE__ */ new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".txt"))) {
    const { story } = parseStory(readFileSync(join(dir, file), "utf8"), `texts/${file}`);
    if (story) stories.set(story.id, story);
  }
  return stories;
}
function itemsFor(story, answers) {
  const parts = [
    ["story", story.story],
    ["retelling", story.retelling.paragraphs]
  ];
  return parts.flatMap(
    ([part, paragraphs]) => paragraphs.flatMap((p) => {
      const q = p.question;
      const answer = q && answers[q.id]?.trim().slice(0, MAX_ANSWER);
      if (!q || !answer) return [];
      return [{ id: q.id, part, paragraph: plainText(p.es), question: q.question.es, model: q.answer.es, answer }];
    })
  );
}
function systemPrompt(story) {
  return `You check answers written by learners of Castilian Spanish (Spain), level ${story.level}, to reading-comprehension questions about a short story. Each question is about one paragraph, and the learner could see it while answering.

How to judge:
- meaning: "correct" if the answer is true according to the paragraph and answers the question, even when worded differently from the model answer. "partly" if it is on the right track but misses the key point, or adds something the paragraph contradicts. "incorrect" if it doesn't answer the question or says something the paragraph contradicts. The model answer is one good answer, not the only one.
- In the retelling, ${story.retelling.narrator} asks the questions about themself, so the learner should answer to them with t\xFA (te, tu, verbs ending in -s). Answering about them with \xE9l/ella is a "person" issue, not a meaning issue.
- issues: only real mistakes in the learner's Spanish (person, tense, gender, number, agreement, spelling, accent, word choice, word order, missing word). Don't flag: a missing capital letter or final full stop, a missing "\xBF", Castilian usage, informal but correct Spanish, or a shorter answer than the model's. If the meaning is wrong, add one issue with category "meaning" whose "right" is the key fact from the paragraph.
- wrong/right: the few words involved, as the learner wrote them and fixed.
- tip: the rule behind the fix, in plain English, at most 15 words, for a learner at ${story.level}.
- corrected: the learner's answer with the smallest fixes, keeping their words. Empty if there is nothing to fix.
- comment: at most 20 words of English about the meaning, speaking to the learner as "you". Encouraging and specific, never just "Great job". Empty when the meaning is correct and there are no issues.`;
}
function userPrompt(items) {
  return items.map(
    (i) => `<item id="${i.id}" part="${i.part}">
<paragraph>${i.paragraph}</paragraph>
<question>${i.question}</question>
<model_answer>${i.model}</model_answer>
<learner_answer>${i.answer.replace(/</g, "\u2039")}</learner_answer>
</item>`
  ).join("\n");
}
var TOOL = {
  name: "report_checks",
  description: "Report the check of every learner answer.",
  input_schema: {
    type: "object",
    properties: {
      checks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            meaning: { type: "string", enum: ["correct", "partly", "incorrect"] },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string", enum: [...ISSUE_CATEGORIES] },
                  wrong: { type: "string" },
                  right: { type: "string" },
                  tip: { type: "string" }
                },
                required: ["category", "wrong", "right", "tip"]
              }
            },
            corrected: { type: "string" },
            comment: { type: "string" }
          },
          required: ["id", "meaning", "issues", "corrected", "comment"]
        }
      }
    },
    required: ["checks"]
  }
};
function cleanChecks(raw, items) {
  const list = raw?.checks ?? [];
  const ids = new Set(items.map((i) => i.id));
  const categories = new Set(ISSUE_CATEGORIES);
  const out = {};
  for (const c of list) {
    if (!ids.has(c.id) || !["correct", "partly", "incorrect"].includes(c.meaning)) continue;
    const answer = items.find((i) => i.id === c.id).answer;
    out[c.id] = {
      meaning: c.meaning,
      issues: (c.issues ?? []).filter((i) => categories.has(i.category)).slice(0, 4).map((i) => ({ category: i.category, wrong: i.wrong, right: i.right, tip: i.tip.slice(0, 160) })),
      // A "correction" identical to the answer isn't one.
      corrected: c.corrected && c.corrected.trim() !== answer ? c.corrected.slice(0, 300) : void 0,
      comment: c.comment?.slice(0, 200) || void 0
    };
  }
  return out;
}
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: "The AI check is not set up (no ANTHROPIC_API_KEY)." }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send JSON." }, 400);
  }
  const story = body.textId ? loadStories().get(body.textId) : void 0;
  if (!story || typeof body.answers !== "object" || !body.answers) return json({ error: "Unknown text." }, 400);
  const items = itemsFor(story, body.answers);
  if (!items.length) return json({ checks: {} });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400 + 250 * items.length,
      temperature: 0,
      system: systemPrompt(story),
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: userPrompt(items) }]
    })
  });
  if (!res.ok) {
    console.error("Anthropic API error", res.status, await res.text());
    return json({ error: "The AI check failed." }, 502);
  }
  const data = await res.json();
  const tool = data.content.find((c) => c.type === "tool_use");
  return json({ checks: cleanChecks(tool?.input, items) });
}
export {
  POST,
  cleanChecks,
  itemsFor,
  systemPrompt,
  userPrompt
};
