# Comics Library Frontend

Mobile-first React + TypeScript UI for browsing your CLZ-style comics library and managing photo uploads for eBay listings. It consumes the FastAPI backend that serves the OpenAPI schema at `http://127.0.0.1:8000/docs`.

## Getting Started

```bash
npm install
npm run dev
```

The dev server proxies API and media requests to the FastAPI backend so you don't need to deal with browser CORS errors. It targets `http://127.0.0.1:8000` by default; override it with the `VITE_API_BASE_URL` env var when your backend lives elsewhere, e.g.:

```bash
VITE_API_BASE_URL=http://192.168.1.50:8000 npm run dev -- --host 0.0.0.0 --port 4173
```

Then open `http://192.168.1.50:4173` on your phone.

## Build & Preview

```bash
npm run build
npm run preview
```

This runs the Vite production build and serves the generated `dist/` output locally.
