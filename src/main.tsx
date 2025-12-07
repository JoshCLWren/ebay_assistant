/**
 * To run locally:
 *   1. cd frontend && npm install
 *   2. npm run dev
 * The dev server proxies API requests to the FastAPI backend specified by
 * VITE_API_BASE_URL (defaults to http://127.0.0.1:8000) to avoid CORS issues.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
