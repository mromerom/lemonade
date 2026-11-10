import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalize } from '../../lib/grade';
import {
  correctNote,
  distractorNote,
  gradeTarget,
  isCorrectOption,
  optionsLang,
  optionTag,
  targetLabel,
  type TargetGrade,
} from '../../lib/gradeTarget';
import { findEvidence } from '../../lib/textWords';
import { focusAreas, recommendText } from '../../lib/focus';
import { plainText } from '../../lib/markup';
import {
  checkedInApp,
  checkShort,
  fetchAiChecks,
  isCorrectCheck,
  isCurrent,
  needsAiCheck,
  sameWords,
} from '../../lib/readingCheck';
import { tokenize } from '../../lib/tokenize';
import { useLearner } from '../../store/learnerStore';
import type { LessonProgress, Paragraph, QuestionOption, ReadingCheck, ReadingQuestion, Target, Text } from '../../types';
import { targetTerm } from '../../lib/wordBank';
import CorrectionField from './CorrectionField';
import TargetPrompt from './TargetPrompt';
import shared from './shared.module.css';
import styles from './Comparison.module.css';

interface Props {
  text: Text;
  lesson: LessonProgress;
}

/**
 * A wrong-form label can be a whole note: "present ("I decide"). The decision
 * already happened this morning". The tag shows just "present"; the rest is
 * shown as a note under the answer.
 */
