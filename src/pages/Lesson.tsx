import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getText } from '../data/texts';
import { useLearner } from '../store/learnerStore';
import type { LessonStage } from '../types';
import Stepper from '../components/lesson/Stepper';
import PreQuestions from '../components/lesson/PreQuestions';
import Reader from '../components/lesson/Reader';
import PostQuestions from '../components/lesson/PostQuestions';
import Comparison from '../components/lesson/Comparison';
import styles from './Lesson.module.css';

export default function Lesson() {
  const { textId = '' } = useParams();
  const text = getText(textId);
  const { state, dispatch } = useLearner();
  const lesson = state.lessons[textId];

  useEffect(() => {
    if (text && !lesson) dispatch({ type: 'startLesson', textId: text.id });
  }, [text, lesson, dispatch]);

  // Each stage starts at the top of the page.
  const stage = lesson?.stage;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stage]);

  if (!text) return <Navigate to="/" replace />;
  if (!lesson) return null;

  const go = (next: LessonStage) => dispatch({ type: 'setStage', textId: text.id, stage: next });

  return (
    <article className={styles.lesson}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          ← Library
        </Link>
        <h1 lang="es" className={styles.title}>
          {text.title}
        </h1>
        <p className={styles.subtitle}>
          {text.titleEn} · {text.level}
        </p>
        <Stepper stage={lesson.stage} />
      </header>

      {lesson.stage === 'pre' && <PreQuestions text={text} lesson={lesson} onDone={() => go('read')} />}
      {lesson.stage === 'read' && <Reader text={text} onDone={() => go('post')} />}
      {lesson.stage === 'post' && <PostQuestions text={text} lesson={lesson} onDone={() => go('compare')} />}
      {(lesson.stage === 'compare' || lesson.stage === 'done') && (
        <Comparison text={text} lesson={lesson} />
      )}
    </article>
  );
}
