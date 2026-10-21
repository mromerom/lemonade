import { useState } from 'react';
import { useLearner } from '../../store/learnerStore';
import type { LessonProgress, Text } from '../../types';
import shared from './shared.module.css';

interface Props {
  text: Text;
  lesson: LessonProgress;
  onDone: () => void;
}

/**
 * Recall: the same questions, typed from memory with the text hidden.
 * Producing an answer is harder than recognizing one, which is the point.
 */
export default function PostQuestions({ text, lesson, onDone }: Props) {
  const { dispatch } = useLearner();
  const [showEnglish, setShowEnglish] = useState(false);
  const blank = text.questions.filter((q) => !lesson.postAnswers[q.id]?.trim()).length;

  return (
    <section className={shared.stack} aria-labelledby="post-heading">
      <h2 id="post-heading" className="visually-hidden">
        Recall from memory
      </h2>
      <div className={shared.note}>
        <div>
          <p className={shared.noteTitle}>Now answer from memory.</p>
          <p>
            The text is hidden on purpose — pulling an answer out of memory makes it stick. Short
            answers in Spanish are fine. If you can't remember, leave it blank.
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
            <label htmlFor={`post-${q.id}`} className={shared.prompt} lang="es">
              <span className={shared.number}>{i + 1}.</span>
              {q.prompt}
            </label>
            {showEnglish && <p className={shared.promptEn}>{q.promptEn}</p>}
            <input
              id={`post-${q.id}`}
              className={shared.input}
              lang="es"
              autoComplete="off"
              autoCapitalize="sentences"
              spellCheck={false}
              value={lesson.postAnswers[q.id] ?? ''}
              onChange={(e) =>
                dispatch({
                  type: 'setPostAnswer',
                  textId: text.id,
                  questionId: q.id,
                  answer: e.target.value,
                })
              }
            />
          </li>
        ))}
      </ol>

      <div className={shared.actions}>
        <span className={shared.hint}>
          {blank > 0 ? `${blank} left blank` : 'All answered'}
        </span>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          See how I did →
        </button>
      </div>
    </section>
  );
}
