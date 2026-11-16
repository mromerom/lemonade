import { useEffect, useRef, useState } from 'react';
import { hintFor } from '../lib/hints';
import { TABLE_PERSONS, TENSE_INFO, type HintTense } from '../lib/tenses';
import type { AnswerIssue, TranslationCheck } from '../types';
import { Tag } from './Feedback';
import styles from './Hints.module.css';

/**
 * Guidance for a second try: what to look at, never the fix itself. The tense
 * a sentence needs is a button that opens its conjugation table.
 */

export function HintList({ check }: { check: TranslationCheck }) {
  return (
    <div className={styles.hints}>
      <ul className={styles.list}>
        {check.issues.map((issue, i) => (
          <li key={i}>
            <Tag text={issue.category} bad={issue.category !== 'accent'} />
            <span>{hintFor(issue)}</span>
            {issue.tense && (
              <span className={styles.need}>
                Tense you need: <TenseButton issue={issue} tense={issue.tense} />
              </span>
            )}
          </li>
        ))}
      </ul>
      {check.pattern && (
        <p className={styles.pattern}>
          <span className={styles.label}>Pattern to follow</span>
          {check.pattern}
        </p>
      )}
    </div>
  );
}

/** The tense's name, underlined; it opens the conjugation table. */
function TenseButton({ issue, tense }: { issue: AnswerIssue; tense: HintTense }) {
  const [open, setOpen] = useState(false);
  const info = TENSE_INFO[tense];
  return (
    <>
      <button type="button" className={styles.tense} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span lang="es">{info.es}</span> ({info.en})
      </button>
      {open && <ConjugationDialog issue={issue} tense={tense} onClose={() => setOpen(false)} />}
    </>
  );
}

function ConjugationDialog({ issue, tense, onClose }: { issue: AnswerIssue; tense: HintTense; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const info = TENSE_INFO[tense];
  const c = issue.conjugation;

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="conj-title"
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop (the dialog itself, outside its content) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.dialogBody}>
        <div className={styles.dialogHead}>
          <h2 id="conj-title" className={styles.dialogTitle}>
            {c && (
              <>
                <span lang="es">{c.verb}</span> ·{' '}
              </>
            )}
            <span lang="es">{info.es}</span>
          </h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className={styles.roughly}>
          The {info.en}: roughly “{info.roughly}”. English and Spanish tenses don’t match one to one, so think about
          what your sentence means.
        </p>
        {c ? (
          <table className={styles.table}>
            <tbody>
              {TABLE_PERSONS.map((p) => (
                <tr key={p}>
                  <th scope="row" lang="es">
                    {p}
                  </th>
                  <td lang="es">{c.forms[p]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.roughly}>There’s no table for this one.</p>
        )}
        <p className={styles.which}>Which person is doing the action in your sentence?</p>
      </div>
    </dialog>
  );
}
