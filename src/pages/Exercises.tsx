import { Link } from 'react-router-dom';
import { poolSize } from '../lib/proofread';
import { addonById, currentSet, topicById } from '../lib/writing';
import { useLearner } from '../store/learnerStore';
import styles from './Exercises.module.css';

/** The exercises: practice that isn't a reading. */
export default function Exercises() {
  const { state } = useLearner();
  const pool = poolSize(state);
  const current = currentSet(state);
  const done = (state.writing?.sets ?? []).filter((s) => s.stage === 'done').reverse();

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <h1>Exercises</h1>
        <p>Practice outside the readings: write about your own life, and proofread sentences, some of them your own.</p>
      </section>

      <ul className={styles.list}>
        <li className={styles.card}>
          <h2 className={styles.title}>Write and translate</h2>
          <p className={styles.about}>
            Write five sentences in English about your own life, one for each prompt. Then translate them into Spanish.
            Each translation gets feedback right away, and the ones that need work come back for a second try.
          </p>
          {current ? (
            <>
              <p className={styles.status}>
                In progress: {topicById(current.topic)?.title}
                {current.addon ? ` + ${addonById(current.addon)?.title}` : ''} ·{' '}
                {current.stage === 'write'
                  ? `${current.items.filter((i) => i.english.trim()).length} of ${current.items.length} written`
                  : `translating, ${Math.min(current.pos + 1, current.queue.length)} of ${current.queue.length}`}
              </p>
              <div className={styles.actions}>
                <Link to="/exercises/write" className="btn btn-primary">
                  Continue
                </Link>
              </div>
            </>
          ) : (
            <div className={styles.actions}>
              <Link to="/exercises/write" className="btn btn-primary">
                Start a set
              </Link>
            </div>
          )}
          {done.length > 0 && (
            <div className={styles.history}>
              <p className={styles.historyLabel}>Earlier sets</p>
              <ul>
                {done.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <Link to={`/exercises/write/${s.id}`}>
                      {topicById(s.topic)?.title}
                      {s.addon ? ` + ${addonById(s.addon)?.title}` : ''}
                    </Link>{' '}
                    <span className={styles.when}>{new Date(s.completedAt ?? s.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>

        <li className={styles.card}>
          <h2 className={styles.title}>Proofread</h2>
          <p className={styles.about}>
            Read a sentence and decide whether it has a mistake. If it does, select the wrong words and fix them right
            there. Some sentences are correct, and some are ones you wrote yourself.
          </p>
          <p className={styles.status}>
            {pool.total
              ? `${pool.total} sentences to proofread${pool.own ? `, ${pool.own} of them yours` : ''}`
              : 'All proofread. Your next mistakes in other exercises will show up here.'}
          </p>
          <div className={styles.actions}>
            <Link to="/exercises/proofread" className="btn btn-primary">
              {pool.total ? 'Start proofreading' : 'Go through them again'}
            </Link>
          </div>
        </li>
      </ul>
    </div>
  );
}
