# TaskFlow

A personal task management app with a built-in GitHub integration panel. Manage your daily todos and monitor GitHub issues and pull requests — all in one place.

## Features

**Todo Management**
- Add, complete, and delete tasks with category tags: `work`, `personal`, `urgent`, `general`
- Filter tasks by status (`All`, `Pending`, `Done`) or category
- Progress bar showing overall completion percentage
- Stats summary (total / done / pending counts)
- Persists to `localStorage` — survives page refreshes

**GitHub Panel**
- Connect to any GitHub repository using a personal access token
- Browse open issues and pull requests
- View issue/PR details and comments
- Post comments directly from the app
- Create new issues
- Import a GitHub issue as a todo task with one click

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styles | Plain CSS with dark theme via CSS custom properties |
| State | `useTodos` hook + `localStorage` |
| GitHub API | FastAPI bridge (Python) + GitHub REST & GraphQL APIs |

## Getting Started

### Frontend

```bash
npm install
npm run dev       # Dev server at http://localhost:5173
npm run build     # Type-check + bundle to dist/
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

### Backend (GitHub Bridge)

The GitHub panel requires the FastAPI backend to proxy GitHub API calls.

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # Add your GitHub personal access token
uvicorn main:app --reload
```

The backend runs at `http://localhost:8000`. API docs available at `http://localhost:8000/docs`.

## Project Structure

```
src/
├── App.tsx                    # Root layout, view switching (Todos ↔ GitHub)
├── types.ts                   # Todo, Category, FilterType types
├── hooks/
│   ├── useTodos.ts            # All todo CRUD logic + localStorage persistence
│   └── useGitHub.ts           # GitHub data fetching logic
├── components/
│   ├── AddForm.tsx            # New task input form
│   ├── TodoList.tsx           # Filtered task list
│   ├── TodoItem.tsx           # Individual task row
│   ├── Footer.tsx             # Clear completed button
│   └── github/
│       ├── GitHubPanel.tsx    # GitHub tab root
│       ├── RepoSetupForm.tsx  # Token + repo input
│       ├── IssueList.tsx      # Issue browser
│       ├── IssueDetail.tsx    # Issue detail + comments
│       ├── PullList.tsx       # PR browser
│       ├── PullDetail.tsx     # PR detail + comments
│       ├── CreateIssueForm.tsx
│       └── CommentForm.tsx
├── github/
│   ├── client.ts              # API calls to the FastAPI backend
│   ├── config.ts              # Base URL config
│   └── types.ts               # GitHub API response types
└── index.css                  # All styles (dark theme)

backend/
├── main.py                    # FastAPI app + CORS
├── config.py                  # GitHub token config
├── models.py                  # Pydantic models
├── requirements.txt
└── routers/
    ├── repo.py                # GET /api/repo
    ├── issues.py              # Issues endpoints
    ├── pulls.py               # Pull requests endpoints
    └── labels.py              # Labels endpoints
```
