import { readingQuestions } from '../../lib/textWords';
import { useLearner } from '../../store/learnerStore';
import type { LessonProgress, LessonStage, Target, Text } from '../../types';
import styles from './DevBar.module.css';

const STAGES: { stage: LessonStage; label: string }[] = [
  { stage: 'pre', label: 'Guess' },
  { stage: 'read', label: 'Read' },
  { stage: 'post', label: 'Recall' },
  { stage: 'compare', label: 'Compare' },
  { stage: 'done', label: 'Finished' },
];

/** A typed answer with two letters swapped, to exercise the typo verdict. */
function withTypo(word: string): string {
  if (word.length < 4) return word + word.at(-1);
  const i = Math.floor(word.length / 2) - 1;
  return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
}

/** A wrong but interesting typed answer: a trap, a wrong verb form, or another person. */
function wrongAnswer(t: Target): string {
  const trap = Object.keys(t.post.traps ?? {})[0];
  if (trap) return trap;
  if (t.kind === 'form') {
    const tense = Object.keys(t.wrongForms ?? {})[0];
    if (tense) return tense;
    const other = Object.entries(t.forms).find(([p, f]) => p !== t.person && f !== t.post.accept[0]);
    if (other) return other[1]!;
  }
  return 'no sé';
}

/** Testing tools: jump to any step and fill in a mix of right and wrong answers. */
export default function DevBar({ text, lesson }: { text: Text; lesson: LessonProgress }) {
  const { dispatch } = useLearner();

  function fillSample() {
    // Reading questions: right, a small slip, and wrong, in turn.
    readingQuestions(text).forEach((q, i) => {
      const model = q.answer.es;
      const slip = model.replace(/\b(un|una|el|la)\b/i, (a) => ({ un: 'una', una: 'un', el: 'la', la: 'el' })[a.toLowerCase()] ?? a);
      const answer = [model, slip === model ? model.toLowerCase().replace(/[.]$/, '') : slip, 'No sé.'][i % 3];
      dispatch({ type: 'setReadingAnswer', textId: text.id, questionId: q.id, answer });
    });
    text.targets.forEach((t, i) => {
      const wrong = t.pre.options.find((o) => o.id !== t.pre.correctOptionId && !t.pre.alsoCorrect?.includes(o.id));
      const optionId = i % 2 === 0 ? t.pre.correctOptionId : (wrong ?? t.pre.options[0]).id;
      dispatch({ type: 'setPreAnswer', textId: text.id, targetId: t.id, optionId });
      // Cycle through right, wrong, typo and blank so every kind of feedback shows up.
      const answer = [t.post.accept[0], wrongAnswer(t), withTypo(t.post.accept[0]), ''][i % 4];
      dispatch({ type: 'setPostAnswer', textId: text.id, targetId: t.id, answer });
    });
  }

  return (
    <div className={styles.bar} role="toolbar" aria-label="Testing tools">
      <span className={styles.label}>Testing</span>
      <div className={styles.group}>
        {STAGES.map(({ stage, label }) => (
          <button
            key={stage}
            type="button"
            className={styles.btn}
            aria-pressed={lesson.stage === stage}
            onClick={() => dispatch({ type: 'setStage', textId: text.id, stage })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.group}>
        <button type="button" className={styles.btn} onClick={fillSample}>
          Fill sample answers
        </button>
        <button type="button" className={styles.btn} onClick={() => dispatch({ type: 'restartLesson', textId: text.id })}>
          Clear answers
        </button>
      </div>
    </div>
  );
}
