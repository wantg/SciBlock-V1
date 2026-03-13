# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

### `artifacts/web` (`@workspace/web`)

React + Vite frontend. Routes:
- `/login` — SciBlock login page
- `/home` — Home page (post-login, sidebar layout)
- `/signup` — "Access by Invitation" page (no public registration)
- `/` — redirects to `/login`

#### Frontend source structure (`artifacts/web/src/`)

```
src/
├── types/                  # Shared TypeScript interfaces
│   ├── auth.ts             # User, LoginRequest, LoginResponse
│   └── note.ts             # Note
├── api/                    # All HTTP calls (one file per domain)
│   ├── client.ts           # apiFetch() base wrapper + ApiError class
│   └── auth.ts             # login()
├── hooks/                  # Business logic hooks (no UI)
│   └── useLogin.ts         # Login form state, validation, submission
├── config/                 # App configuration data (no components)
│   └── navigation.ts       # NavItem / NavGroup types + TOP_NAV / NAV_GROUPS arrays
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx   # Authenticated page shell (sidebar + topbar + main)
│   │   └── TopBar.tsx      # Top header bar component
│   └── ui/                 # shadcn/ui primitives
└── pages/
    ├── login/
    │   ├── LoginPage.tsx    # Page shell
    │   ├── AuthCard.tsx     # Form — uses useLogin hook
    │   ├── InputField.tsx   # Controlled input with label + error
    │   ├── CheckboxField.tsx
    │   └── AuthButton.tsx
    ├── home/
    │   ├── AppSidebar.tsx   # Sidebar — reads config/navigation.ts + useSciNotes hook
    │   ├── NavLink.tsx      # Single nav link (active state)
    │   ├── QueryBox.tsx     # AI text input card
    │   ├── NoteCard.tsx     # Single note card
    │   └── RecentNotes.tsx  # Recent notes section (list of NoteCard)
    ├── personal/
    │   └── NewExperimentPage.tsx  # Placeholder — new SciNote creation
    ├── HomePage.tsx         # Composes AppLayout + QueryBox + RecentNotes
    ├── RequestAccessPage.tsx
    └── not-found.tsx
```

**Conventions:**
- Pages compose layout + feature components only; no raw fetch/state logic inside pages
- `api/` modules are pure async functions; they throw `ApiError` on non-2xx
- Hooks own form/business state and call `api/` functions
- `config/navigation.ts` is pure data — no JSX; sidebar reads it at render time
- `data/` holds placeholder data that mirrors future API responses
- New static nav items: add to `NAV_GROUPS` in `config/navigation.ts`
- New dynamic personal SciNotes: managed by `hooks/useSciNotes.ts` (replace with API when ready)
- Sidebar "个人" group items come from `useSciNotes`, not from static config
- `NavGroup.action` — optional `{ label, href }` renders a "+" button next to the group title
- New API endpoints: add a function in the matching `api/` file

**Routes:**
- `/home` — main home page
- `/signup` — access by invitation (no public registration)
- `/personal/new-experiment` — placeholder for new SciNote creation
- `/personal/note/:id` — individual SciNote (not yet routed, navigation hrefs exist)

### `artifacts/api-server` (`@workspace/api-server`)

Express backend. Routes:
- `POST /api/auth/login` — login against real users table (bcrypt password check)
- `POST /api/admin/users` — admin-only: create user. Requires `X-Admin-Secret` header matching `ADMIN_SECRET` env var
- `GET /api/healthz` — health check

Admin user creation example:
```
curl -X POST /api/admin/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: <ADMIN_SECRET value>" \
  -d '{"email":"user@example.com","password":"pass123","name":"User Name"}'
```

## Database

- `users` table: id (uuid), email (unique), password_hash (bcrypt), name, created_at

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
