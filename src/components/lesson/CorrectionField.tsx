import { useState, type FormEvent } from 'react';
import { VERDICT_LABEL } from '../../lib/grade';
import { gradeTarget, targetAnswer } from '../../lib/gradeTarget';
import type { Target } from '../../types';
import shared from './shared.module.css';
import styles from './Comparison.module.css';

interface Props {
  target: Target;
  /** The accepted correction, once the learner got it right */
  saved: string;
  disabled: boolean;
  onCorrect: (value: string) => void;
}

/**
 * Type the right answer and press Check (or Enter). Right: the field becomes a
 * finished line. Not yet: say what's off and let them try again.
 */
export default function CorrectionField({ target, saved, disabled, onCorrect }: Props) {
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const answer = targetAnswer(target);
  const id = `fix-${target.id}`;

  if (saved) {
    return (
      <p className={styles.correctedLine} role="status">
        <span className={styles.fixed} aria-hidden="true">
          ✓
        </span>
        <span>
          Corrected: <strong lang="es">{saved}</strong>
        </span>
      </p>
    );
  }

  function check(e: FormEvent) {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    const grade = gradeTarget(target, value);
    if (grade.verdict === 'correct') {
      onCorrect(value);
      return;
    }
    setFeedback(
      grade.verdict === 'incorrect' || grade.verdict === 'form'
        ? `Not yet. Copy it exactly: «${answer}».`
        : `${VERDICT_LABEL[grade.verdict]}. Copy it exactly: «${answer}».`,
    );
  }

  return (
    <form className={styles.correctionForm} onSubmit={check}>
      <label className={styles.correctionLabel} htmlFor={id}>
        Type «{answer}»
      </label>
      <div className={styles.correctionRow}>
        <input
          id={id}
          className={`${shared.input} ${styles.correctionInput}`}
          lang="es"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={disabled}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setFeedback(null);
          }}
        />
        <button type="submit" className={`btn ${styles.checkBtn}`} disabled={disabled || !draft.trim()}>
          Check
        </button>
      </div>
      {feedback && (
        <p className={styles.correctionFeedback} role="alert">
          {feedback}
        </p>
      )}
    </form>
  );
}
