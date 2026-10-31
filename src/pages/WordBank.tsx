import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { lookupTerm } from '../content';
import { useLearner } from '../store/learnerStore';
import {
  contextsFor,
  highlightSegments,
  LEVEL_BAND_LABEL,
  levelBand,
  wordBank,
  type BankEntry,
  type LevelBand,
} from '../lib/wordBank';
import type { PartOfSpeech } from '../types';
import styles from './WordBank.module.css';

type Direction = 'es-en' | 'en-es';
type Sort = 'newest' | 'oldest' | 'az';
const TYPE_FILTERS: { pos: PartOfSpeech; label: string }[] = [
  { pos: 'noun', label: 'Nouns' },
  { pos: 'verb', label: 'Verbs' },
  { pos: 'adjective', label: 'Adjectives' },
  { pos: 'adverb', label: 'Adverbs' },
  { pos: 'phrase', label: 'Phrases' },
];
const BANDS: LevelBand[] = ['beginner', 'intermediate', 'advanced'];
const PREFS_KEY = 'lemonade:wordbank:prefs';

function loadPrefs(): { direction: Direction; sort: Sort } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { direction: 'es-en', sort: 'newest', ...JSON.parse(raw) };
  } catch {
    // Storage blocked: defaults.
  }
  return { direction: 'es-en', sort: 'newest' };
}

