import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { FocusList } from '../components/Feedback';
import { areaFor, focusCollector } from '../lib/focus';
import {
  bestFix,
  buildRound,
  gradeProofread,
  mistakeSpans,
  resolves,
  tokenize,
  type Edit,
  type ProofreadItem,
  type ProofreadResult,
  type Token,
} from '../lib/proofread';
import { useLearner } from '../store/learnerStore';
import styles from './Proofread.module.css';

/**
 * Proofread: a round of sentences, one at a time. The learner taps or drags
 * over wrong words, which turn into fields to fix them in place, or says
 * there's no mistake. Feedback comes right after each sentence.
 */
export default function Proofread() {
  const { state, dispatch } = useLearner();
  const [round, setRound] = useState(() => {
    const r = buildRound(state);
    return r.length ? r : buildRound(state, 6, true);
  });
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ProofreadResult[]>([]);
  const finished = index >= round.length;

  function record(result: ProofreadResult) {
    setResults((r) => [...r, result]);
    if (resolves(result.verdict)) dispatch({ type: 'resolveProofread', id: round[index].id });
  }

  function again() {
    const r = buildRound(state);
    setRound(r.length ? r : buildRound(state, 6, true));
    setIndex(0);
    setResults([]);
  }

  return (
    <div className={styles.page}>
      <BackLink to="/exercises" label="Exercises" />
      {!finished ? (
        <>
          <div className={styles.head}>
            <h1 className={styles.h1}>Proofread</h1>
            <span className={styles.progress}>
              {index + 1} of {round.length}
            </span>
          </div>
          <p className={styles.lead}>
            Is there a mistake? Tap a wrong word, or drag across several, and type the fix in its place. There can be more
            than one mistake, or none.
          </p>
          <Sentence
            key={round[index].id + index}
            item={round[index]}
            result={results[index]}
            onResult={record}
            onNext={() => {
              setIndex((i) => i + 1);
              window.scrollTo({ top: 0 });
            }}
            last={index + 1 === round.length}
          />
        </>
      ) : (
        <RoundSummary round={round} results={results} onAgain={again} />
      )}
    </div>
  );
}

// ---------- One sentence ----------

