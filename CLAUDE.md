# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Lookbook is a portfolio/directory web app for TWG (The Working Group). It displays people (profiles) and projects, with admin tooling for managing entries. Stack: React + Vite frontend, Express.js backend, PostgreSQL database.

## Commands

### Development
```bash
# Run both frontend and backend together
npm run dev

# Or individually:
cd backend && npm run dev     # Express server on port 4002 (nodemon)
cd frontend && npm run dev    # Vite dev server on port 5173 (proxies /api → 4002)
```

### Frontend
```bash
cd frontend
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview built output
```

### Backend
```bash
cd backend
npm run db:check    # Test database connection
npm run db:segundo  # Switch to "segundo" (production-like) DB
npm run db:local    # Switch to local DB
npm run verify      # Verify full setup
```

### Database
Migrations are plain `.sql` files in `database/migrations/`. Apply them manually against the target database. No automated migration runner — connect via psql and run files in order.

### No Tests
There is no test framework. The backend test script is a placeholder. `backend/check-db.js` and `backend/verify-setup.js` are manual verification tools.

## Architecture

### Frontend (`frontend/src/`)
- **`App.jsx`** — Root router. All page components are lazy-loaded with React.lazy/Suspense. Admin routes are wrapped in `ProtectedRoute`.
- **`pages/`** — One file per route. Main public routes: `/` (home), `/people/:slug`, `/projects/:slug`, `/search`, `/share`. Admin routes under `/admin/`.
- **`components/`** — Reusable UI. shadcn/ui Radix primitives live in `components/ui/`.
- **`contexts/`** — `AuthContext` (JWT + localStorage), `LoadingProgressContext`.
- **`utils/api.js`** — Axios client with request deduplication and in-memory caching. All API calls go through here.
- **`utils/cache.js`** — Client-side cache with TTL and request merging to prevent duplicate in-flight calls.

Vite proxies `/api/*` to `http://localhost:4002` in development, so the frontend always talks to `/api/...` regardless of environment.

### Backend (`backend/`)
- **`server.js`** — Express app entry. Sets up middleware (compression, CORS, JWT), mounts all routers, warms the in-memory cache on startup.
- **`routes/`** — Modular Express routers by feature: `auth`, `profiles`, `projects`, `initiatives`, `taxonomy`, `search`, `sharepack`, `ai`, `contact`.
- **`queries/`** — Database query functions separated from route handlers. Each entity (`profiles`, `projects`, `taxonomy`, `initiatives`) has a dedicated query file using parameterized SQL with CTEs.
- **`db/dbConfig.js`** — PostgreSQL connection pool. Reads `DATABASE_URL` or individual `DB_*` env vars. Supports SSL for remote (Cloud SQL) connections.

Backend base URL: `http://localhost:4002/api`. Health: `/api/health` and `/api/health/db`.

### Database
Five main tables (all prefixed `lookbook_`):
- `lookbook_profiles` — People with skills (array), sectors (array), photo, links
- `lookbook_projects` — Projects with image, tags, metadata
- `lookbook_project_participants` — M2M between projects and profiles
- `lookbook_experience` — Work/education timeline per profile
- `lookbook_initiatives` — Cohort/initiative groupings

Tables join to an external `users` table (managed elsewhere). Always use `LEFT JOIN` when referencing it.

Skills and sectors are stored as PostgreSQL arrays. Filtering uses `@>` array containment operator with GIN indexes.

### Caching
Two layers:
1. **Backend in-memory cache**: Profiles (5-min TTL), Projects (10-min TTL). Warmed at startup.
2. **Browser cache headers**: Set per-route (5–60 min depending on content type). Images: 7-day cache.

Cache is invalidated on admin writes. The `people-fetch` version counter prevents stale results from overwriting fresh ones during concurrent fetches.

### Authentication
JWT-based. Credentials in env vars (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). Login via `POST /api/auth/login` returns a 7-day token. Token stored in localStorage, attached as `Authorization: Bearer <token>` header via Axios interceptor.

### Image Handling
- Client-side compression before upload (browser-image-compression)
- Backend processing with Sharp and pdf-lib
- Uploaded files served from `backend/public/uploads/`
- Base64 images converted on backend via `utils/imageConverter.js`

## Environment
Copy `.env.local.example` to `.env.local`. Key variables:
- `DATABASE_URL` or individual `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- `OPENAI_API_KEY` (for AI features)
- `FEATURE_SEMANTIC_SEARCH=true` to enable pgvector semantic search

## Deployment
Defined in `render.yaml` — two services: a Node.js backend and a static frontend. Frontend build output is `frontend/dist/`.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
