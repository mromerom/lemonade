import { useState } from 'react';
import { useLearner } from '../../store/learnerStore';
import type { LessonProgress, Text } from '../../types';
import TargetPrompt from './TargetPrompt';
import shared from './shared.module.css';
import styles from './PreQuestions.module.css';

interface Props {
  text: Text;
  lesson: LessonProgress;
  onDone: () => void;
}

/**
 * Pretest: guess the new words and verb forms before reading, with no feedback.
 * Trying first, even wrongly, makes the answers stand out during reading.
 */
export default function PreQuestions({ text, lesson, onDone }: Props) {
  const { dispatch } = useLearner();
  const [showEnglish, setShowEnglish] = useState(false);
  const answered = text.targets.filter((t) => lesson.preAnswers[t.id]).length;
  const allAnswered = answered === text.targets.length;

  return (
    <section className={shared.stack} aria-labelledby="pre-heading">
      <h2 id="pre-heading" className="visually-hidden">
        Guess before you read
      </h2>
      <div className={shared.note}>
        <div>
          <p className={shared.noteTitle}>Guess first. You haven't learned these yet.</p>
          <p>
            These are words and verb forms from the reading. Wrong guesses are expected, and trying
            now helps you notice the answers when you read. You'll see how you did at the end.
          </p>
        </div>
      </div>

      <div className={shared.toolbar}>
        <label className={shared.toggle}>
          <input type="checkbox" checked={showEnglish} onChange={(e) => setShowEnglish(e.target.checked)} />
          Show English help
        </label>
      </div>

      <ol className={shared.questions}>
        {text.targets.map((t, i) => (
          <li key={t.id} className={shared.question}>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>
                <TargetPrompt target={t} prompt={t.pre.prompt} index={i} />
              </legend>
              {showEnglish && t.pre.promptEn && <p className={shared.promptEn}>{t.pre.promptEn}</p>}
              <div className={styles.options}>
                {t.pre.options.map((o) => (
                  <label key={o.id} className={styles.option}>
                    <input
                      type="radio"
                      name={t.id}
                      value={o.id}
                      checked={lesson.preAnswers[t.id] === o.id}
                      onChange={() =>
                        dispatch({ type: 'setPreAnswer', textId: text.id, targetId: t.id, optionId: o.id })
                      }
                    />
                    <span lang={t.kind === 'meaning' ? 'en' : 'es'}>{o.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className={shared.actions}>
        <span className={shared.hint}>
          {answered} of {text.targets.length} answered
        </span>
        <button type="button" className="btn btn-primary" disabled={!allAnswered} onClick={onDone}>
          Start reading →
        </button>
      </div>
    </section>
  );
}
