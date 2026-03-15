# Overview

SciBlock is a full-stack scientific lab management platform built as a pnpm workspace monorepo. It serves as a comprehensive digital lab notebook — covering experiment creation, tracking, team coordination, and weekly reporting — for academic research groups.

Key capabilities:
- User authentication and role-based access control (student / instructor).
- Creation and management of "SciNotes" (experiment notebooks) via a 6-step wizard.
- A 3-panel experiment workbench (Ontology, Editor, Utility) with TipTap rich-text, module-level editing, and AI report generation.
- Team member management: invite students, student card grid, per-student detail tabs.
- Messaging inbox: invitation, comment, and share-request notifications.
- Weekly report system: student creation/submission flow; instructor review with comments.
- AI chat integration (Aliyun DashScope / OpenAI).
- Calendar view.

# User Preferences

Iterative development with clear communication on significant changes. Detailed explanations for complex features or architectural decisions. Ask before making major changes to project structure or core functionality.

# System Architecture

The project is a pnpm monorepo with `artifacts/` (deployable services) and `lib/` (shared libraries).

## Frontend (`artifacts/web`)

- **Framework**: React 19 + Vite 6 + TypeScript
- **Routing**: Wouter
- **State**: React Context (`SciNoteStoreContext`, `UserContext`, `TrashContext`, etc.)
- **UI**: shadcn/ui primitives + Tailwind CSS
- **API client**: `src/api/` — `client.ts` (apiFetch + token helpers), `auth.ts`, `scinotes.ts`
- **Auth**: JWT stored in `localStorage["sciblock:token"]`; injected as `Authorization: Bearer <token>` on every API call
- **Base path**: `BASE_PATH` env var (defaults to `/`); injected by Replit at runtime
- **Port**: `PORT` env var (default 22333)
- **SciNote persistence**: API-first (Go backend); localStorage fallback when API unavailable

## Express API Server (`artifacts/api-server`)

- **Framework**: Express 5
- **Port**: `PORT` env var (default 8080); Replit routes all `/api/*` here
- **Auth**: Stateless — `X-User-Id` header set by client (legacy) + JWT forwarded to Go
- **Password hashing**: bcrypt
- **Database**: `@workspace/db` (Drizzle ORM over PostgreSQL)
- **Routes**: `src/routes/` — messages, team, reports, AI chat, weekly-reports
- **Go API proxy**: `http-proxy-middleware` forwards these prefixes to Go:
  - `POST /api/auth/login` → Go (JWT issuance)
  - `GET  /api/auth/me`    → Go (JWT verification)
  - `POST /api/auth/logout`→ Go
  - `/api/scinotes/*`      → Go (SciNote CRUD)
  - `/api/experiments/*`   → Go (ExperimentRecord CRUD)
- **Owns tables**: `users` (shared), `students`, `papers`, `weekly_reports`, `report_comments`, `messages`

## Go API Server (`artifacts/go-api`)

- **Framework**: chi v5
- **Port**: `PORT` env var (default 8082, internal — accessed via Express proxy)
- **Auth**: JWT (HMAC-HS256) signed on login; `RequireAuth` middleware verifies on protected routes
- **Database**: pgx/v5 connection pool (same PostgreSQL as Express)
- **Migrations**: goose v3 — SQL files in `internal/db/migrations/`; `AUTO_MIGRATE=true` runs on startup
- **Owns tables**: `scinotes`, `experiment_records`; ALTER `users` to add `role` column
- **Status**: Fully implemented — all 3 pgx repositories (user, scinote, experiment), all 15 API endpoints tested
- **Restore semantics**: `experiment_service.Restore()` rejects restore if parent SciNote is soft-deleted (returns 403)
- **Module path**: `sciblock/go-api`
- **Key packages**:
  - `cmd/server/main.go` — entrypoint, router wiring, graceful shutdown
  - `internal/config` — env var loading with defaults
  - `internal/db` — pgx pool factory + embedded migrations FS
  - `internal/domain` — pure domain types (User, SciNote, ExperimentRecord)
  - `internal/repository` — pgx implementations of SciNote + Experiment repos
  - `internal/service` — business logic (AuthService, SciNoteService, ExperimentService)
  - `internal/handler` — HTTP handlers wired to chi routes
  - `internal/middleware` — CORS + RequireAuth JWT middleware
  - `internal/dto` — JSON request/response structs
- **Required env vars**: `DATABASE_URL`, `JWT_SECRET`

## Shared Libraries (`lib/`)

- **`lib/db`**: Drizzle ORM schema + migration utilities for PostgreSQL
- **`lib/api-spec`**: OpenAPI 3.1 spec + Orval config
- **`lib/api-zod`**: Generated Zod schemas
- **`lib/api-client-react`**: Generated React Query hooks

## Database Migration Strategy

| Tool   | Owner      | Tables |
|--------|------------|--------|
| Drizzle / db:push | Express | `users`, `students`, `papers`, `weekly_reports`, `report_comments`, `messages` |
| goose  | Go backend | `users.role` (ALTER), `scinotes`, `experiment_records` |

Both tools target the same PostgreSQL database. All goose migrations use `IF NOT EXISTS` / `IF EXISTS` to be idempotent alongside Drizzle.

## Dev Scripts

| Command | Effect |
|---------|--------|
| `bash scripts/seed-dev-user.sh` | Create dev test user (`dev@sciblock.local` / `DevPass1234`, role: instructor) |
| `pnpm dev` | Start all services (web + express + go) |
| `pnpm dev:web` | Frontend only |
| `pnpm dev:api` | Express only |
| `pnpm dev:go` | Go API only |
| `pnpm build` | Production build of all services |
| `pnpm migrate` | Run Drizzle push + goose up |

## Replit Workflows

| Workflow | Command | Port |
|----------|---------|------|
| `artifacts/web: web` | `pnpm --filter @workspace/web run dev` | 22333 |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |
| `artifacts/go-api: Go API` | `cd artifacts/go-api && AUTO_MIGRATE=true go run ./cmd/server/main.go` | 8082 (internal) |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | 8081 |

## Core Technologies

- **Monorepo**: pnpm workspaces
- **Languages**: TypeScript 5.9 (frontend + Express), Go 1.25 (Go API)
- **Node.js**: 24
- **Database**: PostgreSQL (Drizzle ORM + pgx/v5 + goose migrations)
- **Build**: esbuild (Express), Vite (frontend), `go build` (Go binary)
- **Validation**: Zod (Express/frontend), chi URL params (Go)
- **API codegen**: Orval (from OpenAPI spec)
- **UI**: shadcn/ui + Tailwind CSS + TipTap

# External Dependencies

- **PostgreSQL**: Primary database
- **bcrypt**: Password hashing (Express + Go via golang.org/x/crypto)
- **TipTap**: Rich-text editor in the workbench
- **OpenAPI / Orval**: API spec + client/schema codegen
- **shadcn/ui**: UI component library
- **Wouter**: Lightweight React router
- **chi**: Go HTTP router
- **golang-jwt/jwt**: JWT signing and verification (Go)
- **pgx/v5**: PostgreSQL driver for Go
- **goose**: Database migration tool (Go)
- **http-proxy-middleware**: Express → Go API proxy (Node.js)
- **Aliyun DashScope / OpenAI**: AI chat providers
