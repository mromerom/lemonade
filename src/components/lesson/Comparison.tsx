import { Link } from 'react-router-dom';
import { isSlip, normalize, VERDICT_LABEL, type Verdict } from '../../lib/grade';
import {
  correctNote,
  distractorNote,
  gradeTarget,
  isCorrectOption,
  optionsLang,
  targetAnswer,
  targetLabel,
  type TargetGrade,
} from '../../lib/gradeTarget';
import { findEvidence } from '../../lib/textWords';
import { tokenize } from '../../lib/tokenize';
import { useLearner } from '../../store/learnerStore';
import type { LessonProgress, Target, Text } from '../../types';
import TargetPrompt from './TargetPrompt';
import shared from './shared.module.css';
import styles from './Comparison.module.css';

interface Props {
  text: Text;
  lesson: LessonProgress;
}

function explain(target: Target, grade: TargetGrade, typed: string): string {
  switch (grade.verdict) {
    case 'correct':
      return '';
    case 'accent':
      return 'You remembered the right word. Just the accent marks are off.';
    case 'spelling':
      return 'You remembered the right word. The spelling tripped you up.';
    case 'typo':
      return 'You remembered the right word, but it looks mistyped.';
    case 'form':
      if (target.kind === 'form' && grade.usedPerson) {
        return `«${typed}» is the ${grade.usedPerson} form. With ${target.person}, it's «${targetAnswer(target)}».`;
      }
      if (grade.usedTense) return `«${typed}» is the ${grade.usedTense}. Here it's «${targetAnswer(target)}».`;
      return 'Right verb, wrong form.';
    case 'incorrect':
      if (grade.trapNote) return grade.trapNote;
      return typed ? "This one didn't stick yet." : 'No answer yet. Have another look at it below.';
  }
}

export default function Comparison({ text, lesson }: Props) {
  const { dispatch } = useLearner();
  const finished = lesson.stage === 'done';

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
  const slips = rows.filter((r) => isSlip(r.grade.verdict)).length;
  const pending = rows.filter((r) => !r.corrected).length;

  function finish() {
    dispatch({
      type: 'completeLesson',
      textId: text.id,
      missedTargetIds: rows.filter((r) => r.grade.verdict !== 'correct').map((r) => r.t.id),
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
          <span className={styles.scoreLabel}>Typed after reading</span>
          <span className={styles.scoreValue}>
            {after}
            <small>/{rows.length}</small>
          </span>
          {slips > 0 && <span className={styles.scoreNote}>+{slips} with a small slip</span>}
        </div>
      </div>

      {!finished && pending > 0 && (
        <div className={shared.note}>
          <div>
            <p className={shared.noteTitle}>Type out each correct answer.</p>
            <p>
              Writing the correction yourself, with the example in front of you, does more than just
              reading it. Words and forms you missed will come back in a few days.
            </p>
          </div>
        </div>
      )}

      <ol className={shared.questions}>
        {rows.map((r, i) => (
          <li key={r.t.id} className={shared.question}>
            <TargetPrompt target={r.t} prompt={r.t.post.prompt} index={i} />
            {r.t.post.promptEn && <p className={shared.promptEn}>{r.t.post.promptEn}</p>}

            <dl className={styles.answers}>
              <div>
                <dt>Your guess</dt>
                <dd>
                  <Mark ok={r.guessedRight} />
                  <span lang={optionsLang(r.t)}>{r.guess?.text ?? '—'}</span>
                </dd>
              </div>
              <div>
                <dt>From memory</dt>
                <dd>
                  <Mark ok={r.grade.verdict === 'correct'} partial={isSlip(r.grade.verdict)} />
                  <span lang="es">{r.typed || <em className={styles.blank}>left blank</em>}</span>
                </dd>
              </div>
            </dl>

            {r.guessNote && (
              <p className={styles.guessNote}>
                <span className={styles.guessNoteLabel}>{r.guessedRight ? 'Good to know' : 'About your guess'}</span>
                {r.guessNote}
              </p>
            )}

            <p className={`${styles.verdict} ${styles[verdictClass(r.grade.verdict)]}`}>
              {VERDICT_LABEL[r.grade.verdict]}
              {r.grade.verdict !== 'correct' && <span>. {explain(r.t, r.grade, r.typed)}</span>}
            </p>
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
            {r.confusions.length > 0 && (
              <ul className={styles.confusions}>
                {r.confusions.map((c) => (
                  <li key={c.id}>
                    <span className={styles.confusionTag}>{c.label}</span>
                    {c.explain}
                  </li>
                ))}
              </ul>
            )}

            {r.grade.verdict !== 'correct' && (
              <>
                <EvidenceBlock text={text} target={r.t} />
                <label className={styles.correctionLabel} htmlFor={`fix-${r.t.id}`}>
                  Type «{targetAnswer(r.t)}»
                </label>
                <div className={styles.correctionRow}>
                  <input
                    id={`fix-${r.t.id}`}
                    className={`${shared.input} ${styles.correctionInput}`}
                    lang="es"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={finished}
                    value={r.correction}
                    onChange={(e) =>
                      dispatch({ type: 'setCorrection', textId: text.id, targetId: r.t.id, text: e.target.value })
                    }
                  />
                  {r.corrected && (
                    <span className={styles.fixed} role="status" aria-label="Corrected">
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

function verdictClass(v: Verdict): string {
  return v === 'form' ? 'incorrect' : v;
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
