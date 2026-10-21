import { useState } from 'react';
import { useLearner } from '../../store/learnerStore';
import type { LessonProgress, Text } from '../../types';
import shared from './shared.module.css';
import styles from './PreQuestions.module.css';

interface Props {
  text: Text;
  lesson: LessonProgress;
  onDone: () => void;
}

/**
 * Pretest: learners guess before reading and get no feedback yet.
 * Guessing first primes attention to the answers during reading.
 */
export default function PreQuestions({ text, lesson, onDone }: Props) {
  const { dispatch } = useLearner();
  const [showEnglish, setShowEnglish] = useState(false);
  const answered = text.questions.filter((q) => lesson.preAnswers[q.id]).length;
  const allAnswered = answered === text.questions.length;

  return (
    <section className={shared.stack} aria-labelledby="pre-heading">
      <h2 id="pre-heading" className="visually-hidden">
        Guess before you read
      </h2>
      <div className={shared.note}>
        <div>
          <p className={shared.noteTitle}>Guess first — you haven't read it yet.</p>
          <p>
            Wrong guesses are expected. Guessing now helps you notice the answers while you read.
            You'll see how you did at the end.
          </p>
        </div>
      </div>

      <div className={shared.toolbar}>
        <label className={shared.toggle}>
          <input
            type="checkbox"
            checked={showEnglish}
            onChange={(e) => setShowEnglish(e.target.checked)}
          />
          Show questions in English
        </label>
      </div>

      <ol className={shared.questions}>
        {text.questions.map((q, i) => (
          <li key={q.id} className={shared.question}>
            <fieldset className={styles.fieldset}>
              <legend className={shared.prompt} lang="es">
                <span className={shared.number}>{i + 1}.</span>
                {q.prompt}
              </legend>
              {showEnglish && <p className={shared.promptEn}>{q.promptEn}</p>}
              <div className={styles.options}>
                {q.options.map((o) => (
                  <label key={o.id} className={styles.option}>
                    <input
                      type="radio"
                      name={q.id}
                      value={o.id}
                      checked={lesson.preAnswers[q.id] === o.id}
                      onChange={() =>
                        dispatch({
                          type: 'setPreAnswer',
                          textId: text.id,
                          questionId: q.id,
                          optionId: o.id,
                        })
                      }
                    />
                    <span lang="es">{o.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className={shared.actions}>
        <span className={shared.hint}>
          {answered} of {text.questions.length} answered
        </span>
        <button type="button" className="btn btn-primary" disabled={!allAnswered} onClick={onDone}>
          Start reading →
        </button>
      </div>
    </section>
  );
}
