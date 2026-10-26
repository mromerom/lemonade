// Global styles load first so component styles can override them.
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { LearnerProvider } from './store/learnerStore';
import App from './App';

// Hash routing for hosts that don't rewrite routes to index.html (e.g. in-chat previews).
const Router = import.meta.env.VITE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <LearnerProvider>
        <App />
      </LearnerProvider>
    </Router>
  </StrictMode>,
);
