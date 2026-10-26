import { useState } from 'react';
import { useLearner } from '../../store/learnerStore';
import type { LessonProgress, Text } from '../../types';
import TargetPrompt from './TargetPrompt';
import shared from './shared.module.css';

interface Props {
  text: Text;
  lesson: LessonProgress;
  onDone: () => void;
}

/**
 * Recall: the same words and verb forms, typed from memory with the text hidden.
 * Typing a word is harder than picking it from a list, which is the point.
 */
export default function PostQuestions({ text, lesson, onDone }: Props) {
  const { dispatch } = useLearner();
  const [showEnglish, setShowEnglish] = useState(false);
  const blank = text.targets.filter((t) => !lesson.postAnswers[t.id]?.trim()).length;

  return (
    <section className={shared.stack} aria-labelledby="post-heading">
      <h2 id="post-heading" className="visually-hidden">
        Recall from memory
      </h2>
      <div className={shared.note}>
        <div>
          <p className={shared.noteTitle}>Now type them from memory.</p>
          <p>
            The text is hidden on purpose: pulling a word out of memory makes it stick. Type the
            Spanish word, or the verb form that fills the blank. If you can't remember, leave it blank.
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
            <label htmlFor={`post-${t.id}`}>
              <TargetPrompt target={t} prompt={t.post.prompt} index={i} />
            </label>
            {showEnglish && t.post.promptEn && <p className={shared.promptEn}>{t.post.promptEn}</p>}
            <input
              id={`post-${t.id}`}
              className={shared.input}
              lang="es"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={lesson.postAnswers[t.id] ?? ''}
              onChange={(e) =>
                dispatch({ type: 'setPostAnswer', textId: text.id, targetId: t.id, answer: e.target.value })
              }
            />
          </li>
        ))}
      </ol>

      <div className={shared.actions}>
        <span className={shared.hint}>{blank > 0 ? `${blank} left blank` : 'All answered'}</span>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          See how I did →
        </button>
      </div>
    </section>
  );
}
