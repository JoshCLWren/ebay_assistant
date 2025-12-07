# Comics Library Frontend

Mobile-first React + TypeScript UI for browsing your CLZ-style comics library and managing photo uploads for eBay listings. It consumes the FastAPI backend that serves the OpenAPI schema at `http://127.0.0.1:8000/docs`.

## Getting Started

```bash
npm install
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

The `VITE_API_BASE_URL` env var is optional (defaults to `http://127.0.0.1:8000`). Use your machine's LAN IP when testing from a phone on the same WiFi, e.g.:

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