function shortTense(label?: string): string {
  return label?.split(/[.(:]/)[0].trim() ?? '';
}
function tenseNote(label?: string): string | null {
  if (!label) return null;
  // What's left after the tag: 'present ("I decide"). The decision…' → '"I decide". The decision…'
  const rest = label
    .trim()
    .slice(shortTense(label).length)
    .replace(/^\s*\((.*?)\)/, '$1')
    .replace(/^[\s.:]+/, '')
    .trim();
  return rest ? rest.replace(/([^.!?])$/, '$1.') : null;
}

/** Short labels for what's off in a typed answer: shown as tags under it. */
function answerTags(grade: TargetGrade): { text: string; bad: boolean }[] {
  switch (grade.verdict) {
    case 'accent':
      return [{ text: 'accent', bad: false }];
    case 'typo':
      return [{ text: 'typo', bad: false }];
    case 'spelling':
      // Common mix-ups (b/v, h, ll/y…) are real spelling mistakes, so they're marked wrong.
      return [...new Set(grade.confusions.map((c) => c.label))].map((text) => ({ text, bad: true }));
    case 'form':
      return [{ text: grade.usedPerson ? `${grade.usedPerson} form` : shortTense(grade.usedTense) || 'wrong form', bad: true }];
    default:
      return [];
  }
}

type Slide =
  | { kind: 'reading'; q: ReadingQuestion; n: number; part: string; paragraph: Paragraph }
  | { kind: 'word'; n: number }
  | { kind: 'summary' };

const MEANING_LABEL = { correct: 'Right idea', partly: 'Partly there', incorrect: 'Not what the paragraph says' };

export default function Comparison({ text, lesson }: Props) {
  const { state, dispatch } = useLearner();
  const finished = lesson.stage === 'done';
  const answers = lesson.readingAnswers ?? {};
  const savedChecks = lesson.readingChecks ?? {};
  const inApp = checkedInApp(text);

  // ---------- Reading questions ----------

  const narrator = text.retelling.narrator;
  const readingSlides: Slide[] = [
    ...text.story.map((p, i) => ({ p, part: `Part 1, paragraph ${i + 1}` })),
    ...text.retelling.paragraphs.map((p, i) => ({ p, part: `Part 2 (${narrator}), paragraph ${i + 1}` })),
  ]
    .filter(({ p }) => p.question)
    .map(({ p, part }, n) => ({ kind: 'reading', q: p.question!, n, part, paragraph: p }));
  const questions = readingSlides.flatMap((s) => (s.kind === 'reading' ? [s.q] : []));

  const checkOf = (q: ReadingQuestion): ReadingCheck | undefined => {
    const answer = answers[q.id] ?? '';
    if (inApp) return checkShort(q, answer);
    const saved = savedChecks[q.id];
    return isCurrent(saved, answer) ? saved : undefined;
  };

  // Longer answers are checked by AI once, when the results open (and again
  // only if an answer changes). If the check can't be reached, the learner
  // compares their answer with the model answer instead.
  const toCheck = needsAiCheck(text, answers, savedChecks).filter((q) => answers[q.id]?.trim());
  const payload = toCheck.length ? JSON.stringify(Object.fromEntries(toCheck.map((q) => [q.id, answers[q.id]]))) : '';
  const [failed, setFailed] = useState('');
  const aiState: 'idle' | 'checking' | 'unavailable' = !payload
    ? failed
      ? 'unavailable'
      : 'idle'
    : failed === payload
      ? 'unavailable'
      : 'checking';
  useEffect(() => {
    if (!payload || finished) return;
    let cancelled = false;
    fetchAiChecks(text.id, JSON.parse(payload) as Record<string, string>)
      .then((checks) => !cancelled && dispatch({ type: 'setReadingChecks', textId: text.id, checks }))
      .catch(() => !cancelled && setFailed(payload));
    return () => {
      cancelled = true;
    };
  }, [payload, finished, text.id, dispatch]);

  const readingChecks = questions.map(checkOf);
  const readingCorrect = readingChecks.filter(isCorrectCheck).length;
  const selfPending = aiState === 'unavailable' ? questions.filter((q) => !checkOf(q)).length : 0;

  // ---------- Words and verb forms ----------

  const rows = text.targets.map((t) => {
    const guess = t.pre.options.find((o) => o.id === lesson.preAnswers[t.id]);
    const guessedRight = isCorrectOption(t, lesson.preAnswers[t.id]);
    const typed = lesson.postAnswers[t.id]?.trim() ?? '';
    const grade = gradeTarget(t, typed);
    // One explanation per kind of mix-up, even if it happened twice.
    const confusions = [...new Map(grade.confusions.map((c) => [c.id, c])).values()];
    const correction = lesson.corrections[t.id] ?? '';
    const corrected = grade.verdict === 'correct' || gradeTarget(t, correction).verdict === 'correct';
    // When the typed answer repeats the guess, the verdict (and its note) covers both.
    const sameAnswer = guess && normalize(guess.text) === normalize(typed);
    const guessNote = sameAnswer ? null : distractorNote(t, guess);
    const why = correctNote(t);
    return { t, guess, guessedRight, guessNote, why, typed, grade, confusions, correction, corrected };
  });

  const before = rows.filter((r) => r.guessedRight).length;
  const after = rows.filter((r) => r.grade.verdict === 'correct').length;
  const pending = rows.filter((r) => !r.corrected).length;

  // ---------- Slides ----------

  const slides: Slide[] = [...readingSlides, ...rows.map((_, n) => ({ kind: 'word' as const, n })), { kind: 'summary' }];
  const last = slides.length - 1;
  // A finished lesson opens on the summary.
  const [index, setIndex] = useState(finished ? last : 0);
  const slide = slides[Math.min(index, last)];
  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(last, i)));
    window.scrollTo({ top: 0 });
  };
  const firstWord = readingSlides.length;

  const focus = focusAreas(
    questions.map((q, i) => ({ check: readingChecks[i], model: q.answer.es })),
    rows.map((r) => ({ target: r.t, grade: r.grade, typed: r.typed })),
  );
  const recommended = focus.length === 0 ? recommendText(state, text) : null;

  function finish() {
    dispatch({
      type: 'completeLesson',
      textId: text.id,
      missedTargetIds: rows.filter((r) => r.grade.verdict !== 'correct').map((r) => r.t.id),
      missedTerms: rows
        .filter((r) => r.grade.verdict !== 'correct')
        .map((r) => targetTerm(r.t))
        .filter((k): k is string => Boolean(k)),
    });
  }

  const section =
    slide.kind === 'reading'
      ? { label: 'Your answers while reading', n: slide.n + 1, of: readingSlides.length }
      : slide.kind === 'word'
        ? { label: 'Words and verb forms', n: slide.n + 1, of: rows.length }
        : { label: 'Summary', n: 0, of: 0 };

  return (
    <section className={styles.slideshow} aria-labelledby="compare-heading">
      <h2 id="compare-heading" className="visually-hidden">
        Your results, one at a time
      </h2>

      <div className={styles.progress} aria-hidden="true">
        {[readingSlides.length, rows.length, 1].map((count, g) => {
          const offset = g === 0 ? 0 : g === 1 ? firstWord : last;
          return (
            <div key={g} className={styles.progressGroup} style={{ flexGrow: count }}>
              {Array.from({ length: count }, (_, i) => (
                <span key={i} className={`${styles.progressDot} ${offset + i <= index ? styles.progressDone : ''}`} />
              ))}
            </div>
          );
        })}
      </div>

      <p className={styles.sectionLabel}>
        {section.label}
        {section.of > 0 && (
          <span className={styles.sectionCount}>
            {section.n} of {section.of}
          </span>
        )}
      </p>

      <div className={styles.slide} key={index}>
        {slide.kind === 'reading' && slide.n === 0 && (
          <p className={styles.sectionIntro}>
            The questions under each paragraph. Your answer, then what to notice about it.
          </p>
        )}
        {slide.kind === 'word' && slide.n === 0 && (
          <p className={styles.sectionIntro}>
            The new words and verb forms: what you guessed before reading, and what you typed after.
          </p>
        )}

        {slide.kind === 'reading' && (
          <ReadingSlide
            slide={slide}
            answer={answers[slide.q.id] ?? ''}
            check={checkOf(slide.q)}
            aiState={inApp ? 'idle' : aiState}
            finished={finished}
            onSelfCheck={(meaning) =>
              dispatch({
                type: 'setReadingChecks',
                textId: text.id,
                checks: {
                  [slide.q.id]: { answer: answers[slide.q.id] ?? '', source: 'self', meaning, issues: [] },
                },
              })
            }
          />
        )}

        {slide.kind === 'word' && <WordSlide text={text} row={rows[slide.n]} n={slide.n} finished={finished} />}

        {slide.kind === 'summary' && (
          <div className={styles.summarySlide}>
            <div className={styles.summary}>
              <div className={styles.score}>
                <span className={styles.scoreLabel}>Questions while reading</span>
                <span className={styles.scoreValue}>
                  {readingCorrect}
                  <small>/{questions.length}</small>
                </span>
              </div>
              <div className={styles.score}>
                <span className={styles.scoreLabel}>Words: guessed before reading</span>
                <span className={styles.scoreValue}>
                  {before}
                  <small>/{rows.length}</small>
                </span>
              </div>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              <div className={styles.score}>
                <span className={styles.scoreLabel}>Typed after reading</span>
                <span className={styles.scoreValue}>
                  {after}
                  <small>/{rows.length}</small>
                </span>
              </div>
            </div>

            {focus.length > 0 ? (
              <div className={styles.focus}>
                <h3 className={styles.focusTitle}>
                  {focus.length === 1 ? 'One thing to focus on' : `${focus.length} things to focus on`}
                </h3>
                <ul className={styles.focusList}>
                  {focus.map((f) => (
                    <li key={f.area}>
                      <strong>{f.title}.</strong> {f.body}
                      {f.examples.length > 0 && (
                        <span className={styles.focusExamples}>
                          {f.examples.map((e, i) => (
                            <WrongRight key={i} wrong={e.wrong} right={e.right} />
                          ))}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={styles.focus}>
                <h3 className={styles.focusTitle}>Everything right</h3>
                {recommended ? (
                  <p>
                    Next, try <Link to={`/read/${recommended.text.id}`} lang="es">{recommended.text.title}</Link> (
                    {recommended.text.level}): it has {recommended.newWords} words you haven’t seen yet.
                  </p>
                ) : (
                  <p>You’ve read every reading so far. New ones are on the way.</p>
                )}
              </div>
            )}

            {!finished && (pending > 0 || selfPending > 0 || aiState === 'checking') && (
              <div className={shared.note}>
                <div>
                  <p className={shared.noteTitle}>Before you finish</p>
                  <ul className={styles.todo}>
                    {aiState === 'checking' && <li>Your answers to the questions are still being checked.</li>}
                    {selfPending > 0 && (
                      <li>
                        Compare {selfPending} of your answers with the model answer.{' '}
                        <button type="button" className={styles.linkBtn} onClick={() => go(firstPendingSelf())}>
                          Go to the first one
                        </button>
                      </li>
                    )}
                    {pending > 0 && (
                      <li>
                        Type out {pending} correct {pending === 1 ? 'answer' : 'answers'}: writing it yourself does more
                        than reading it.{' '}
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => go(firstWord + rows.findIndex((r) => !r.corrected))}
                        >
                          Go to the first one
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.slideNav}>
        <button type="button" className="btn btn-quiet" disabled={index === 0} onClick={() => go(index - 1)}>
          ← Back
        </button>
        {slide.kind !== 'summary' ? (
          <button type="button" className="btn btn-primary" onClick={() => go(index + 1)}>
            {index + 1 === last ? 'See the summary →' : index + 1 === firstWord ? 'On to the words →' : 'Next →'}
          </button>
        ) : finished ? (
          <span className={styles.navEnd}>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => dispatch({ type: 'restartLesson', textId: text.id })}
            >
              Start this reading over
            </button>
            <Link to="/" className="btn btn-primary">
              Back to library
            </Link>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending > 0 || selfPending > 0 || aiState === 'checking'}
            onClick={finish}
          >
            Finish reading
          </button>
        )}
      </div>
    </section>
  );

  function firstPendingSelf(): number {
    return readingSlides.findIndex((s) => s.kind === 'reading' && !checkOf(s.q));
  }
}

function ReadingSlide({
  slide,
  answer,
  check,
  aiState,
  finished,
  onSelfCheck,
}: {
  slide: Extract<Slide, { kind: 'reading' }>;
  answer: string;
  check: ReadingCheck | undefined;
  aiState: 'idle' | 'checking' | 'unavailable';
  finished: boolean;
  onSelfCheck: (meaning: 'correct' | 'incorrect') => void;
}) {
  const [showParagraph, setShowParagraph] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const { q } = slide;
  const correct = isCorrectCheck(check);
  const slip = check && !correct && check.meaning === 'correct';
  // When the answer is right, show a different way to say it: the AI's
  // alternative, or the model answer if it isn't what the learner wrote.
  const other = correct
    ? (check?.alternative ?? (sameWords(q.answer.es, answer) ? null : q.answer.es))
    : q.answer.es;

  return (
    <div className={shared.question}>
      <span className={shared.kind}>{slide.part}</span>
      <span className={shared.prompt} lang="es">
        {q.question.es}
      </span>
      <div className={styles.inlineActions}>
        <button type="button" className={styles.linkBtn} aria-expanded={showEn} onClick={() => setShowEn((v) => !v)}>
          {showEn ? 'Hide translation' : 'Translate'}
        </button>
        <button
          type="button"
          className={styles.linkBtn}
          aria-expanded={showParagraph}
          onClick={() => setShowParagraph((v) => !v)}
        >
          {showParagraph ? 'Hide the paragraph' : 'Show the paragraph'}
        </button>
      </div>
      {showEn && <p className={shared.promptEn}>{q.question.en}</p>}
      {showParagraph && (
        <p className={styles.paragraphRef} lang="es">
          {plainText(slide.paragraph.es)}
        </p>
      )}

      <dl className={styles.answers}>
        <div>
          <dt>Your answer</dt>
          <dd>
            {check && <Mark ok={correct} partial={slip || check.meaning === 'partly'} />}
            <span lang="es">{answer || <em className={styles.blank}>left blank</em>}</span>
          </dd>
        </div>
      </dl>

      {!check && aiState === 'checking' && <p className={styles.checking}>Checking your answer…</p>}

      {!check && aiState !== 'checking' && (
        <div className={styles.selfCheck}>
          <p>
            The automatic check isn’t available right now, so compare for yourself. A model answer:{' '}
            <span lang="es" className={styles.modelAnswer}>
              {q.answer.es}
            </span>
          </p>
          <p className={styles.selfQuestion}>Does your answer say the same thing?</p>
          <div className={styles.inlineActions}>
            <button type="button" className="btn btn-quiet" disabled={finished} onClick={() => onSelfCheck('correct')}>
              Yes, I got it
            </button>
            <button type="button" className="btn btn-quiet" disabled={finished} onClick={() => onSelfCheck('incorrect')}>
              Not quite
            </button>
          </div>
        </div>
      )}

      {check && (
        <>
          <p className={`${styles.verdict} ${styles[correct ? 'correct' : slip ? 'accent' : 'incorrect']}`}>
            {check.source === 'self'
              ? check.meaning === 'correct'
                ? 'You marked this as right'
                : 'You marked this as not quite'
              : correct
                ? 'Correct'
                : slip
                  ? 'Right idea, with a slip'
                  : MEANING_LABEL[check.meaning]}
            {check.comment && <span>. {check.comment}</span>}
          </p>

          {check.issues.length > 0 && (
            <ul className={styles.issues}>
              {check.issues.map((issue, i) => (
                <li key={i}>
                  <span className={`${styles.tag} ${styles.tagBad}`}>{issue.category}</span>
                  <WrongRight wrong={issue.wrong} right={issue.right} />
                  <span className={styles.issueTip}>{issue.tip}</span>
                </li>
              ))}
            </ul>
          )}

          {check.corrected && (
            <p className={styles.guessNote}>
              <span className={styles.guessNoteLabel}>Your answer, fixed</span>
              <span lang="es">{check.corrected}</span>
            </p>
          )}
          {check.source !== 'self' && other && (
            <p className={styles.guessNote}>
              <span className={styles.guessNoteLabel}>{correct ? 'Another way to say it' : 'A model answer'}</span>
              <span lang="es">{other}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

type Row = {
  t: Target;
  guess: QuestionOption | undefined;
  guessedRight: boolean;
  guessNote: string | null;
  why: { answer: string; note: string } | null;
  typed: string;
  grade: TargetGrade;
  confusions: TargetGrade['confusions'];
  correction: string;
  corrected: boolean;
};

/** A mistake and its fix, marked ✗ and ✓ (no strikethrough, so both stay readable). */
function WrongRight({ wrong, right }: { wrong: string; right: string }) {
  return (
    <span className={styles.wrongRight} lang="es">
      {wrong && (
        <span className={styles.wrongLine}>
          <span className={styles.wrIcon} aria-label="wrong">
            ✗
          </span>
          {wrong}
        </span>
      )}
      <span className={styles.rightLine}>
        <span className={styles.wrIcon} aria-label="right">
          ✓
        </span>
        {right}
      </span>
    </span>
  );
}

function Tags({ tags }: { tags: { text: string; bad: boolean }[] }) {
  if (!tags.length) return null;
  return (
    <span className={styles.tags}>
      {tags.map((tag) => (
        <span key={tag.text} className={`${styles.tag} ${tag.bad ? styles.tagBad : styles.tagWarn}`}>
          {tag.text}
        </span>
      ))}
    </span>
  );
}

/**
 * One word or verb form: each answer with a tag for what's off, then one
 * explanation of the right answer (instead of three notes saying the same).
 */
function WordSlide({ text, row: r, n, finished }: { text: Text; row: Row; n: number; finished: boolean }) {
  const { dispatch } = useLearner();
  const guessLabel = optionTag(r.t, r.guess);
  const guessTag = guessLabel && (r.t.kind === 'form' && guessLabel.endsWith(' form') ? guessLabel : shortTense(guessLabel));
  const guessTenseNote = guessLabel && !guessLabel.endsWith(' form') ? tenseNote(guessLabel) : null;
  const typedTenseNote = r.grade.verdict === 'form' && !r.grade.usedPerson ? tenseNote(r.grade.usedTense) : null;
  const slip = r.grade.verdict === 'accent' || r.grade.verdict === 'typo';
  return (
    <div className={shared.question}>
      <TargetPrompt target={r.t} prompt={r.t.post.prompt} index={n} />
      {r.t.post.promptEn && <p className={shared.promptEn}>{r.t.post.promptEn}</p>}

      <dl className={styles.answers}>
        <div>
          <dt>Your guess</dt>
          <dd>
            <Mark ok={r.guessedRight} />
            <span lang={optionsLang(r.t)}>{r.guess?.text ?? '—'}</span>
            <Tags tags={guessTag ? [{ text: guessTag, bad: true }] : []} />
          </dd>
          {r.guessNote && <p className={styles.answerNote}>{r.guessNote}</p>}
          {guessTenseNote && !r.guessNote && <p className={styles.answerNote}>{guessTenseNote}</p>}
        </div>
        <div>
          <dt>From memory</dt>
          <dd>
            <Mark ok={r.grade.verdict === 'correct'} partial={slip} />
            <span lang="es">{r.typed || <em className={styles.blank}>left blank</em>}</span>
            <Tags tags={answerTags(r.grade)} />
          </dd>
          {r.grade.trapNote && <p className={styles.answerNote}>{r.grade.trapNote}</p>}
          {typedTenseNote && <p className={styles.answerNote}>{typedTenseNote}</p>}
          {r.confusions.map((c) => (
            <p key={c.id} className={styles.answerNote}>
              {c.explain}
            </p>
          ))}
          {r.grade.verdict === 'typo' && (
            <p className={styles.answerNote}>You remembered the word; a letter or two slipped.</p>
          )}
        </div>
      </dl>

      {r.why && (
        <p className={styles.guessNote}>
          <span className={styles.guessNoteLabel}>
            Why «<span lang={optionsLang(r.t)}>{r.why.answer}</span>»
          </span>
          {r.why.note}
        </p>
      )}
      {r.grade.variantNote && (
        <p className={styles.guessNote}>
          <span className={styles.guessNoteLabel}>Good to know</span>
          {r.grade.variantNote}
        </p>
      )}

      {r.grade.verdict !== 'correct' && (
        <>
          <EvidenceBlock text={text} target={r.t} />
          <CorrectionField
            target={r.t}
            saved={r.corrected ? r.correction : ''}
            disabled={finished}
            onCorrect={(value) => dispatch({ type: 'setCorrection', textId: text.id, targetId: r.t.id, text: value })}
          />
        </>
      )}
    </div>
  );
}

function Mark({ ok, partial }: { ok: boolean; partial?: boolean }) {
  const kind = ok ? 'ok' : partial ? 'partial' : 'miss';
  const label = ok ? 'correct' : partial ? 'almost' : 'incorrect';
  return (
    <span className={`${styles.mark} ${styles[kind]}`} aria-label={label}>
      {ok ? '✓' : partial ? '~' : '✗'}
    </span>
  );
}

/** Where the target appears in the reading. Verb forms show the story next to the retelling. */
function EvidenceBlock({ text, target }: { text: Text; target: Target }) {
  const evidence = findEvidence(text, target.match, target.evidenceHint);
  if (!evidence) return null;
  const forms = new Set(target.match.map((m) => m.toLocaleLowerCase('es')));
  const narrator = text.retelling.narrator;

  return (
    <div className={styles.evidence}>
      <p className={styles.evidenceHead}>
        <span lang="es">{targetLabel(target)}</span>
        {target.kind === 'meaning' ? ` = ${target.gloss}` : ` (${target.tense})`}
      </p>
      {target.kind === 'form' && evidence.retelling ? (
        <dl className={styles.evidencePair}>
          <div>
            <dt>Story</dt>
            <dd lang="es">
              <Highlight sentence={evidence.story} forms={forms} />
            </dd>
          </div>
          <div>
            <dt>{narrator} tells it</dt>
            <dd lang="es">
              <Highlight sentence={evidence.retelling} forms={forms} />
            </dd>
          </div>
        </dl>
      ) : (
        <p className={styles.evidenceSentence} lang="es">
          <Highlight sentence={evidence.story} forms={forms} />
        </p>
      )}
    </div>
  );
}

function Highlight({ sentence, forms }: { sentence: string; forms: Set<string> }) {
  return (
    <>
      {tokenize(sentence).map((t, i) =>
        t.kind === 'word' && forms.has(t.key) ? <mark key={i}>{t.text}</mark> : <span key={i}>{t.text}</span>,
      )}
    </>
  );
}
