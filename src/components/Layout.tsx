import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useLearner } from '../store/learnerStore';
import styles from './Layout.module.css';

export default function Layout() {
  const { state, dispatch } = useLearner();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  function reset() {
    dispatch({ type: 'resetAll' });
    setConfirming(false);
    navigate('/');
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.lemon} aria-hidden="true" />
          Lemonade
        </Link>
        <div className={styles.right}>
          {confirming ? (
            <div className={styles.confirm} role="group" aria-label="Confirm reset">
              <span className={styles.confirmText}>Clear all progress?</span>
              <button type="button" className={`btn ${styles.danger}`} onClick={reset}>
                Reset
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span className={styles.profile}>{state.profile.name}</span>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirming(true)}>
                Reset demo
              </button>
            </>
          )}
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
