import { useState, type FormEvent } from 'react';
import { lookupTerm, senseOf } from '../../content';
import { wordStatus } from '../../lib/textWords';
import { useLearner } from '../../store/learnerStore';
import styles from './Reader.module.css';

/** One selected term: its position in the paragraph, lexicon key, sense and text. */
export interface GroupItem {
  idx: number;
  key: string;
  sense?: string;
  text: string;
}

interface Props {
  items: GroupItem[];
  /** True while the learner is picking words by tapping (no shift key on touch screens) */
  adding: boolean;
  onDoneAdding: () => void;
  onClose: () => void;
}

/**
 * Card for words the learner grouped themselves. Shows each word's meaning and
 * lets them save the group as a phrase with their own meaning.
 */
export default function GroupCard({ items, adding, onDoneAdding, onClose }: Props) {
  const { state, dispatch } = useLearner();
  const text = items.map((i) => i.text).join(' ');
  const key = text.toLocaleLowerCase('es');
  const saved = state.userPhrases?.[key];
  const [gloss, setGloss] = useState(saved?.gloss ?? '');
  const [justSaved, setJustSaved] = useState(false);

  function save(e: FormEvent) {
    e.preventDefault();
    dispatch({ type: 'savePhrase', key, text, gloss: gloss.trim(), words: items.map((i) => i.key) });
    setJustSaved(true);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <p className={styles.cardWord} lang="es">
          {text}
        </p>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      {adding && (
        <div className={styles.addingNote}>
          <p>Tap more words in this paragraph to add them. Tap a word again to remove it.</p>
          <button type="button" className="btn btn-primary" onClick={onDoneAdding} disabled={items.length < 2}>
            Done
          </button>
        </div>
      )}

      {items.length > 1 && (
        <>
          <div className={styles.cardSection}>
            <p className={styles.cardLabel}>Word by word</p>
            <ul className={styles.parts}>
              {items.map((i) => (
                <li key={i.idx}>
                  <span lang="es">{i.text}</span>
                  <span>{senseOf(lookupTerm(i.key), i.sense)?.gloss ?? '?'}</span>
                </li>
              ))}
            </ul>
          </div>

          {!adding && (
            <form className={styles.cardSection} onSubmit={save}>
              <label className={styles.cardLabel} htmlFor="phrase-gloss">
                What does it mean together?
              </label>
              <div className={styles.saveRow}>
                <input
                  id="phrase-gloss"
                  className={styles.glossInput}
                  value={gloss}
                  onChange={(e) => {
                    setGloss(e.target.value);
                    setJustSaved(false);
                  }}
                  placeholder="Your meaning (optional)"
                  autoComplete="off"
                />
                <button type="submit" className="btn btn-primary">
                  {saved ? 'Update' : 'Save phrase'}
                </button>
              </div>
              {(justSaved || saved) && (
                <p className={styles.savedNote} role="status">
                  {justSaved ? 'Saved to your words.' : `Saved · ${wordStatus(state, key)}`}
                </p>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
}
