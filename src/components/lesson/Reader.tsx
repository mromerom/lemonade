import { useEffect, useMemo, useState } from 'react';
import { toRuns, tokenize } from '../../lib/tokenize';
import { textWordKeys, wordStatus } from '../../lib/textWords';
import { useLearner } from '../../store/learnerStore';
import type { Text, WordStatus } from '../../types';
import shared from './shared.module.css';
import styles from './Reader.module.css';

interface Props {
  text: Text;
  onDone: () => void;
}

const STATUS_LABEL: Record<WordStatus, string> = {
  new: 'New',
  learning: 'Learning',
  known: 'Known',
};

export default function Reader({ text, onDone }: Props) {
  const { state, dispatch } = useLearner();
  const [selected, setSelected] = useState<string | null>(null);
  const [translated, setTranslated] = useState<Set<number>>(new Set());

  const paragraphs = useMemo(() => text.paragraphs.map((p) => toRuns(tokenize(p.es))), [text]);
  const newKeys = textWordKeys(text).filter((k) => wordStatus(state, k) === 'new');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function select(key: string) {
    setSelected(key);
    dispatch({ type: 'lookupWord', key });
  }

  function toggleTranslation(i: number) {
    setTranslated((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const entry = selected ? text.glossary[selected] : undefined;
  const selectedStatus = selected ? wordStatus(state, selected) : 'new';

  return (
    <section className={styles.layout} aria-label="Reading">
      <div className={styles.column}>
        <div className={styles.legend} aria-hidden="true">
          <span className={styles.statusNew}>new</span>
          <span className={styles.statusLearning}>learning</span>
          <span>known</span>
          <span className={styles.legendHint}>Tap any word to translate it.</span>
        </div>

        <div className={styles.text} lang="es">
          {paragraphs.map((tokens, i) => (
            <div key={i} className={styles.paragraph}>
              <p>
                {tokens.map((run, r) =>
                  run.kind === 'space' ? (
                    <span key={r}>{run.text}</span>
                  ) : (
                    <span key={r} className={styles.run}>
                      {run.tokens.map((t, j) => {
                        if (t.kind === 'other') return <span key={j}>{t.text}</span>;
                        const isName = text.glossary[t.key]?.name;
                        const status = isName ? 'known' : wordStatus(state, t.key);
                        return (
                          <button
                            key={j}
                            type="button"
                            className={[
                              styles.word,
                              styles[status],
                              selected === t.key ? styles.selected : '',
                            ].join(' ')}
                            onClick={() => select(t.key)}
                          >
                            {t.text}
                          </button>
                        );
                      })}
                    </span>
                  ),
                )}
              </p>
              <button
                type="button"
                className={styles.translateBtn}
                aria-expanded={translated.has(i)}
                onClick={() => toggleTranslation(i)}
              >
                {translated.has(i) ? 'Hide translation' : 'Translate'}
              </button>
              {translated.has(i) && (
                <p className={styles.translation} lang="en">
                  {text.paragraphs[i].en}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className={shared.actions}>
          {newKeys.length > 0 && (
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => dispatch({ type: 'markKnown', keys: newKeys })}
            >
              Mark {newKeys.length} remaining new words as known
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onDone}>
            I'm done reading →
          </button>
        </div>
        <p className={styles.doneHint}>
          Next you'll answer the same questions from memory, without the text.
        </p>
      </div>

      <aside
        className={`${styles.panel} ${selected ? styles.panelOpen : ''}`}
        aria-live="polite"
        aria-label="Word details"
      >
        {selected ? (
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <p className={styles.cardWord} lang="es">
                {selected}
              </p>
              <button
                type="button"
                className={styles.close}
                aria-label="Close"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>
            {entry?.lemma && (
              <p className={styles.lemma}>
                from <span lang="es">{entry.lemma}</span>
              </p>
            )}
            <p className={styles.gloss}>{entry?.gloss ?? 'No translation yet.'}</p>
            {entry?.note && <p className={styles.noteText}>{entry.note}</p>}
            {!entry?.name && (
              <div className={styles.statusRow} role="group" aria-label="Word status">
                {(['learning', 'known'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={selectedStatus === s}
                    className={`${styles.statusBtn} ${selectedStatus === s ? styles[`pick_${s}`] : ''}`}
                    onClick={() => dispatch({ type: 'setWordStatus', key: selected, status: s })}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className={styles.empty}>Tap a word to see what it means.</p>
        )}
      </aside>
    </section>
  );
}
