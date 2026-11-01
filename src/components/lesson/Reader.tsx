import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { lookupTerm } from '../../content';
import { parseMarkup, plainText, toSegmentRuns } from '../../lib/markup';
import { textTerms, wordStatus } from '../../lib/textWords';
import { useDismiss } from '../../lib/useDismiss';
import { useLearner } from '../../store/learnerStore';
import type { Paragraph, Text } from '../../types';
import GroupCard, { type GroupItem } from './GroupCard';
import WordCard from './WordCard';
import shared from './shared.module.css';
import styles from './Reader.module.css';

interface Props {
  text: Text;
  /** "lesson" is part of the four steps; "review" is reading a finished text again */
  mode?: 'lesson' | 'review';
  onDone: () => void;
}

/** Words picked in one paragraph: one word, or several with shift-click. */
interface Selection {
  block: string;
  items: GroupItem[];
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

export default function Reader({ text, mode = 'lesson', onDone }: Props) {
  const { state, dispatch } = useLearner();
  const [selection, setSelection] = useState<Selection | null>(null);
  // On touch screens there's no shift key, so the card offers an "add words" mode.
  const [adding, setAdding] = useState(false);
  const [translated, setTranslated] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const newTerms = textTerms(text).filter((t) => wordStatus(state, t.key, t.sense) === 'new');

  const close = useCallback(() => {
    setSelection(null);
    setAdding(false);
  }, []);

  // Clicking outside the card closes it. Words are left out: clicking one opens
  // its own card, and in "select more words" mode it adds to the group.
  const panelRef = useRef<HTMLElement>(null);
  useDismiss(panelRef, Boolean(selection) && !adding, close, '[data-term]');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  function onTermClick(e: MouseEvent, block: string, item: GroupItem) {
    const additive = e.shiftKey || adding;
    if (additive && selection && selection.block === block) {
      // Shift-click toggles the word in or out of the group.
      const has = selection.items.some((i) => i.idx === item.idx);
      const items = has
        ? selection.items.filter((i) => i.idx !== item.idx)
        : [...selection.items, item].sort((a, b) => a.idx - b.idx);
      if (items.length === 0) close();
      else setSelection({ block, items });
      return;
    }
    setSelection({ block, items: [item] });
    if (!additive) setAdding(false);
    dispatch({ type: 'lookupWord', key: item.key, sense: item.sense });
  }

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  /** Spanish text where every term (word or bracketed phrase) is a button. */
  function tappable(es: string, block: string) {
    const segments = parseMarkup(es);
    const indexOf = new Map(segments.map((s, i) => [s, i]));
    return (
      <>
        {toSegmentRuns(segments).map((run, r) =>
          run.kind === 'space' ? (
            <span key={r}>{run.text}</span>
          ) : (
            <span key={r} className={styles.run}>
              {run.segments.map((seg, j) => {
                if (seg.kind === 'other') return <span key={j}>{seg.text}</span>;
                const idx = indexOf.get(seg) ?? -1;
                const status = lookupTerm(seg.key)?.name ? 'known' : wordStatus(state, seg.key, seg.sense);
                const picked = selection?.block === block && selection.items.some((i) => i.idx === idx);
                const inGroup = picked && selection!.items.length > 1;
                return (
                  <button
                    key={j}
                    type="button"
                    className={[
                      styles.word,
                      styles[status],
                      seg.phrase ? styles.phrase : '',
                      picked ? styles.selected : '',
                      inGroup ? styles.grouped : '',
                    ].join(' ')}
                    aria-pressed={picked}
                    data-term
                    onClick={(e) => onTermClick(e, block, { idx, key: seg.key, sense: seg.sense, text: seg.text })}
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
            <p>{tappable(p.es, `${id}-${i}`)}</p>
            {translateToggle(`${id}-${i}`, p.en)}
          </div>
        ))}
      </div>
    );
  }

  const narrator = text.retelling.narrator;
  const single = selection && selection.items.length === 1 ? selection.items[0] : null;
  const group = selection && selection.items.length > 1 ? selection.items : null;
  const groupKey = group?.map((i) => i.text).join(' ').toLocaleLowerCase('es');
  // A shift-selected group that matches a lexicon phrase gets the normal card.
  const groupEntry = groupKey ? lookupTerm(groupKey) : undefined;

  return (
    <div className={styles.layout}>
      <div className={styles.column}>
        <div className={styles.legend} aria-hidden="true">
          <span className={styles.statusNew}>new</span>
          <span className={styles.statusLearning}>learning</span>
          <span>known</span>
          <span className={styles.legendHint}>
            Tap a word to translate it. Shift-click to select several words together.
          </span>
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

        <Part
          n={3}
          title="Preguntas y respuestas"
          hint="Answer each question in your head, then show the answer to check."
        >
          {/* Part of the text, set like the story, but without tap-to-translate words. */}
          <ol className={styles.qaList} lang="es">
            {text.qa.map((item, i) => {
              const open = revealed.has(i);
              const enOpen = translated.has(`qa-${i}`);
              return (
                <li key={i} className={styles.qa}>
                  <p>{plainText(item.statement.es)}</p>
                  <p>{plainText(item.question.es)}</p>
                  {open && <p>{plainText(item.answer.es)}</p>}
                  <div className={styles.qaActions}>
                    <button
                      type="button"
                      className={styles.reveal}
                      aria-expanded={open}
                      onClick={() => setRevealed((s) => toggle(s, i))}
                    >
                      {open ? 'Hide answer' : 'Show answer'}
                    </button>
                    <button
                      type="button"
                      className={styles.translateBtn}
                      aria-expanded={enOpen}
                      onClick={() => setTranslated((s) => toggle(s, `qa-${i}`))}
                    >
                      {enOpen ? 'Hide translation' : 'Translate'}
                    </button>
                  </div>
                  {enOpen && (
                    <p className={styles.translation} lang="en">
                      {item.statement.en} {item.question.en}
                      {open ? ` ${item.answer.en}` : ''}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </Part>

        <div className={shared.actions}>
          {newTerms.length > 0 && (
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => dispatch({ type: 'markKnown', terms: newTerms })}
            >
              Mark {newTerms.length} remaining new words as known
            </button>
          )}
          {mode === 'review' ? (
            <>
              <Link to="/" className="btn btn-quiet">
                Back to library
              </Link>
              <button type="button" className="btn btn-primary" onClick={onDone}>
                See my results
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onDone}>
              I'm done reading →
            </button>
          )}
        </div>
        {mode === 'lesson' && (
          <p className={styles.doneHint}>Next you'll type the new words and verb forms from memory, without the text.</p>
        )}
      </div>

      <aside
        ref={panelRef}
        className={`${styles.panel} ${selection ? styles.panelOpen : ''}`}
        aria-live="polite"
        aria-label="Word details"
      >
        {single && !adding ? (
          <WordCard
            key={`${single.key}:${single.sense ?? ''}`}
            termKey={single.key}
            senseId={single.sense}
            onClose={close}
            onAddWords={() => setAdding(true)}
          />
        ) : selection && groupEntry && !adding ? (
          <WordCard key={groupKey} termKey={groupKey!} onClose={close} />
        ) : selection ? (
          <GroupCard
            key={groupKey ?? single?.key}
            items={selection.items}
            adding={adding}
            onDoneAdding={() => setAdding(false)}
            onClose={close}
          />
        ) : (
          <p className={styles.empty}>Tap a word to see what it means. Shift-click to select a group of words.</p>
        )}
      </aside>
    </div>
  );
}