function Sentence({
  item,
  result,
  onResult,
  onNext,
  last,
}: {
  item: ProofreadItem;
  result?: ProofreadResult;
  onResult: (r: ProofreadResult) => void;
  onNext: () => void;
  last: boolean;
}) {
  const tokens = tokenize(item.sentence);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [drag, setDrag] = useState<{ anchor: number; current: number } | null>(null);
  const inputs = useRef(new Map<number, HTMLInputElement>());
  const [focusStart, setFocusStart] = useState<number | null>(null);

  useEffect(() => {
    if (focusStart !== null) inputs.current.get(focusStart)?.focus();
  }, [focusStart, edits]);

  /** Turn tokens a..b into one field, merging with fields it touches. */
  function select(a: number, b: number) {
    let start = Math.min(a, b);
    let end = Math.max(a, b);
    const kept: Edit[] = [];
    let text = '';
    for (const e of edits) {
      if (e.end >= start - 1 && e.start <= end + 1 && touches(tokens, e, start, end)) {
        start = Math.min(start, e.start);
        end = Math.max(end, e.end);
        text = text || e.text;
      } else kept.push(e);
    }
    setEdits([...kept, { start, end, text }].sort((x, y) => x.start - y.start));
    setFocusStart(start);
  }

  // Drag across words: follow the pointer, select on release. Refs keep the
  // window listeners reading the latest drag and edits.
  const dragRef = useRef(drag);
  const selectRef = useRef(select);
  useEffect(() => {
    dragRef.current = drag;
    selectRef.current = select;
  });
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: globalThis.PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-token]');
      if (el) setDrag((d) => (d ? { ...d, current: Number(el.dataset.token) } : d));
    };
    const up = () => {
      const d = dragRef.current;
      setDrag(null);
      if (d) selectRef.current(d.anchor, d.current);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging]);

  const dragged = (i: number) => drag && i >= Math.min(drag.anchor, drag.current) && i <= Math.max(drag.anchor, drag.current);
  const submitted = Boolean(result);
  const hasFix = edits.some((e) => e.text.trim());

  function onWordDown(e: PointerEvent, i: number) {
    if (submitted) return;
    e.preventDefault();
    setDrag({ anchor: i, current: i });
  }

  function onWordKey(e: KeyboardEvent, i: number) {
    if (submitted || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    select(i, i);
  }

  function update(start: number, text: string) {
    setEdits((list) => list.map((e) => (e.start === start ? { ...e, text } : e)));
  }

  function remove(start: number) {
    setEdits((list) => list.filter((e) => e.start !== start));
  }

  // What to draw: each field (a selected run of tokens) or a single token.
  const pieces: ({ edit: Edit } | { token: number })[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const edit = submitted ? undefined : edits.find((e) => e.start === i);
    if (edit) {
      pieces.push({ edit });
      i = edit.end;
    } else pieces.push({ token: i });
  }

  const parts = pieces.map((piece) => {
    if ('edit' in piece) {
      const { edit } = piece;
      const original = tokens
        .slice(edit.start, edit.end + 1)
        .map((x) => x.text)
        .join('');
      return (
        <span key={`e${edit.start}`} className={styles.field}>
          <input
            ref={(el) => {
              if (el) inputs.current.set(edit.start, el);
              else inputs.current.delete(edit.start);
            }}
            className={styles.fieldInput}
            lang="es"
            value={edit.text}
            placeholder={original}
            aria-label={`Fix for “${original}”`}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{ width: `${Math.max(original.length, edit.text.length, 2) + 1.5}ch` }}
            onChange={(e) => update(edit.start, e.target.value)}
            onBlur={() => {
              // A field left empty goes back to the original words.
              if (!edit.text.trim()) setTimeout(() => remove(edit.start), 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') remove(edit.start);
            }}
          />
          <button
            type="button"
            className={styles.undo}
            aria-label={`Put back “${original}”`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => remove(edit.start)}
          >
            ×
          </button>
        </span>
      );
    }
    const i = piece.token;
    const t = tokens[i];
    if (t.kind === 'word' && !submitted) {
      return (
        <span
          key={i}
          role="button"
          tabIndex={0}
          data-token={i}
          className={`${styles.word} ${dragged(i) ? styles.dragging : ''}`}
          onPointerDown={(e) => onWordDown(e, i)}
          onKeyDown={(e) => onWordKey(e, i)}
        >
          {t.text}
        </span>
      );
    }
    return (
      <span key={i} data-token={t.kind === 'word' ? i : undefined}>
        {t.text}
      </span>
    );
  });

  return (
    <div className={styles.card}>
      {item.mine && <p className={styles.mine}>You wrote this: {item.mine.from}</p>}
      {!submitted ? (
        <>
          <p className={styles.sentence} lang="es">
            {parts}
          </p>
          <div className={styles.actions}>
            <button type="button" className="btn btn-quiet" onClick={() => onResult(gradeProofread(item, tokens, 'no-mistake'))}>
              No mistake
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!hasFix}
              onClick={() => onResult(gradeProofread(item, tokens, edits.filter((e) => e.text.trim())))}
            >
              Submit
            </button>
          </div>
          {!hasFix && edits.length > 0 && <p className={styles.hint}>Type the fix in the field, or × to put the words back.</p>}
        </>
      ) : (
        <Feedback item={item} tokens={tokens} result={result!} onNext={onNext} last={last} />
      )}
    </div>
  );
}

/** Does an existing field sit inside or right next to the new selection (spaces between count as next to)? */
function touches(tokens: Token[], e: Edit, start: number, end: number): boolean {
  if (e.end >= start && e.start <= end) return true;
  const between = (a: number, b: number) => tokens.slice(a + 1, b).every((t) => t.kind === 'space');
  return (e.end < start && between(e.end, start)) || (e.start > end && between(end, e.start));
}

// ---------- Feedback ----------

const VERDICT: Record<ProofreadResult['verdict'], { text: string; tone: 'good' | 'warn' | 'bad' }> = {
  right: { text: 'Right: there’s no mistake here.', tone: 'good' },
  fixed: { text: 'Fixed.', tone: 'good' },
  almost: { text: 'Fixed, apart from the accents.', tone: 'warn' },
  found: { text: 'You found the mistake, but the fix isn’t right yet.', tone: 'warn' },
  partly: { text: 'You found some of the mistakes, not all.', tone: 'warn' },
  missed: { text: 'There was a mistake here.', tone: 'bad' },
  changed: { text: 'This one was already correct.', tone: 'bad' },
};

