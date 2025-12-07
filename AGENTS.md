# Repository Guidelines

## Project Structure & Module Organization
`src/` contains all product code: `main.tsx` wires Vite/React, `App.tsx` holds routing shell, `components/` stores reusable UI building blocks, `pages/` implements eBay-specific flows, `hooks/` centralizes stateful logic, and `api.ts` wraps backend calls against `openapi.json`. Global styles and Tailwind directives live in `src/index.css`. Static assets go under `src/assets/`, while `public/` holds files served verbatim (favicons, manifest). Production bundles emit into `dist/`; never edit it directly.

## Build, Test, and Development Commands
- `npm run dev` – Launch the Vite dev server with hot reload; pass `--host` when testing on mobile.
- `npm run build` – Type-checks via `tsc -b` and emits optimized assets into `dist/`.
- `npm run preview` – Serves the build output for local smoke tests.
- `npm run lint` – Runs ESLint across the repo; it is the gatekeeper before pushing.

## Coding Style & Naming Conventions
Use TypeScript + React with functional components and hooks. Prefer descriptive PascalCase filenames for components (`components/ListingGrid.tsx`) and camelCase for utilities. Keep styles in Tailwind utility classes; fall back to scoped CSS modules only when necessary. Indent with two spaces, embrace optional chaining instead of defensive branching, and keep side effects inside `useEffect`. Run `npm run lint` before committing; configure your editor to respect the repo’s ESLint + TypeScript settings.

## Testing Guidelines
No automated test runner is checked in yet, so rely on the Vite preview for regressions. When adding tests, colocate `*.test.tsx` files next to the feature, use Vitest + React Testing Library for component coverage, and stub API interactions via MSW. Make sure each test names the scenario explicitly (`renders_missing_state`) and document any flaky cases in the pull request.

## Commit & Pull Request Guidelines
Follow the current Git history style: short, imperative subjects (`fix cors`, `change to dark mode`). Each commit should represent a reviewable chunk with lint passing. Pull requests must include:
- Summary of changes plus why they help eBay listing workflows.
- Linked issue or TODO reference.
- Screenshots/GIFs for UI tweaks and notes on responsive states.
- Verification steps (commands run, browsers checked, API base URL used).
Keep branches up to date with `main` and re-run `npm run lint && npm run build` before requesting review.
