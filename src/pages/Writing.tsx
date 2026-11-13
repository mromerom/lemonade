import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FocusList, IssueList, Tag } from '../components/Feedback';
import { addons, topics } from '../content/exercises';
import {
  addonById,
  checkTranslation,
  currentSet,
  isRightTranslation,
  MIXED,
  mixedTopic,
  newSet,
  nextFromFocus,
  promptsForSet,
  suggestNext,
  topicById,
  writingFocus,
} from '../lib/writing';
import { useLearner } from '../store/learnerStore';
import type { TranslationCheck, WritingSet } from '../types';
import styles from './Writing.module.css';

/**
 * The writing exercise: pick a topic, write five sentences in English, then
 * translate them one at a time with feedback after each.
 */
export default function Writing() {
  const { state } = useLearner();
  const { setId } = useParams();
  const [params] = useSearchParams();
  const sets = state.writing?.sets ?? [];
  const set = setId ? sets.find((s) => s.id === setId) : currentSet(state);

  if (setId && !set) return <Navigate to="/exercises/write" replace />;

  return (
    <div className={styles.page}>
      <p className={styles.crumb}>
        <Link to="/exercises">Exercises</Link> / Write and translate
      </p>
      {!set ? (
        <Setup initialTopic={params.get('topic') ?? undefined} initialAddon={params.get('addon') ?? undefined} />
      ) : set.stage === 'write' ? (
        <WriteStage set={set} />
      ) : set.stage === 'translate' ? (
        <TranslateStage set={set} />
      ) : (
        <Summary set={set} />
      )}
    </div>
  );
}

function setLabel(set: WritingSet) {
  return `${topicById(set.topic)?.title ?? set.topic}${set.addon ? ` + ${addonById(set.addon)?.title}` : ''}`;
}

// ---------- Choosing a topic ----------

