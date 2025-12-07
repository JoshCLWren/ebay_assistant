/**
 * To run locally:
 *   1. cd frontend && npm install
 *   2. VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
 *      (omit the env var to fall back to http://127.0.0.1:8000)
 * The backend URL is pulled from import.meta.env.VITE_API_BASE_URL so tweak it
 * if you are serving the FastAPI instance from a different host/IP.
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
