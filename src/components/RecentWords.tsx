import { Link } from 'react-router-dom';
import { useLearner } from '../store/learnerStore';
import { groupKeyOf, recentEntries } from '../lib/wordBank';
import styles from './RecentWords.module.css';

/** The ten most recently added terms, newest on the left. Scrolls sideways when they don't fit. */
export default function RecentWords() {
  const { state } = useLearner();
  const recent = recentEntries(state, 10);

  if (!recent.length) {
    return <p className={styles.empty}>Words you look up or mark while reading will show up here.</p>;
  }

  return (
    <div className={styles.scroller} role="region" aria-label="Recently added words" tabIndex={0}>
      <ol className={styles.row}>
        {recent.map((e) => (
          <li key={e.key}>
            <Link to={`/words?w=${encodeURIComponent(e.userPhrase ? e.key : groupKeyOf(e.key))}`} className={`${styles.chip} ${styles[e.status]}`}>
              <span className={styles.es} lang="es">
                {e.es}
              </span>
              <span className={styles.en}>{e.en}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
