import { useEffect, useRef, useState } from 'react';
import { hasSaved, markKeywords } from '../lib/keywords';
import { useLearner } from '../store/learnerStore';
import type { KeyWord } from '../types';
import styles from './WordLookup.module.css';

const FORM_NOTE: Record<KeyWord['pos'], string> = {
  verb: 'This is the infinitive. The form you need depends on who does it and when.',
  noun: 'The singular, without its article.',
  adjective: 'The masculine singular: make it match your noun.',
  adverb: 'Adverbs don’t change form.',
};

/**
 * An English sentence the learner wrote, with the key words whose Spanish
 * isn't in their word bank yet highlighted. Tapping one shows its dictionary
 * form, never the conjugated or agreeing form the sentence needs.
 */
export function EnglishWithLookups({ sentence, keywords }: { sentence: string; keywords?: KeyWord[] }) {
  const { state } = useLearner();
  const [open, setOpen] = useState<KeyWord | null>(null);
  // Which words to offer is decided once, so a word just added stays tappable.
  const [offered] = useState(() => new Set((keywords ?? []).filter((k) => !hasSaved(state, k)).map((k) => k.text)));
  const unsaved = (keywords ?? []).filter((k) => offered.has(k.text) || !hasSaved(state, k));
  return (
    <>
      <span lang="en">
        {markKeywords(sentence, unsaved).map((part, i) =>
          'word' in part ? (
            <button
              key={i}
              type="button"
              className={`${styles.word} ${hasSaved(state, part.word) ? styles.added : ''}`}
              aria-haspopup="dialog"
              aria-label={`${part.text}: look it up`}
              onClick={() => setOpen(part.word)}
            >
              {part.text}
            </button>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </span>
      {open && <LookupDialog word={open} sentence={sentence} onClose={() => setOpen(null)} />}
    </>
  );
}

function LookupDialog({ word, sentence, onClose }: { word: KeyWord; sentence: string; onClose: () => void }) {
  const { state, dispatch } = useLearner();
  const ref = useRef<HTMLDialogElement>(null);
  const saved = hasSaved(state, word);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="lookup-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.body}>
        <div className={styles.head}>
          <p className={styles.english} lang="en">
            “{word.text}”
          </p>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <h2 id="lookup-title" className={styles.es} lang="es">
          {word.es}
        </h2>
        <p className={styles.meta}>
          <span className={styles.pos}>{word.pos}</span> {word.gloss}
        </p>
        <p className={styles.note}>{FORM_NOTE[word.pos]}</p>
        {saved ? (
          <p className={styles.saved}>✓ In your word bank</p>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'addExerciseWord', word, sentence })}
          >
            Add to word bank
          </button>
        )}
      </div>
    </dialog>
  );
}