/** The sentence with its words marked: mistakes in red (found or not). */
function Marked({ text, spans, found }: { text: string; spans: number[][]; found?: boolean[] }) {
  const tokens = tokenize(text);
  // Each word's position among the words, as mistakeSpans counts them.
  const wordIndex = tokens.map((_, i) => tokens.slice(0, i + 1).filter((t) => t.kind === 'word').length - 1);
  return (
    <span lang="es">
      {tokens.map((t, i) => {
        if (t.kind !== 'word') return <span key={i}>{t.text}</span>;
        const s = spans.findIndex((span) => span.includes(wordIndex[i]));
        if (s < 0) return <span key={i}>{t.text}</span>;
        return (
          <mark key={i} className={`${styles.mistake} ${found?.[s] ? styles.found : ''}`}>
            {t.text}
          </mark>
        );
      })}
    </span>
  );
}

function Feedback({
  item,
  result,
  onNext,
  last,
}: {
  item: ProofreadItem;
  tokens: Token[];
  result: ProofreadResult;
  onNext: () => void;
  last: boolean;
}) {
  const v = VERDICT[result.verdict];
  const spans = mistakeSpans(item);
  const fix = bestFix(item, result.result);
  const edited = result.result !== item.sentence;
  const n = spans.length;
  return (
    <div className={styles.feedback}>
      <p className={`${styles.verdict} ${styles[v.tone]}`}>
        <strong>{v.text}</strong>
        {result.verdict === 'partly' && (
          <span>
            {' '}
            {result.found.filter(Boolean).length} of {n}.
          </span>
        )}
      </p>
      <dl className={styles.lines}>
        <div>
          <dt>The sentence</dt>
          <dd className={styles.sentenceSmall}>
            <Marked text={item.sentence} spans={spans} found={result.found} />
          </dd>
        </div>
        {edited && (
          <div>
            <dt>Your version</dt>
            <dd className={styles.sentenceSmall} lang="es">
              <span className={styles[resolves(result.verdict) ? 'good' : 'bad']} aria-hidden="true">
                {resolves(result.verdict) ? '✓ ' : '✗ '}
              </span>
              {result.result}
            </dd>
          </div>
        )}
        {fix && result.verdict !== 'fixed' && (
          <div>
            <dt>Corrected</dt>
            <dd className={styles.sentenceSmall} lang="es">
              <span className={styles.good} aria-hidden="true">
                ✓{' '}
              </span>
              {fix}
            </dd>
          </div>
        )}
      </dl>
      {n > 0 && result.verdict !== 'fixed' && (
        <p className={styles.legend}>
          <mark className={`${styles.mistake} ${styles.found}`}>Underlined</mark>: mistakes you found.{' '}
          <mark className={styles.mistake}>Highlighted</mark>: mistakes you missed.
        </p>
      )}
      <p className={styles.note}>{item.note}</p>
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {last ? 'See how it went →' : 'Next sentence →'}
        </button>
      </div>
    </div>
  );
}

// ---------- End of the round ----------

function RoundSummary({ round, results, onAgain }: { round: ProofreadItem[]; results: ProofreadResult[]; onAgain: () => void }) {
  const right = results.filter((r) => resolves(r.verdict)).length;
  const focus = focusCollector();
  round.forEach((item, i) => {
    const r = results[i];
    if (!r || resolves(r.verdict)) return;
    const area = item.fixes.length ? areaFor(item.area) : undefined;
    if (area) focus.add(area, { wrong: item.sentence, right: bestFix(item, r.result) ?? item.sentence });
  });
  const top = focus.top();
  return (
    <section className={styles.summary}>
      <h1 className={styles.h1}>Round done</h1>
      <p className={styles.lead}>
        {right} of {round.length} right. The ones you got right won’t come back; the others will, so you can try them again.
      </p>
      {top.length > 0 && (
        <div className={styles.focusBox}>
          <h2 className={styles.h2}>{top.length === 1 ? 'One thing to work on' : `${top.length} things to work on`}</h2>
          <FocusList focus={top} />
        </div>
      )}
      <div className={styles.actions}>
        <Link to="/exercises" className="btn btn-quiet">
          Back to exercises
        </Link>
        <button type="button" className="btn btn-primary" onClick={onAgain}>
          Another round
        </button>
      </div>
    </section>
  );
}
