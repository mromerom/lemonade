import { Link } from 'react-router-dom';
import styles from './BackLink.module.css';

/** "‹ Home" at the top of a section, so it's clear how to back out. */
export default function BackLink({ to = '/', label = 'Home' }: { to?: string; label?: string }) {
  return (
    <Link to={to} className={styles.back}>
      <svg className={styles.chevron} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}
