import { useEffect, useState, type ReactNode } from 'react';
import { toRuns, tokenize } from '../../lib/tokenize';
import { textWordKeys, wordStatus } from '../../lib/textWords';
import { useLearner } from '../../store/learnerStore';
import type { Paragraph, Text, WordStatus } from '../../types';
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

function Part({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section className={styles.part} aria-labelledby={`part-${n}`}>
      <header className={styles.partHead}>
        <span className={styles.partNum}>Part {n}</span>
        <h2 id={`part-${n}`} className={styles.partTitle}>
          {title}
        </h2>
        <p className={styles.partHint}>{hint}</p>
      </header>
      {children}
    </section>
  );
}

export default function Reader({ text, onDone }: Props) {
  const { state, dispatch } = useLearner();
  const [selected, setSelected] = useState<string | null>(null);
  const [translated, setTranslated] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

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

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  /** Spanish text where every word is a button. */
  function tappable(es: string) {
    return (
      <>
        {toRuns(tokenize(es)).map((run, r) =>
          run.kind === 'space' ? (
            <span key={r}>{run.text}</span>
          ) : (
            <span key={r} className={styles.run}>
              {run.tokens.map((t, j) => {
                if (t.kind === 'other') return <span key={j}>{t.text}</span>;
                const status = text.glossary[t.key]?.name ? 'known' : wordStatus(state, t.key);
                return (
                  <button
                    key={j}
                    type="button"
                    className={[styles.word, styles[status], selected === t.key ? styles.selected : ''].join(' ')}
                    onClick={() => select(t.key)}
                  >
                    {t.text}
                  </button>
                );
              })}
            </span>
          ),
        )}
      </>
    );
  }

  function translateToggle(id: string, en: string) {
    const open = translated.has(id);
    return (
      <>
        <button
          type="button"
          className={styles.translateBtn}
          aria-expanded={open}
          onClick={() => setTranslated((s) => toggle(s, id))}
        >
          {open ? 'Hide translation' : 'Translate'}
        </button>
        {open && (
          <p className={styles.translation} lang="en">
            {en}
          </p>
        )}
      </>
    );
  }

  function prose(id: string, paragraphs: Paragraph[]) {
    return (
      <div className={styles.text} lang="es">
        {paragraphs.map((p, i) => (
          <div key={i} className={styles.paragraph}>
            <p>
              {tappable(p.es)}
            </p>
            {translateToggle(`${id}-${i}`, p.en)}
          </div>
        ))}
      </div>
    );
  }


  const entry = selected ? text.glossary[selected] : undefined;
  const selectedStatus = selected ? wordStatus(state, selected) : 'new';
  const narrator = text.retelling.narrator;

  return (
    <div className={styles.layout}>
      <div className={styles.column}>
        <div className={styles.legend} aria-hidden="true">
          <span className={styles.statusNew}>new</span>
          <span className={styles.statusLearning}>learning</span>
          <span>known</span>
          <span className={styles.legendHint}>Tap any word to translate it.</span>
        </div>

        <Part n={1} title="La historia" hint={`The story, told about ${narrator}.`}>
          {prose('story', text.story)}
        </Part>

        <Part
          n={2}
          title={`${narrator} cuenta la historia`}
          hint={`The same story, told by ${narrator}. Watch how the verbs change${
            text.retelling.example ? `: “${text.retelling.example[0]}” becomes “${text.retelling.example[1]}”` : ''
          }.`}
        >
          {prose('retell', text.retelling.paragraphs)}
        </Part>

        <Part n={3} title="Preguntas y respuestas" hint="Read each question and answer it in your head before you reveal the answer.">
          <ol className={styles.qaList} lang="es">
            {text.qa.map((item, i) => {
              const open = revealed.has(i);
              return (
                <li key={i} className={styles.qa}>
                  <p className={styles.qaStatement}>
                    {tappable(item.statement.es)}
                  </p>
                  <p className={styles.qaQuestion}>
                    {tappable(item.question.es)}
                  </p>
                  {open ? (
                    <p className={styles.qaAnswer}>
                      {tappable(item.answer.es)}
                    </p>
                  ) : (
                    <button
                      type="button"
                      className={styles.reveal}
                      onClick={() => setRevealed((s) => toggle(s, i))}
                    >
                      Show answer
                    </button>
                  )}
                  {translateToggle(
                    `qa-${i}`,
                    `${item.statement.en} ${item.question.en}${open ? ` ${item.answer.en}` : ''}`,
                  )}
                </li>
              );
            })}
          </ol>
        </Part>

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
          Next you'll type the new words and verb forms from memory, without the text.
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
              <button type="button" className={styles.close} aria-label="Close" onClick={() => setSelected(null)}>
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
    </div>
  );
}
