# SciBlock — Self-Hosting Guide

This guide covers running SciBlock on your own machine, from a blank database
to a fully working development environment.

Scope: local development only. Production hardening (TLS, reverse proxy,
process supervision) is out of scope for this document.

---

## Prerequisites

| Tool        | Minimum version | Notes                                       |
|-------------|-----------------|---------------------------------------------|
| Go          | 1.21            | Tested on 1.25                              |
| Node.js     | 20              | Tested on 24                                |
| pnpm        | 9               | Tested on 10; install via `npm i -g pnpm`   |
| PostgreSQL  | 14              | Tested on 16; must be running before step 3 |

---

## Environment Variables

All four values must be set before any service starts.

| Variable        | Required by       | Default     | Description                                          |
|-----------------|-------------------|-------------|------------------------------------------------------|
| `DATABASE_URL`  | all               | —           | `postgresql://user:pass@host:5432/dbname`            |
| `JWT_SECRET`    | Go API, Express   | —           | HMAC signing key for JWT tokens; **must be the same value in both services** |
| `PORT`          | Express API       | —           | Express API listening port (suggested: `8080`)       |
| `PORT`          | Frontend          | —           | Vite dev server port (suggested: `5173`)             |
| `PORT`          | Go API            | `8082`      | Go API listening port; override if 8082 is taken     |
| `GO_API_URL`    | Express API       | `http://localhost:8082` | URL Express uses to proxy to the Go API |
| `CORS_ORIGINS`  | Go API            | (empty = allow all) | Comma-separated list of allowed origins in production |

**Suggested local `.env` (source before starting each terminal):**

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sciblock"
export JWT_SECRET="sciblock-jwt-dev-secret-change-in-prod"
```

Express API and the Go API **must share the same `JWT_SECRET`** — Express
validates tokens that the Go API issues.

---

## ⚠️  Production: secrets you must replace

Before exposing SciBlock to any non-local network, replace these two values:

### `JWT_SECRET`

- **Used by:** Go API (signs tokens) and Express API (validates tokens).
- Both services **must use the same value**. If they differ, every request
  that goes through Express will return `401 Unauthorized`.
- Generate a strong key: `openssl rand -hex 32`
- Set it in both service environments:
  ```bash
  JWT_SECRET=<output of openssl rand -hex 32>
  ```

### `CORS_ORIGINS` (Go API only)

- Without this, the Go API returns `Access-Control-Allow-Origin: *` (all
  origins allowed), which is acceptable for development but not for production.
- Set it to the exact origin(s) of your frontend:
  ```bash
  CORS_ORIGINS=https://sciblock.example.com
  # Multiple origins:
  CORS_ORIGINS=https://sciblock.example.com,https://staging.sciblock.example.com
  ```
- When set, requests from any other origin are rejected with `403`.

---

## First-Time Setup (blank database → running)

Run these steps in order, once:

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. (Existing environments only) Baseline the initial migration as applied.
#    Skip this step on a brand-new empty database.
bash scripts/db-baseline.sh

# 3. Create all tables and apply every migration (including FK constraints)
pnpm migrate

# 4. Seed development accounts and demo data
bash scripts/seed-dev.sh

# 5. Start the Go API  (terminal A)
export PORT=8082  # or omit to use the default
cd artifacts/go-api && go run ./cmd/server/main.go

# 6. Start the Express API  (terminal B)
export PORT=8080
pnpm --filter @workspace/api-server run dev

# 7. Start the frontend  (terminal C)
export PORT=5173
pnpm --filter @workspace/web run dev
```

After step 4, two accounts are ready:

| Role       | Email                  | Password       |
|------------|------------------------|----------------|
| Instructor | dev@sciblock.local     | DevPass1234    |
| Student    | demo@sciblock.com      | DemoPass1234   |

---

## Service Topology and Startup Order