export default function WordBank() {
  const { state, dispatch } = useLearner();
  const [params, setParams] = useSearchParams();
  const [{ direction, sort }, setPrefs] = useState(loadPrefs);
  const [band, setBand] = useState<LevelBand | 'all'>('all');
  const [missedOnly, setMissedOnly] = useState(false);
  const [unknownOnly, setUnknownOnly] = useState(false);
  const [types, setTypes] = useState<Set<PartOfSpeech>>(new Set());
  const [query, setQuery] = useState('');
  const selectedKey = params.get('w');

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ direction, sort }));
    } catch {
      // Ignore.
    }
  }, [direction, sort]);

  const all = useMemo(() => wordBank(state), [state]);
  const front = (e: BankEntry) => (direction === 'es-en' ? e.es : e.en);
  const back = (e: BankEntry) => (direction === 'es-en' ? e.en : e.es);

  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const list = all.filter(
      (e) =>
        (band === 'all' || e.bands.includes(band)) &&
        (!missedOnly || e.missed) &&
        (!unknownOnly || e.status !== 'known') &&
        (types.size === 0 || e.pos.some((p) => types.has(p))) &&
        (!q || e.es.toLocaleLowerCase().includes(q) || e.en.toLocaleLowerCase().includes(q)),
    );
    if (sort === 'az') {
      const lang = direction === 'es-en' ? 'es' : 'en';
      return list.sort((a, b) => front(a).localeCompare(front(b), lang, { sensitivity: 'base' }));
    }
    return list.sort((a, b) => (sort === 'newest' ? b.addedAt - a.addedAt : a.addedAt - b.addedAt));
    // front depends on direction, which is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, band, missedOnly, unknownOnly, types, query, sort, direction]);

  const filtered = band !== 'all' || missedOnly || unknownOnly || types.size > 0 || query.trim() !== '';
  const selected = all.find((e) => e.key === selectedKey) ?? null;

  function select(key: string | null) {
    setParams(key ? { w: key } : {}, { replace: true });
  }

  function clearFilters() {
    setBand('all');
    setMissedOnly(false);
    setUnknownOnly(false);
    setTypes(new Set());
    setQuery('');
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setParams({}, { replace: true });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setParams]);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Link to="/" className={styles.back}>
          ← Home
        </Link>
        <h1 className={styles.title}>Word bank</h1>
        <p className={styles.subtitle}>
          {all.length} words and phrases · {all.filter((e) => e.status === 'learning').length} still learning
        </p>
      </header>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <button
            type="button"
            className={styles.direction}
            onClick={() => setPrefs((p) => ({ ...p, direction: p.direction === 'es-en' ? 'en-es' : 'es-en' }))}
            aria-label={`Showing ${direction === 'es-en' ? 'Spanish to English' : 'English to Spanish'}. Switch direction.`}
          >
            <span>{direction === 'es-en' ? 'Spanish' : 'English'}</span>
            <span className={styles.swap} aria-hidden="true">
              ⇄
            </span>
            <span>{direction === 'es-en' ? 'English' : 'Spanish'}</span>
          </button>

          <label className={styles.sortLabel}>
            Sort
            <select
              className={styles.select}
              value={sort}
              onChange={(e) => setPrefs((p) => ({ ...p, sort: e.target.value as Sort }))}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="az">A–Z</option>
            </select>
          </label>

          <input
            className={styles.search}
            type="search"
            placeholder="Search"
            aria-label="Search the word bank"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup} role="group" aria-label="Level">
            <span className={styles.filterLabel}>Level</span>
            {(['all', ...BANDS] as const).map((b) => (
              <button
                key={b}
                type="button"
                className={styles.chip}
                aria-pressed={band === b}
                onClick={() => setBand(b)}
              >
                {b === 'all' ? 'All' : LEVEL_BAND_LABEL[b]}
              </button>
            ))}
          </div>
          <div className={styles.filterGroup} role="group" aria-label="Show">
            <span className={styles.filterLabel}>Show</span>
            <button type="button" className={styles.chip} aria-pressed={unknownOnly} onClick={() => setUnknownOnly((v) => !v)}>
              Not known yet
            </button>
            <button type="button" className={styles.chip} aria-pressed={missedOnly} onClick={() => setMissedOnly((v) => !v)}>
              Missed in exercises
            </button>
          </div>
          <div className={styles.filterGroup} role="group" aria-label="Type">
            <span className={styles.filterLabel}>Type</span>
            {TYPE_FILTERS.map(({ pos, label }) => (
              <button
                key={pos}
                type="button"
                className={styles.chip}
                aria-pressed={types.has(pos)}
                onClick={() =>
                  setTypes((prev) => {
                    const next = new Set(prev);
                    if (next.has(pos)) next.delete(pos);
                    else next.add(pos);
                    return next;
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className={styles.resultCount} aria-live="polite">
          {filtered ? `${shown.length} of ${all.length} match` : `${shown.length} words`}
          {filtered && (
            <button type="button" className={styles.clear} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </p>
      </div>

      <div className={styles.layout}>
        {shown.length ? (
          <ul className={styles.list}>
            {shown.map((e) => (
              <li key={e.key}>
                <button
                  type="button"
                  className={`${styles.row} ${selected?.key === e.key ? styles.rowSelected : ''}`}
                  onClick={() => select(e.key)}
                  aria-current={selected?.key === e.key}
                >
                  <span className={styles.rowMain}>
                    <span className={styles.front} lang={direction === 'es-en' ? 'es' : 'en'}>
                      {front(e)}
                    </span>
                    <span className={styles.backText} lang={direction === 'es-en' ? 'en' : 'es'}>
                      {back(e)}
                    </span>
                  </span>
                  <span className={styles.rowMeta}>
                    {e.missed && <span className={styles.missed}>missed</span>}
                    <span className={`${styles.status} ${styles[e.status]}`}>{e.status}</span>
                    <span className={styles.metaText}>
                      {[e.pos.join(', '), e.levels.join(', ')].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            <p>No words match these filters.</p>
            {filtered && (
              <button type="button" className="btn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}

        <aside
          className={`${styles.panel} ${selected ? styles.panelOpen : ''}`}
          aria-live="polite"
          aria-label="Word details"
        >
          {selected ? (
            <Detail
              entry={selected}
              onClose={() => select(null)}
              onStatus={(status) => dispatch({ type: 'setWordStatus', key: selected.key, status })}
            />
          ) : (
            <p className={styles.panelEmpty}>Pick a word to see the sentences you met it in.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Detail({
  entry,
  onClose,
  onStatus,
}: {
  entry: BankEntry;
  onClose: () => void;
  onStatus: (s: 'learning' | 'known') => void;
}) {
  const { state } = useLearner();
  const contexts = contextsFor(entry.key);
  const lemma = lookupTerm(entry.key)?.senses[0]?.lemma;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <p className={styles.cardTerm} lang="es">
            {entry.es}
          </p>
          {lemma && (
            <p className={styles.cardLemma}>
              from <span lang="es">{lemma}</span>
            </p>
          )}
        </div>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      {entry.userPhrase ? (
        <p className={styles.cardGloss}>{entry.en || 'No meaning saved yet.'}</p>
      ) : (
        <ul className={styles.senses}>
          {entry.senses.map((s, i) => (
            <li key={s.id}>
              <span className={i === 0 ? styles.cardGloss : styles.senseGloss}>{s.gloss}</span>
              {s.pos && <span className={styles.pos}>{s.pos}</span>}
              {s.note && <span className={styles.senseNote}>{s.note}</span>}
            </li>
          ))}
        </ul>
      )}

      {entry.missed && <p className={styles.missedNote}>You missed this in a reading’s questions. It will come back for review.</p>}

      <div className={styles.statusRow} role="group" aria-label="Word status">
        {(['learning', 'known'] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={styles.statusBtn}
            aria-pressed={(state.words[entry.key]?.status ?? 'learning') === s}
            onClick={() => onStatus(s)}
          >
            {s === 'learning' ? 'Learning' : 'Known'}
          </button>
        ))}
      </div>

      <div className={styles.cardSection}>
        <p className={styles.cardLabel}>Where you saw it</p>
        {contexts.length ? (
          <ul className={styles.contexts}>
            {contexts.map((c, i) => (
              <li key={i}>
                <p className={styles.sentence} lang="es">
                  {highlightSegments(c.sentence, entry.key).map(({ seg, hit }, j) =>
                    hit ? <mark key={j}>{seg.text}</mark> : <span key={j}>{seg.text}</span>,
                  )}
                </p>
                <p className={styles.source}>
                  <Link to={`/read/${c.textId}${state.lessons[c.textId]?.stage === 'done' ? '?view=text' : ''}`}>
                    {c.textTitle}
                  </Link>{' '}
                  · {c.level} {LEVEL_BAND_LABEL[levelBand(c.level)].toLowerCase()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noContext}>Not in a reading yet.</p>
        )}
      </div>
    </div>
  );
}
