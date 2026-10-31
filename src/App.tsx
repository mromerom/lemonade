import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Library from './pages/Library';
import Lesson from './pages/Lesson';
import WordBank from './pages/WordBank';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Library />} />
        <Route path="read/:textId" element={<Lesson />} />
        <Route path="words" element={<WordBank />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
