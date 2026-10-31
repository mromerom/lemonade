import { Link } from 'react-router-dom';
import Collapsible from '../components/Collapsible';
import RecentWords from '../components/RecentWords';
import { texts } from '../data/texts';
import { statusCounts } from '../lib/textWords';
import { wordBank } from '../lib/wordBank';
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
  const bank = wordBank(state);
  const learning = bank.filter((e) => e.status === 'learning').length;

  return (
    <>
      <section className={styles.intro}>
        <h1>Welcome back</h1>
        <p>
          Each reading teaches a handful of new words and verb forms in four steps:{' '}
          <strong>guess</strong> them before you read, <strong>read</strong> the story with
          tap-to-translate, <strong>recall</strong> them from memory, then <strong>compare</strong>{' '}
          what changed.
        </p>
      </section>

      <div className={styles.sections}>
        <Collapsible id="library" title="Library" summary={`${texts.length} readings`}>
          <ul className={styles.list}>
            {texts.map((text) => {
              const lesson = state.lessons[text.id];
              const counts = statusCounts(text, state);
              const action = lesson ? 'Continue' : 'Start';
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
                  <div className={styles.actions}>
                    {lesson?.stage === 'done' ? (
                      <>
                        <Link to={`/read/${text.id}?view=text`} className="btn btn-primary">
                          Read again
                        </Link>
                        <Link to={`/read/${text.id}`} className="btn btn-quiet">
                          See results
                        </Link>
                      </>
                    ) : (
                      <Link to={`/read/${text.id}`} className="btn btn-primary">
                        {action}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
            <li className={`${styles.card} ${styles.placeholder}`}>More readings coming soon.</li>
          </ul>
        </Collapsible>

        <Collapsible
          id="word-bank"
          title="Word Bank"
          summary={`${bank.length} words and phrases · ${learning} still learning`}
          actions={
            <Link to="/words" className="btn">
              Open word bank
            </Link>
          }
        >
          <p className={styles.sectionNote}>Recently added</p>
          <RecentWords />
        </Collapsible>
      </div>
    </>
  );
}
