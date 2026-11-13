import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Library from './pages/Library';
import Lesson from './pages/Lesson';
import WordBank from './pages/WordBank';
import Exercises from './pages/Exercises';
import Writing from './pages/Writing';
import Proofread from './pages/Proofread';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Library />} />
        <Route path="read/:textId" element={<Lesson />} />
        <Route path="words" element={<WordBank />} />
        <Route path="exercises" element={<Exercises />} />
        <Route path="exercises/write" element={<Writing />} />
        <Route path="exercises/write/:setId" element={<Writing />} />
        <Route path="exercises/proofread" element={<Proofread />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
