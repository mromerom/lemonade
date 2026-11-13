import { Link } from 'react-router-dom';
import { practiceLink, type Focus } from '../lib/focus';
import type { AnswerIssue } from '../types';
import styles from './Feedback.module.css';

/** Pieces of feedback shared by the lesson results and the exercises. */

/** A mistake and its fix, marked ✗ and ✓ (no strikethrough, so both stay readable). */
export function WrongRight({ wrong, right }: { wrong: string; right: string }) {
  return (
    <span className={styles.wrongRight} lang="es">
      {wrong && (
        <span className={styles.wrongLine}>
          <span className={styles.icon} aria-label="wrong">
            ✗
          </span>
          {wrong}
        </span>
      )}
      <span className={styles.rightLine}>
        <span className={styles.icon} aria-label="right">
          ✓
        </span>
        {right}
      </span>
    </span>
  );
}

export function Tag({ text, bad = true }: { text: string; bad?: boolean }) {
  return <span className={`${styles.tag} ${bad ? styles.tagBad : styles.tagWarn}`}>{text}</span>;
}

/** Each mistake: what it's about, the fix, and the rule behind it. */
export function IssueList({ issues }: { issues: AnswerIssue[] }) {
  if (!issues.length) return null;
  return (
    <ul className={styles.issues}>
      {issues.map((issue, i) => (
        <li key={i}>
          <Tag text={issue.category} bad={issue.category !== 'accent'} />
          <WrongRight wrong={issue.wrong} right={issue.right} />
          <span className={styles.tip}>{issue.tip}</span>
        </li>
      ))}
    </ul>
  );
}

/** Up to three things to work on, with examples and a link to practise each. */
export function FocusList({ focus }: { focus: Focus[] }) {
  return (
    <ul className={styles.focusList}>
      {focus.map((f) => {
        const link = practiceLink(f.area);
        return (
          <li key={f.area}>
            <strong>{f.title}.</strong> {f.body}
            {f.examples.length > 0 && (
              <span className={styles.examples}>
                {f.examples.map((e, i) => (
                  <WrongRight key={i} wrong={e.wrong} right={e.right} />
                ))}
              </span>
            )}
            {link && (
              <Link to={link} className={styles.practice}>
                Practise this →
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
