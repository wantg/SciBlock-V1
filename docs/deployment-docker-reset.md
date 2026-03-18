# SciBlock Docker Deployment (Reset Edition)

This guide is the rebuilt deployment flow for March 2026.
It uses two explicit stacks:

- `docker-compose.yml`: local/dev stack with built-in Postgres
- `docker-compose.production.yml`: production stack with external Postgres

## 1. Prerequisites

- Docker Engine + Docker Compose plugin
- Ports available:
  - frontend: `FRONTEND_PORT` (default `22333`)
  - backend: `BACKEND_PORT` (default `8080`)
- For production: reachable PostgreSQL and valid `DATABASE_URL`

## 2. Local Dev Deployment

1. Edit env file:
   - `docker/.env.dev`
2. Run:

```bash
bash cmd/deploy.dev.sh
```

Windows PowerShell:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File cmd/deploy.dev.ps1
```

1. Verify:

```bash
bash cmd/deploy.health.sh dev
```

## 3. Production Deployment

1. Fill `docker/.env.production` and replace all `CHANGE_ME` placeholders.
2. Deploy:

```bash
bash cmd/deploy.production.sh
```

Windows PowerShell:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File cmd/deploy.production.ps1
```

1. Check health:

```bash
bash cmd/deploy.health.sh prod
```

1. Follow logs:

```bash
bash cmd/deploy.logs.sh prod
```

## 4. Migrations

Run Drizzle migrations manually (production):

```bash
bash cmd/migrate.sh
```

Windows PowerShell:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File cmd/migrate.ps1
```

## 5. Stop Stack

```bash
bash cmd/deploy.stop.sh dev
bash cmd/deploy.stop.sh prod
```

PowerShell:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File cmd/deploy.stop.ps1 -Mode dev
pwsh -NoProfile -ExecutionPolicy Bypass -File cmd/deploy.stop.ps1 -Mode prod
```

## 6. Key Runtime Flags (Backend Container)

- `RUN_BOOTSTRAP_SQL=true|false`: apply `docker/backend/init-drizzle.sql`
- `RUN_MIGRATIONS=true|false`: run Drizzle migration on startup
- `RUN_SEED=true|false`: run `scripts/seed-dev.sh`
- `AUTO_MIGRATE=true|false`: Go API embedded goose migration
- `DB_REWRITE_LOCALHOST=true|false`: rewrite localhost DB host for container runtime

## 7. Troubleshooting Quick Checks

- If backend cannot connect DB: verify `DATABASE_URL`, network ACL, and DB user auth.
- If frontend cannot call API: verify `BACKEND_UPSTREAM` and `/api` proxy in nginx template.
- If startup fails on placeholders: ensure no `CHANGE_ME` remains in `docker/.env.production`.
