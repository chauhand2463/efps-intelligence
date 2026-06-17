# eFPS Intelligence — Runbook

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 22+ |
| PostgreSQL | 16 |
| Redis | 7 |
| Playwright Browsers | Chromium |

## Quick Start

```bash
# 1. Start infrastructure (PostgreSQL + Redis)
cd efps-backend
docker compose up -d postgres redis

# 2. Backend — update .env to match Docker ports, then run
npm install
npx playwright install chromium           # for gov portal sync worker
cp .env.example .env                       # edit secrets if not defaults

# ⚠️ Docker maps PG → localhost:5434, Redis → localhost:6380
#    Edit .env to use:
#      DATABASE_URL=postgresql://postgres:postgres@localhost:5434/efps_dev
#      REDIS_URL=redis://localhost:6379     # or 6380 for Docker

npm run migrate                            # applies 29 SQL migrations
npm run seed                               # seeds test accounts
npm run dev                                # http://localhost:3000

# 3. Frontend (separate terminal)
cd efps-frontend
npm install
npm run dev                                # http://localhost:3001
```

## Windows (no Docker)

### PostgreSQL

1. Download and install PostgreSQL 16 from [postgresql.org](https://www.postgresql.org/download/windows/). Note the port (default `5432`) and set password to `postgres` (or update `.env`).
2. Open **pgAdmin** or `psql` and create the database:
   ```sql
   CREATE DATABASE efps_dev;
   ```

### Redis

1. Download [Redis for Windows](https://github.com/redis-windows/redis-windows/releases) or use WSL2: `wsl sudo apt install redis`.
2. Start: `redis-server` (default port `6379`).

### Backend

```powershell
cd efps-backend
npm install
npx playwright install chromium
cp .env.example .env
# If your PG/Redis ports differ from Docker defaults, update .env:
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/efps_dev
#   REDIS_URL=redis://localhost:6379
npm run migrate
npm run seed
npm run dev
```

### Frontend

```powershell
cd efps-frontend
npm install
npm run dev
```

## Environment Variables

### Backend (`efps-backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | |
| `PORT` | `3000` | API server port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5434/efps_dev` | Docker maps PG to `5434` |
| `REDIS_URL` | `redis://localhost:6379` | Docker maps Redis to `6380`; fallback to `6379` for native install |
| `JWT_ACCESS_SECRET` | (change me) | 64-char hex minimum |
| `JWT_REFRESH_SECRET` | (change me) | 64-char hex minimum |
| `ENCRYPTION_KEY` | (change me) | 64 hex chars (32 bytes) for AES-256-GCM |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3001` | Comma-separated |
| `LOG_LEVEL` | `info` | `fatal`/`error`/`warn`/`info`/`debug`/`silent` |

### Frontend (`efps-frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | Backend API base URL |

## Test Accounts

| FPS ID | Password | Role |
|--------|----------|------|
| `00000001` | `Admin@123` | Admin |
| `00000002` | `Admin@123` | Area Officer |
| `10000001`–`10000005` | `Dealer@123` | Dealer |

## Running Tests

```bash
cd efps-backend

# All tests
npm test

# Unit tests only (CircuitBreaker, etc.)
npm run test:unit

# Integration tests (require PostgreSQL + Redis)
npm run test:integration

# Watch mode
npm run test:watch
```

> Integration tests use a separate database (`efps_test`). The connection is configured in `.env.test`. Tables are created/destroyed per test run — no manual setup needed.

## Key Commands

```bash
# Backend
npm run dev          # Hot-reload dev server on :3000
npm run build        # TypeScript compile to dist/
npm run start        # Run compiled production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint

# Frontend
npm run dev          # Next.js dev server on :3001
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint
```

## Scripts

```bash
cd efps-backend
npm run seed                   # Seed test data
npm run migrate                # Run unapplied SQL migrations
npm run generate-openapi       # Regenerate OpenAPI spec

.\dev.ps1                      # Start dev server in background (Windows)
.\dev.ps1 -Prod                # Start production build in background
.\dev.ps1 -Rebuild             # Rebuild TypeScript, then start
```

## Architecture

```
Dealer Browser → Next.js :3001 → Fastify API :3000 → PostgreSQL 16
                                                      Redis 7
```

**Auth:** JWT access (15min) + refresh token (30d) in httpOnly, sameSite=strict cookies. No `Authorization` headers — frontend uses `credentials: 'include'`.

**Workers (BullMQ):** Playwright gov-portal sync, SMS OTP, daily report, audit flush, session cleanup, domain events. All started automatically by `server.ts`.

**Migrations:** 29 incremental SQL files in `src/database/migrations/`. Applied automatically on server start via `_migrations` tracking table.

## API Docs

When the backend is running, visit: [http://localhost:3000/docs](http://localhost:3000/docs) (Swagger UI).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ECONNREFUSED :5434` | PostgreSQL in Docker not running — `docker compose up -d postgres` |
| `ECONNREFUSED :5432` | Port mismatch — Docker uses `5434`, not `5432`. Update `.env` |
| `password authentication failed for user "postgres"` | Wrong port or password — check `DATABASE_URL` in `.env` |
| `ECONNREFUSED :6379` | Redis not running — check `docker compose ps` or start native install |
| `invalid input syntax for type date` | Some columns are `date` type (not varchar). Use full dates like `'2026-06-01'` not `'2026-06'` |
| `429 Too Many Requests` | Rate limiting. Ensure `::1` is allowed in dev — check `src/plugins/rate-limit.plugin.ts` |
| `401 Unauthorized` on login | Ensure JWT secrets are set in `.env` (min 32 chars) |
| Stale frontend errors (wrong imports, missing modules) | Delete `.next` cache and restart: `Remove-Item -Recurse -Force .next` |
| Module not found in dev | Turbopack persistent cache corruption — delete `.next` while dev server is stopped |
| `Playwright` errors | Run `npx playwright install chromium` to download browser binaries |
