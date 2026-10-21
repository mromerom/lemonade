import { Link } from 'react-router-dom';
import { gradeAnswer, normalize, stripAccents, VERDICT_LABEL, type Verdict } from '../../lib/grade';
import { tokenize } from '../../lib/tokenize';
import { useLearner } from '../../store/learnerStore';
import type { ComprehensionQuestion, LessonProgress, Text } from '../../types';
import shared from './shared.module.css';
import styles from './Comparison.module.css';

interface Props {
  text: Text;
  lesson: LessonProgress;
}

const VERDICT_EXPLAIN: Record<Exclude<Verdict, 'correct'>, string> = {
  accent: 'You remembered the right word — just the accent marks are off.',
  typo: 'You remembered the right word, but it looks mistyped.',
  incorrect: "This one didn't stick yet.",
};

export default function Comparison({ text, lesson }: Props) {
  const { dispatch } = useLearner();
  const finished = lesson.stage === 'done';

  const rows = text.questions.map((q) => {
    const guess = q.options.find((o) => o.id === lesson.preAnswers[q.id]);
    const guessedRight = lesson.preAnswers[q.id] === q.correctOptionId;
    const typed = lesson.postAnswers[q.id]?.trim() ?? '';
    const verdict = typed ? gradeAnswer(typed, q.keywordSets) : 'incorrect';
    const correction = lesson.corrections[q.id] ?? '';
    const corrected = verdict === 'correct' || gradeAnswer(correction, q.keywordSets) === 'correct';
    return { q, guess, guessedRight, typed, verdict, correction, corrected };
  });

  const before = rows.filter((r) => r.guessedRight).length;
  const after = rows.filter((r) => r.verdict === 'correct').length;
  const slips = rows.filter((r) => r.verdict === 'accent' || r.verdict === 'typo').length;
  const pending = rows.filter((r) => !r.corrected).length;

  function finish() {
    dispatch({
      type: 'completeLesson',
      textId: text.id,
      missedQuestionIds: rows.filter((r) => r.verdict !== 'correct').map((r) => r.q.id),
    });
  }

  return (
    <section className={shared.stack} aria-labelledby="compare-heading">
      <h2 id="compare-heading" className="visually-hidden">
        Compare before and after
      </h2>

      <div className={styles.summary}>
        <div className={styles.score}>
          <span className={styles.scoreLabel}>Guessed before reading</span>
          <span className={styles.scoreValue}>
            {before}
            <small>/{rows.length}</small>
          </span>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
        <div className={styles.score}>
          <span className={styles.scoreLabel}>Recalled after reading</span>
          <span className={styles.scoreValue}>
            {after}
            <small>/{rows.length}</small>
          </span>
          {slips > 0 && (
            <span className={styles.scoreNote}>
              +{slips} with a small slip
            </span>
          )}
        </div>
      </div>

      {!finished && pending > 0 && (
        <div className={shared.note}>
          <div>
            <p className={shared.noteTitle}>Type out each correct answer.</p>
            <p>
              Writing the correction yourself, with the passage in front of you, does more than
              just reading it. Missed questions will come back in a few days.
            </p>
          </div>
        </div>
      )}

      <ol className={shared.questions}>
        {rows.map((r, i) => (
          <li key={r.q.id} className={shared.question}>
            <p className={shared.prompt} lang="es">
              <span className={shared.number}>{i + 1}.</span>
              {r.q.prompt}
            </p>
            <p className={shared.promptEn}>{r.q.promptEn}</p>

            <dl className={styles.answers}>
              <div>
                <dt>Your guess</dt>
                <dd>
                  <Mark ok={r.guessedRight} />
                  <span lang="es">{r.guess?.text ?? '—'}</span>
                </dd>
              </div>
              <div>
                <dt>From memory</dt>
                <dd>
                  <Mark ok={r.verdict === 'correct'} partial={r.verdict === 'accent' || r.verdict === 'typo'} />
                  <span lang="es">{r.typed || <em className={styles.blank}>left blank</em>}</span>
                </dd>
              </div>
            </dl>

            <p className={`${styles.verdict} ${styles[r.verdict]}`}>
              {VERDICT_LABEL[r.verdict]}
              {r.verdict !== 'correct' && <span> — {VERDICT_EXPLAIN[r.verdict]}</span>}
            </p>

            {r.verdict !== 'correct' && (
              <>
                <blockquote className={styles.evidence} lang="es">
                  <Evidence text={text} question={r.q} />
                </blockquote>
                <p className={styles.model}>
                  Answer: <strong lang="es">{r.q.answer}</strong>
                </p>
                <label className={styles.correctionLabel} htmlFor={`fix-${r.q.id}`}>
                  Type the correct answer
                </label>
                <div className={styles.correctionRow}>
                  <input
                    id={`fix-${r.q.id}`}
                    className={`${shared.input} ${styles.correctionInput}`}
                    lang="es"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={finished}
                    value={r.correction}
                    onChange={(e) =>
                      dispatch({
                        type: 'setCorrection',
                        textId: text.id,
                        questionId: r.q.id,
                        text: e.target.value,
                      })
                    }
                  />
                  {r.corrected && (
                    <span className={styles.fixed} role="status">
                      ✓
                    </span>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ol>

      <div className={shared.actions}>
        {finished ? (
          <>
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
          </>
        ) : (
          <>
            <span className={shared.hint}>
              {pending > 0 ? `${pending} correction${pending === 1 ? '' : 's'} to go` : 'All corrected'}
            </span>
            <button type="button" className="btn btn-primary" disabled={pending > 0} onClick={finish}>
              Finish reading
            </button>
          </>
        )}
      </div>
    </section>
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

/** The paragraph holding the answer, with the answer's keywords highlighted. */
function Evidence({ text, question }: { text: Text; question: ComprehensionQuestion }) {
  const targets = new Set(
    question.keywordSets.flat().flatMap((k) => normalize(k).split(' ').map(stripAccents)),
  );
  const tokens = tokenize(text.paragraphs[question.evidenceParagraph].es);
  return (
    <>
      {tokens.map((t, i) =>
        t.kind === 'word' && targets.has(stripAccents(t.key)) ? (
          <mark key={i}>{t.text}</mark>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </>
  );
}
