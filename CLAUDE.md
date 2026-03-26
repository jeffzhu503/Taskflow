# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check (tsc -b) then bundle to dist/
npm run lint      # Run ESLint
npm run preview   # Preview the production build locally
```

## Architecture

Two-tier app: a single-page React + TypeScript + Vite frontend and a FastAPI Python backend that proxies GitHub API calls.

### Frontend

**Data flow:** `useTodos` hook (state + localStorage) → `App` (layout + filter state + view switching) → leaf components.

**Views:** `App` toggles between two top-level views — `todos` (task list) and `github` (GitHub panel). The GitHub panel calls the FastAPI backend via `src/github/client.ts`.

**Key files:**
- `src/types.ts` — `Todo`, `Category`, `FilterType` types. All three are tightly coupled; changing one likely affects all components.
- `src/hooks/useTodos.ts` — all CRUD logic. Persists to `localStorage` under key `tf_tasks`. Seeds 5 sample tasks on first load (when storage is empty).
- `src/hooks/useGitHub.ts` — GitHub data fetching logic (issues, PRs, comments).
- `src/github/client.ts` — all HTTP calls to the FastAPI backend (`/api/*`). Single source of truth for GitHub API interactions on the frontend.
- `src/github/types.ts` — TypeScript types for GitHub API responses (`IssueItem`, `PullItem`, etc.).
- `src/index.css` — all styles; dark theme via CSS custom properties on `:root`. No CSS modules or styled-components.

**Type imports:** The tsconfig uses `verbatimModuleSyntax`, so React types (`FormEvent`, `KeyboardEvent`, etc.) must use `import type { ... } from 'react'`, not plain `import`.

**Categories vs filters:** `Category` (`general | work | personal | urgent`) lives on each `Todo`. `FilterType` adds `all | pending | done` on top for UI filtering — these two do not perfectly overlap by design.

### Backend (FastAPI — `backend/`)

Python FastAPI service that acts as a bridge to GitHub's APIs. Runs at `http://localhost:8000`; the Vite dev server proxies `/api/*` requests to it.

**GitHub API usage:** Two transports live side-by-side:
- `github/graphql_client.py` — async `httpx` calls to `https://api.github.com/graphql`. Used for read-heavy queries (list/get issues, PRs, comments) where GraphQL avoids over-fetching.
- `github/rest_client.py` — async `httpx` calls to `https://api.github.com`. Used for mutations (create issue, post comment, close issue, merge PR).

**Key files:**
- `config.py` — reads `GITHUB_PAT` from `.env` via `pydantic-settings`. All clients pull the token from here.
- `models.py` — Pydantic request/response models shared across routers.
- `github/queries.py` — GraphQL query strings (`LIST_ISSUES`, `GET_ISSUE`, `LIST_PULLS`, `GET_PULL`, etc.).
- `routers/issues.py` — `GET /api/issues`, `GET /api/issues/{number}`, `POST /api/issues`, `POST /api/issues/{number}/close`, `POST /api/issues/{number}/comments`.
- `routers/pulls.py` — `GET /api/pulls`, `GET /api/pulls/{number}`, `POST /api/pulls/{number}/merge`, `POST /api/pulls/{number}/comments`.
- `routers/repo.py` — `GET /api/repo` (repo metadata).
- `routers/labels.py` — `GET /api/labels`.

**Running the backend:**
```bash
cd backend
cp .env.example .env   # set GITHUB_PAT=ghp_...
pip install -r requirements.txt
uvicorn main:app --reload
```