function TopicPicker({
  topic,
  addon,
  onTopic,
  onAddon,
  recommended,
}: {
  topic: string;
  addon?: string;
  onTopic: (id: string) => void;
  onAddon: (id?: string) => void;
  recommended?: { topic?: string; addon?: string };
}) {
  return (
    <div className={styles.picker}>
      <fieldset className={styles.fieldset}>
        <legend>Main topic</legend>
        <div className={styles.topics}>
          {[mixedTopic, ...topics].map((t) => (
            <label key={t.id} className={`${styles.topic} ${topic === t.id ? styles.topicOn : ''}`}>
              <input type="radio" name="topic" value={t.id} checked={topic === t.id} onChange={() => onTopic(t.id)} />
              <span className={styles.topicTitle}>
                {t.title}
                {recommended?.topic === t.id && <span className={styles.rec}>suggested</span>}
              </span>
              <span className={styles.topicAbout}>{t.about}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>
          Something small to add <span className={styles.optional}>(optional)</span>
        </legend>
        <div className={styles.addons}>
          {[undefined, ...addons].map((a) => (
            <label
              key={a?.id ?? 'none'}
              className={`${styles.addon} ${addon === a?.id ? styles.topicOn : ''}`}
              title={a?.about}
            >
              <input type="radio" name="addon" checked={addon === a?.id} onChange={() => onAddon(a?.id)} />
              {a ? a.title : 'Nothing extra'}
              {a && recommended?.addon === a.id && <span className={styles.rec}>suggested</span>}
            </label>
          ))}
        </div>
        {addon && <p className={styles.addonAbout}>{addonById(addon)?.about}</p>}
      </fieldset>
    </div>
  );
}

function useStartSet() {
  const { state, dispatch } = useLearner();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function start(topic: string, addon?: string) {
    setBusy(true);
    const prompts = await promptsForSet(state, topic);
    dispatch({ type: 'startWritingSet', set: newSet(topic, addon, prompts) });
    setBusy(false);
    navigate('/exercises/write');
    window.scrollTo({ top: 0 });
  }
  return { start, busy };
}

function Setup({ initialTopic, initialAddon }: { initialTopic?: string; initialAddon?: string }) {
  const [topic, setTopic] = useState(topicById(initialTopic ?? '') ? initialTopic! : MIXED);
  const [addon, setAddon] = useState(addonById(initialAddon) ? initialAddon : undefined);
  const { start, busy } = useStartSet();
  return (
    <section className={styles.stage}>
      <h1 className={styles.h1}>Write and translate</h1>
      <p className={styles.lead}>
        You’ll get five prompts about your own life. Write a sentence in English for each, then translate them into
        Spanish one by one. Each translation gets feedback straight away, and the ones that need work come back once at
        the end.
      </p>
      <TopicPicker topic={topic} addon={addon} onTopic={setTopic} onAddon={setAddon} />
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => start(topic, addon)}>
          {busy ? 'Getting prompts…' : 'Start'}
        </button>
      </div>
    </section>
  );
}

// ---------- Writing in English ----------

function WriteStage({ set }: { set: WritingSet }) {
  const { dispatch } = useLearner();
  const twist = addonById(set.addon)?.twist;
  const filled = set.items.filter((i) => i.english.trim()).length;
  return (
    <section className={styles.stage}>
      <p className={styles.kicker}>{setLabel(set)} · Step 1 of 2</p>
      <h1 className={styles.h1}>Write about your life, in English</h1>
      <p className={styles.lead}>One sentence for each prompt. Keep them short: you’ll translate them next.</p>
      <ol className={styles.prompts}>
        {set.items.map((item, i) => (
          <li key={i} className={styles.promptCard}>
            <label htmlFor={`en-${i}`} className={styles.prompt}>
              {item.prompt}
              {twist && <span className={styles.twist}>Also: {twist}</span>}
            </label>
            <input
              id={`en-${i}`}
              className={styles.input}
              lang="en"
              type="text"
              maxLength={200}
              autoComplete="off"
              placeholder="One sentence in English"
              value={item.english}
              onChange={(e) => dispatch({ type: 'setWritingEnglish', setId: set.id, index: i, english: e.target.value })}
            />
          </li>
        ))}
      </ol>
      <div className={styles.actions}>
        <span className={styles.count}>
          {filled} of {set.items.length} written
        </span>
        <button
          type="button"
          className="btn btn-primary"
          disabled={filled < set.items.length}
          onClick={() => {
            dispatch({ type: 'startTranslating', setId: set.id });
            window.scrollTo({ top: 0 });
          }}
        >
          Translate them →
        </button>
      </div>
    </section>
  );
}

// ---------- Translating ----------

const VERDICT: Record<TranslationCheck['meaning'], string> = {
  correct: 'Right',
  partly: 'Partly there',
  incorrect: 'Not quite',
};

/** The check of one translation: verdict, mistakes, the fixed sentence and another way to say it. */
function TranslationFeedback({ check, showFixes = true }: { check: TranslationCheck; showFixes?: boolean }) {
  const right = isRightTranslation(check);
  const slip = !right && check.meaning === 'correct';
  return (
    <div className={styles.feedback}>
      <p className={`${styles.verdict} ${right ? styles.good : slip ? styles.warn : styles.bad}`}>
        <strong>{right ? 'Right' : slip ? 'Right meaning, with mistakes' : VERDICT[check.meaning]}</strong>
        {check.comment && <span>. {check.comment}</span>}
      </p>
      {showFixes ? (
        <IssueList issues={check.issues} />
      ) : (
        <ul className={styles.hints}>
          {check.issues.map((issue, i) => (
            <li key={i}>
              <Tag text={issue.category} bad={issue.category !== 'accent'} /> {issue.tip}
            </li>
          ))}
        </ul>
      )}
      {showFixes && check.corrected && (
        <p className={styles.note}>
          <span className={styles.noteLabel}>Your sentence, fixed</span>
          <span lang="es">{check.corrected}</span>
        </p>
      )}
      {showFixes && check.alternative && (
        <p className={styles.note}>
          <span className={styles.noteLabel}>Another way to say it</span>
          <span lang="es">{check.alternative}</span>
        </p>
      )}
    </div>
  );
}

function TranslateStage({ set }: { set: WritingSet }) {
  const { dispatch } = useLearner();
  const [draft, setDraft] = useState('');
  const [checking, setChecking] = useState(false);
  const index = set.queue[set.pos];
  const item = set.items[index];
  const retry = set.pos >= set.items.length;
  const turn = retry ? item.attempts[1] : item.attempts[0];
  const retries = set.queue.length - set.items.length;

  async function runCheck(spanish: string) {
    setChecking(true);
    try {
      const check = await checkTranslation(set, item.english, spanish);
      dispatch({ type: 'setTranslationCheck', setId: set.id, index, check });
    } catch {
      dispatch({ type: 'setTranslationCheck', setId: set.id, index, failed: true });
    }
    setChecking(false);
  }

  function submit() {
    const spanish = draft.trim();
    if (!spanish) return;
    dispatch({ type: 'addTranslationAttempt', setId: set.id, index, spanish });
    setDraft('');
    void runCheck(spanish);
  }

  const navigate = useNavigate();
  function next() {
    dispatch({ type: 'nextTranslation', setId: set.id });
    // The last turn finishes the set: show its summary at its own address.
    if (set.pos + 1 >= set.queue.length) navigate(`/exercises/write/${set.id}`);
    window.scrollTo({ top: 0 });
  }

  return (
    <section className={styles.stage}>
      <p className={styles.kicker}>
        {setLabel(set)} · Step 2 of 2 ·{' '}
        {retry ? `Second try, ${set.pos - set.items.length + 1} of ${retries}` : `Sentence ${set.pos + 1} of ${set.items.length}`}
      </p>
      <h1 className={styles.h1}>Translate it into Spanish</h1>

      <div className={styles.translateCard}>
        <p className={styles.promptSmall}>{item.prompt}</p>
        <p className={styles.english} lang="en">
          {item.english}
        </p>

        {retry && item.attempts[0]?.check && (
          <div className={styles.lastTime}>
            <p className={styles.noteLabel}>Last time</p>
            <p lang="es" className={styles.attempt}>
              {item.attempts[0].spanish}
            </p>
            <TranslationFeedback check={item.attempts[0].check} showFixes={false} />
          </div>
        )}

        {!turn ? (
          <form
            className={styles.answerRow}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor="es" className="visually-hidden">
              Your translation
            </label>
            <input
              id="es"
              className={styles.input}
              lang="es"
              type="text"
              maxLength={300}
              autoComplete="off"
              spellCheck={false}
              autoFocus
              placeholder="En español"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
              Check
            </button>
          </form>
        ) : (
          <>
            <p className={styles.yourAnswer}>
              <span className={styles.noteLabel}>Your translation</span>
              <span lang="es">{turn.spanish}</span>
            </p>
            {checking || (!turn.check && !turn.failed) ? (
              <p className={styles.checking}>Checking…</p>
            ) : turn.check ? (
              <TranslationFeedback check={turn.check} />
            ) : (
              <div className={styles.feedback}>
                <p className={styles.checking}>The check isn’t available right now.</p>
                <div className={styles.actions}>
                  <button type="button" className="btn btn-quiet" onClick={() => void runCheck(turn.spanish)}>
                    Try again
                  </button>
                </div>
              </div>
            )}
            {turn.check && !retry && !isRightTranslation(turn.check) && (
              <p className={styles.comesBack}>This one will come back for a second try at the end.</p>
            )}
          </>
        )}
      </div>

      {turn && !checking && (turn.check || turn.failed) && (
        <div className={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={next}>
            {set.pos + 1 >= set.queue.length ? 'See the summary →' : 'Next →'}
          </button>
        </div>
      )}
    </section>
  );
}

// ---------- Summary ----------

function Summary({ set }: { set: WritingSet }) {
  const { state } = useLearner();
  const focus = writingFocus(set);
  const suggestions = focus.length ? [] : suggestNext(state, set);
  const recommended = focus.length
    ? nextFromFocus(focus)
    : { topic: suggestions.find((s) => s.topic)?.topic, addon: suggestions.find((s) => s.addon)?.addon };
  const [topic, setTopic] = useState(recommended.topic ?? set.topic);
  const [addon, setAddon] = useState<string | undefined>(recommended.addon);
  const { start, busy } = useStartSet();
  const firstRight = set.items.filter((i) => isRightTranslation(i.attempts[0]?.check)).length;
  const inProgress = currentSet(state);

  return (
    <section className={styles.stage}>
      <p className={styles.kicker}>{setLabel(set)}</p>
      <h1 className={styles.h1}>Your sentences</h1>
      <p className={styles.lead}>
        {firstRight} of {set.items.length} right on the first try.
      </p>

      <ol className={styles.summaryList}>
        {set.items.map((item, i) => (
          <li key={i} className={styles.summaryItem}>
            <p className={styles.english} lang="en">
              {item.english}
            </p>
            {item.attempts.map((a, k) => {
              const right = isRightTranslation(a.check);
              return (
                <div key={k} className={styles.summaryAttempt}>
                  <p className={styles.attemptLine}>
                    <span className={`${styles.mark} ${a.check ? (right ? styles.good : styles.bad) : ''}`} aria-hidden="true">
                      {a.check ? (right ? '✓' : '✗') : '·'}
                    </span>
                    <span className={styles.noteLabel}>{k === 0 ? 'First try' : 'Second try'}</span>
                    <span lang="es">{a.spanish}</span>
                  </p>
                  {a.check && !right && <TranslationFeedback check={a.check} />}
                  {a.check && right && a.check.alternative && (
                    <p className={styles.note}>
                      <span className={styles.noteLabel}>Another way to say it</span>
                      <span lang="es">{a.check.alternative}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </li>
        ))}
      </ol>

      <div className={styles.focusBox}>
        {focus.length ? (
          <>
            <h2 className={styles.h2}>{focus.length === 1 ? 'One thing to work on' : `${focus.length} things to work on`}</h2>
            <FocusList focus={focus} />
          </>
        ) : (
          <>
            <h2 className={styles.h2}>No mistakes. Something to try next:</h2>
            <ul className={styles.suggestions}>
              {suggestions.map((s) => (
                <li key={s.topic ?? s.addon}>
                  <button
                    type="button"
                    className={styles.suggestion}
                    onClick={() => (s.topic ? setTopic(s.topic) : setAddon(s.addon))}
                  >
                    <strong>{s.title}</strong>
                    <span>{s.about}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {inProgress ? (
        <div className={styles.actions}>
          <Link to="/exercises/write" className="btn btn-primary">
            Back to your set in progress
          </Link>
        </div>
      ) : (
        <div className={styles.next}>
          <h2 className={styles.h2}>Next set</h2>
          <TopicPicker topic={topic} addon={addon} onTopic={setTopic} onAddon={setAddon} recommended={recommended} />
          <div className={styles.actions}>
            <Link to="/exercises" className="btn btn-quiet">
              Back to exercises
            </Link>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => start(topic, addon)}>
              {busy ? 'Getting prompts…' : 'Start the next set'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
