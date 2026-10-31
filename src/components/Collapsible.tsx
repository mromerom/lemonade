import { useEffect, useId, useState, type ReactNode } from 'react';
import styles from './Collapsible.module.css';

interface Props {
  /** Stable id, used to remember whether the section is open */
  id: string;
  title: string;
  /** Short line under the title, shown even when collapsed */
  summary?: ReactNode;
  /** Extra controls on the right of the header (stay visible when collapsed) */
  actions?: ReactNode;
  children: ReactNode;
}

const key = (id: string) => `lemonade:section:${id}`;

function readOpen(id: string): boolean {
  try {
    return localStorage.getItem(key(id)) !== 'closed';
  } catch {
    return true;
  }
}

/** A home-page section that can be collapsed. Remembers its state in this browser. */
export default function Collapsible({ id, title, summary, actions, children }: Props) {
  const [open, setOpen] = useState(() => readOpen(id));
  const bodyId = useId();

  useEffect(() => {
    try {
      localStorage.setItem(key(id), open ? 'open' : 'closed');
    } catch {
      // Storage blocked: the state lasts for this page view.
    }
  }, [id, open]);

  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
            ›
          </span>
          <span className={styles.titles}>
            <span className={styles.title}>{title}</span>
            {summary && <span className={styles.summary}>{summary}</span>}
          </span>
        </button>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div id={bodyId} hidden={!open} className={styles.body}>
        {children}
      </div>
    </section>
  );
}
