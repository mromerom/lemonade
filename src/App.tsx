import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Library from './pages/Library';
import Lesson from './pages/Lesson';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Library />} />
        <Route path="read/:textId" element={<Lesson />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
