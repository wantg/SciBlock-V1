# SciBlock Docker Deployment

## 1. Configure

Edit `docker/.env`:

- `DATABASE_URL`: external PostgreSQL URL
- `FRONTEND_PORT`: public frontend port

Default local values already configured:

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sciblock_v1`
- `FRONTEND_PORT=22333`

## 2. Start

```bash
docker compose --env-file docker/.env up -d --build
```

## 3. Public URLs

- Frontend: `http://<your-host>:${FRONTEND_PORT}`
- Backend: `http://<your-host>:${BACKEND_PORT}/api/healthz`

With the default `.env` on the local machine:

- Frontend: `http://localhost:22333`
- Backend: `http://localhost:8080/api/healthz`

## 4. Startup behavior

When backend container starts, it will automatically:

1. rewrite `DATABASE_URL` host from `localhost` to `host.docker.internal` (for container access)
2. ensure core tables exist (idempotent SQL bootstrap)
3. run seed scripts for test users and demo data
4. start Go API and Express API

## 5. Useful commands

```bash
# stop
docker compose --env-file docker/.env down

# view logs
docker compose --env-file docker/.env logs -f backend
docker compose --env-file docker/.env logs -f frontend
```
