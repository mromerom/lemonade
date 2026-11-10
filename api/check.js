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

// src/lib/nounGender.ts
var NOT_FEMININE = ["d\xEDa", "mapa", "problema", "idioma", "sistema", "tema", "planeta", "clima", "programa"];
var NOT_MASCULINE = ["mano", "foto", "moto", "radio"];
function nounHint(noun) {
  if (!noun) return "";
  const n = noun.replace(/s$/, "");
  if (NOT_FEMININE.includes(n)) return ` \xAB${n}\xBB ends in -a but is masculine: one of the exceptions.`;
  if (NOT_MASCULINE.includes(n)) return ` \xAB${n}\xBB ends in -o but is feminine: one of the exceptions.`;
  if (n.endsWith("a")) return " Rule of thumb: nouns ending in -a are almost always feminine.";
  if (n.endsWith("o")) return " Rule of thumb: nouns ending in -o are almost always masculine.";
  return "";
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
  return `You check answers written by learners of Castilian Spanish (Spain), level ${story.level}, to reading-comprehension questions about a short story. Each question is about one paragraph, and the learner could see it while answering. You check two things only: whether the answer understands the paragraph, and whether its Spanish is grammatical. Be strict about those and nothing else.

Never report, correct or mention:
- capital letters (a sentence starting in lowercase is fine), punctuation, missing \xBF or \xA1, or a missing final full stop;
- Castilian usage, informal but correct Spanish, or style you would phrase differently;
- an answer being shorter or simpler than the model answer.

meaning:
- "correct": true according to the paragraph and answers the question, even if worded differently from the model answer. The model answer is one good answer, not the only one.
- "partly": on the right track, but misses the key point or adds something the paragraph contradicts.
- "incorrect": doesn't answer the question, or says something the paragraph contradicts.
- In the retelling, ${story.retelling.narrator} asks about themself, so the learner should answer to them with t\xFA (te, tu, verbs ending in -s). Answering about them with \xE9l/ella is a "person" issue, not a meaning issue.

issues: only real mistakes in the learner's Spanish. Never add an issue for meaning (explain meaning in comment). Pick the category by what is actually wrong:
- "spelling": letters inside one word are wrong (b/v, missing or extra h, ll/y, c/z/s, a missing or swapped letter). Not articles, not gender.
- "accent": only a written accent is missing or wrong.
- "gender": an article or adjective has the wrong gender for its noun ("el piscina", "a el piscina", "un casa", "contento" for a woman). For gender, end the tip with a rule of thumb when it helps: most nouns ending in -a are feminine and most ending in -o are masculine; if the noun is an exception (el d\xEDa, el problema, el mapa, la mano, la foto), say so instead.
- "number": singular/plural mismatch. "agreement": other mismatches between words that go together.
- "person": the verb's person is wrong. "tense": the tense or mood is wrong.
- "word choice": a real word used with the wrong meaning. "word order", "missing word": as named.
For each issue, "wrong" and "right" are just the few words involved, as written and fixed. "tip" is the rule behind the fix, in plain English, at most 20 words, for a learner at ${story.level}.

corrected: the learner's answer with the smallest fixes for the issues listed, keeping their words. Empty when there are no issues.

alternative: only when meaning is "correct": one other natural way to answer, using words from the paragraph, at level ${story.level}. It must be clearly different from both the learner's answer and the model answer (not the same sentence with small changes), one short clause, no semicolons. Empty otherwise.

comment: at most 20 words of English about the meaning, speaking to the learner as "you": what they understood, or what the paragraph actually tells us. Specific, never just "Great job". Empty when the meaning is correct and there are no issues.`;
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
            alternative: { type: "string" },
            comment: { type: "string" }
          },
          required: ["id", "meaning", "issues", "corrected", "alternative", "comment"]
        }
      }
    },
    required: ["checks"]
  }
};
var CHECK_VERSION = 2;
var bare = (s) => s.toLocaleLowerCase("es").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
var ARTICLES = /* @__PURE__ */ new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "al", "del", "lo"]);
function articleOnly(wrong, right) {
  const w = bare(wrong).split(" ");
  const r = bare(right).split(" ");
  const diff = (a, b) => a.filter((x) => !b.includes(x));
  const changed = [...diff(w, r), ...diff(r, w)];
  return changed.length > 0 && changed.every((x) => ARTICLES.has(x));
}
function cleanChecks(raw, items) {
  const list = raw?.checks ?? [];
  const categories = new Set(ISSUE_CATEGORIES);
  const out = {};
  for (const c of list) {
    const item = items.find((i) => i.id === c.id);
    if (!item || !["correct", "partly", "incorrect"].includes(c.meaning)) continue;
    const issues = (c.issues ?? []).filter((i) => categories.has(i.category) && i.category !== "meaning").filter((i) => bare(i.wrong) !== bare(i.right)).map((i) => {
      const category = i.category === "spelling" && articleOnly(i.wrong, i.right) ? "gender" : i.category;
      const noun = bare(i.right).split(" ").pop();
      const tip = category === "gender" && !/-a\b|-o\b|rule of thumb|exception/i.test(i.tip) ? `${i.tip.trim()}${nounHint(noun)}` : i.tip;
      return { category, wrong: i.wrong, right: i.right, tip: tip.slice(0, 260) };
    }).slice(0, 4);
    const corrected = issues.length && c.corrected && bare(c.corrected) !== bare(item.answer) ? c.corrected : void 0;
    const alternative = c.meaning === "correct" && c.alternative && ![item.answer, item.model, corrected ?? ""].some((s) => bare(s) === bare(c.alternative)) ? c.alternative : void 0;
    out[c.id] = {
      meaning: c.meaning,
      issues,
      corrected: corrected?.slice(0, 300),
      alternative: alternative?.slice(0, 200),
      comment: c.comment?.slice(0, 200) || void 0,
      v: CHECK_VERSION
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
  CHECK_VERSION,
  POST,
  cleanChecks,
  itemsFor,
  systemPrompt,
  userPrompt
};
