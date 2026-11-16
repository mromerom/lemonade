import type { ReactNode } from 'react';
import { useDevMode } from '../lib/devMode';
import styles from './lesson/DevBar.module.css';

/** A row of testing buttons, shown only when Testing tools are on (footer switch). */
export default function TestingBar({ children, note }: { children: ReactNode; note?: string }) {
  const dev = useDevMode();
  if (!dev) return null;
  return (
    <div className={styles.bar} role="toolbar" aria-label="Testing tools" style={{ marginTop: 0 }}>
      <span className={styles.label}>Testing</span>
      <div className={styles.group}>{children}</div>
      {note && <span className={styles.note}>{note}</span>}
    </div>
  );
}

export function TestButton({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" className={styles.btn} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
