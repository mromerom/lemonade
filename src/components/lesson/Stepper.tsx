import type { LessonStage } from '../../types';
import styles from './Stepper.module.css';

const STEPS: { stage: LessonStage; label: string }[] = [
  { stage: 'pre', label: 'Guess' },
  { stage: 'read', label: 'Read' },
  { stage: 'post', label: 'Recall' },
  { stage: 'compare', label: 'Compare' },
];

export default function Stepper({ stage }: { stage: LessonStage }) {
  const current = stage === 'done' ? STEPS.length : STEPS.findIndex((s) => s.stage === stage);
  return (
    <ol className={styles.steps}>
      {STEPS.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li
            key={step.stage}
            className={`${styles.step} ${styles[state]}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className={styles.dot}>{state === 'done' ? '✓' : i + 1}</span>
            <span className={styles.label}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
