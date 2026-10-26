import { useEffect, useState, type ReactNode } from 'react';
import { lookupTerm } from '../../content';
import { parseMarkup, toSegmentRuns } from '../../lib/markup';
import { textWordKeys, wordStatus } from '../../lib/textWords';
import { useLearner } from '../../store/learnerStore';
import type { Paragraph, Text } from '../../types';
import WordCard from './WordCard';
import shared from './shared.module.css';
import styles from './Reader.module.css';

interface Props {
  text: Text;
  onDone: () => void;
}

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
  const [selected, setSelected] = useState<{ key: string; sense?: string } | null>(null);
  const [translated, setTranslated] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const newKeys = textWordKeys(text).filter((k) => wordStatus(state, k) === 'new');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function select(key: string, sense?: string) {
    setSelected({ key, sense });
    dispatch({ type: 'lookupWord', key, sense });
  }

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  /** Spanish text where every term (word or bracketed phrase) is a button. */
  function tappable(es: string) {
    return (
      <>
        {toSegmentRuns(parseMarkup(es)).map((run, r) =>
          run.kind === 'space' ? (
            <span key={r}>{run.text}</span>
          ) : (
            <span key={r} className={styles.run}>
              {run.segments.map((seg, j) => {
                if (seg.kind === 'other') return <span key={j}>{seg.text}</span>;
                const status = lookupTerm(seg.key)?.name ? 'known' : wordStatus(state, seg.key);
                const isSelected = selected?.key === seg.key && selected.sense === seg.sense;
                return (
                  <button
                    key={j}
                    type="button"
                    className={[
                      styles.word,
                      styles[status],
                      seg.phrase ? styles.phrase : '',
                      isSelected ? styles.selected : '',
                    ].join(' ')}
                    onClick={() => select(seg.key, seg.sense)}
                  >
                    {seg.text}
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
          <WordCard
            key={`${selected.key}:${selected.sense ?? ''}`}
            termKey={selected.key}
            senseId={selected.sense}
            onClose={() => setSelected(null)}
          />
        ) : (
          <p className={styles.empty}>Tap a word to see what it means.</p>
        )}
      </aside>
    </div>
  );
}