```
Browser
  └─► Frontend          :5173  (Vite, React)
        └─► Express API :8080  (Node.js / Express)
              ├── handles directly (Express routes)
              └── proxies to Go API :8082 (Go / net/http)
```

**Startup order:**

1. PostgreSQL — must be running before any service
2. Go API — handles auth and SciNote / experiment routes
3. Express API — proxies some paths to the Go API; returns `502` if Go is
   unreachable (does not crash, safe to start in any order relative to Go)
4. Frontend — connects only to the Express API

---

## Request Routing

The Express API is the single external entry point. Depending on the path, it
either handles the request itself or proxies it transparently to the Go API.

### Handled directly by Express (`localhost:8080`)

| Path prefix          | Auth required | Description                      |
|----------------------|---------------|----------------------------------|
| `/api/health`        | No            | Liveness check                   |
| `/api/auth/register` | No            | User registration                |
| `/api/admin/*`       | No            | Admin utilities                  |
| `/api/ai/*`          | No            | AI features (status + chat)      |
| `/api/messages/*`    | JWT           | User inbox                       |
| `/api/team/*`        | JWT           | Student profiles, papers, reports |
| `/api/reports/*`     | JWT           | Weekly report management         |
| `/api/users/*`       | JWT           | User profile                     |

### Proxied by Express → Go API (`localhost:8082`)

Express forwards these paths verbatim; the Go API responds directly.

| Path prefix          | Auth required | Description                      |
|----------------------|---------------|----------------------------------|
| `/api/auth/login`    | No            | Login, issues JWT                |
| `/api/auth/me`       | JWT           | Current user info                |
| `/api/auth/logout`   | JWT           | Logout                           |
| `/api/scinotes/*`    | JWT           | Lab notebook (SciNote) CRUD      |
| `/api/experiments/*` | JWT           | Experiment records               |

Both services verify JWTs using the same `JWT_SECRET` and algorithm (HS256).
The Go API issues tokens; Express validates them for its own protected routes.

---

## AI Feature Configuration

The AI assistant (`/api/ai/chat`) requires an external API key. The frontend
checks `/api/ai/status` on load and shows a "not configured" notice instead of
a broken chat interface when no key is present.

| `AI_PROVIDER` | Key variable       | Model default  |
|---------------|--------------------|----------------|
| `qianwen`     | `DASHSCOPE_API_KEY`| `qwen-turbo`   |
| `openai`      | `OPENAI_API_KEY`   | `gpt-4o-mini`  |
| `local`       | (none required)    | `llama3`       |

Set `AI_PROVIDER` and the corresponding key to enable the feature. If neither
key is set and `AI_PROVIDER` is not `local`, the chat UI is disabled with a
clear message rather than returning a runtime error.

---

## Day-to-Day Operations

### Re-run seed (safe, idempotent)

```bash
bash scripts/seed-dev.sh
```

Missing records are inserted; existing records are left untouched.
The demo user's credentials are always reset to the seed values.

### Reset and re-seed from scratch

```bash
# Drop and recreate the database, then re-run setup from step 3 above.
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm migrate
bash scripts/seed-dev.sh
```

### Apply new schema migrations

```bash
pnpm migrate
```

Always run after pulling new commits that include schema changes.

---

## Database Migration Ownership

Two tools manage separate sets of tables:

| Tool       | Tables managed                                                  | Files                                   |
|------------|-----------------------------------------------------------------|-----------------------------------------|
| Drizzle    | users, students, papers, weekly_reports, report_comments, messages | `lib/db/migrations/*.sql`            |
| goose      | scinotes, experiment_records                                    | `artifacts/go-api/internal/db/migrations/` |

`pnpm migrate` runs both in sequence. Do not run Drizzle or goose directly
unless debugging a specific subsystem.

To generate a new Drizzle migration after a schema change:

```bash
pnpm --filter @workspace/db run generate
# review lib/db/migrations/<new_file>.sql
pnpm migrate
```
