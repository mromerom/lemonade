import { useState } from 'react';
import { lookupTerm, senseOf } from '../../content';
import { wordStatus } from '../../lib/textWords';
import { useLearner } from '../../store/learnerStore';
import type { Sense, WordStatus } from '../../types';
import styles from './Reader.module.css';

const STATUS_LABEL: Record<Exclude<WordStatus, 'new'>, string> = {
  learning: 'Learning',
  known: 'Known',
};

interface Props {
  termKey: string;
  /** Sense used at this spot in the text; omitted means the default */
  senseId?: string;
  onClose: () => void;
}

/**
 * Details for a tapped word or phrase:
 *   1. the meaning in this context
 *   2. for phrases, each word's meaning inside the phrase
 *   3. other meanings this learner has already met (in any reading)
 *   4. every other meaning, behind a reveal
 */
export default function WordCard({ termKey, senseId, onClose }: Props) {
  const { state, dispatch } = useLearner();
  const [showAll, setShowAll] = useState(false);
  const entry = lookupTerm(termKey);
  const sense = senseOf(entry, senseId);
  const status = wordStatus(state, termKey);

  const others = entry?.senses.filter((s) => s.id !== sense?.id) ?? [];
  const seenIds = new Set(state.words[termKey]?.senses ?? []);
  const seen = others.filter((s) => seenIds.has(s.id));
  const unseen = others.filter((s) => !seenIds.has(s.id));

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <p className={styles.cardWord} lang="es">
          {termKey}
        </p>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {sense?.lemma && (
        <p className={styles.lemma}>
          from <span lang="es">{sense.lemma}</span>
        </p>
      )}
      <p className={styles.gloss}>{sense?.gloss ?? 'No translation yet.'}</p>
      {sense?.note && <p className={styles.noteText}>{sense.note}</p>}

      {entry?.words && (
        <div className={styles.cardSection}>
          <p className={styles.cardLabel}>Word by word</p>
          <ul className={styles.parts}>
            {entry.words.map((w) => {
              const part = senseOf(lookupTerm(w.word), w.sense);
              return (
                <li key={w.word}>
                  <span lang="es">{w.word}</span>
                  <span>{part?.gloss ?? '?'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {seen.length > 0 && (
        <div className={styles.cardSection}>
          <p className={styles.cardLabel}>Other meanings you've seen</p>
          <SenseList senses={seen} />
        </div>
      )}

      {unseen.length > 0 &&
        (showAll ? (
          <div className={styles.cardSection}>
            <p className={styles.cardLabel}>{seen.length ? 'More meanings' : 'Other meanings'}</p>
            <SenseList senses={unseen} />
          </div>
        ) : (
          <button type="button" className={styles.moreBtn} onClick={() => setShowAll(true)}>
            {seen.length ? 'More meanings' : 'Other meanings'} ({unseen.length})
          </button>
        ))}

      {!entry?.name && (
        <div className={styles.statusRow} role="group" aria-label="Word status">
          {(['learning', 'known'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              className={`${styles.statusBtn} ${status === s ? styles[`pick_${s}`] : ''}`}
              onClick={() => dispatch({ type: 'setWordStatus', key: termKey, status: s })}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SenseList({ senses }: { senses: Sense[] }) {
  return (
    <ul className={styles.senses}>
      {senses.map((s) => (
        <li key={s.id}>
          <span className={styles.senseGloss}>{s.gloss}</span>
          {s.lemma && (
            <span className={styles.senseMeta}>
              {' '}
              from <span lang="es">{s.lemma}</span>
            </span>
          )}
          {s.note && <span className={styles.senseNote}>{s.note}</span>}
        </li>
      ))}
    </ul>
  );
}
