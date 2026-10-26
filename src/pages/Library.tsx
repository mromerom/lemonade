import { Link } from 'react-router-dom';
import { texts } from '../data/texts';
import { statusCounts } from '../lib/textWords';
import { useLearner } from '../store/learnerStore';
import type { LessonStage } from '../types';
import styles from './Library.module.css';

const STAGE_LABEL: Record<LessonStage, string> = {
  pre: 'Guess',
  read: 'Read',
  post: 'Recall',
  compare: 'Compare',
  done: 'Finished',
};

export default function Library() {
  const { state } = useLearner();

  return (
    <>
      <section className={styles.intro}>
        <h1>Library</h1>
        <p>
          Each reading teaches a handful of new words and verb forms in four steps:{' '}
          <strong>guess</strong> them before you read, <strong>read</strong> the story with
          tap-to-translate, <strong>recall</strong> them from memory, then <strong>compare</strong>{' '}
          what changed.
        </p>
      </section>

      <ul className={styles.list}>
        {texts.map((text) => {
          const lesson = state.lessons[text.id];
          const counts = statusCounts(text, state);
          const action = !lesson ? 'Start' : lesson.stage === 'done' ? 'Read again' : 'Continue';
          return (
            <li key={text.id} className={styles.card}>
              <div className={styles.meta}>
                <span className={styles.level}>{text.level}</span>
                {lesson && <span className={styles.stage}>{STAGE_LABEL[lesson.stage]}</span>}
              </div>
              <h2 lang="es" className={styles.title}>
                {text.title}
              </h2>
              <p className={styles.summary}>{text.summaryEn}</p>
              <div className={styles.counts} aria-label="Words in this text">
                <span className={styles.countNew}>{counts.new} new</span>
                <span className={styles.countLearning}>{counts.learning} learning</span>
                <span className={styles.countKnown}>{counts.known} known</span>
              </div>
              <Link to={`/read/${text.id}`} className={`btn btn-primary ${styles.cta}`}>
                {action}
              </Link>
            </li>
          );
        })}
        <li className={`${styles.card} ${styles.placeholder}`}>More readings coming soon.</li>
      </ul>
    </>
  );
}
