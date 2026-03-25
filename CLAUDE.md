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

Single-page React + TypeScript + Vite app. No routing, no backend.

**Data flow:** `useTodos` hook (state + localStorage) → `App` (layout + filter state) → leaf components.

**Key files:**
- `src/types.ts` — `Todo`, `Category`, `FilterType` types. All three are tightly coupled; changing one likely affects all components.
- `src/hooks/useTodos.ts` — all CRUD logic. Persists to `localStorage` under key `tf_tasks`. Seeds 5 sample tasks on first load (when storage is empty).
- `src/index.css` — all styles; dark theme via CSS custom properties on `:root`. No CSS modules or styled-components.

**Type imports:** The tsconfig uses `verbatimModuleSyntax`, so React types (`FormEvent`, `KeyboardEvent`, etc.) must use `import type { ... } from 'react'`, not plain `import`.

**Categories vs filters:** `Category` (`general | work | personal | urgent`) lives on each `Todo`. `FilterType` adds `all | pending | done` on top for UI filtering — these two do not perfectly overlap by design.
