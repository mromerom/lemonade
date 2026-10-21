import { Link, Outlet } from 'react-router-dom';
import { useLearner } from '../store/learnerStore';
import styles from './Layout.module.css';

export default function Layout() {
  const { state, dispatch } = useLearner();

  function reset() {
    if (window.confirm('Reset the demo? This clears all progress and word statuses on this device.')) {
      dispatch({ type: 'resetAll' });
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.lemon} aria-hidden="true" />
          Lemonade
        </Link>
        <div className={styles.right}>
          <span className={styles.profile}>{state.profile.name}</span>
          <button type="button" className="btn btn-quiet" onClick={reset}>
            Reset demo
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
