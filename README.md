# eFPS Intelligence

Fair Price Shop management platform for Gujarat's Public Distribution System (PDS). Replaces the slow, insecure government FPS portal with a modern, secure system.

---

## Architecture

```
Dealer Browser → Next.js Frontend → Fastify API (18 modules)
                                        │
                          ┌─────────────┴─────────────┐
                      PostgreSQL 16                Redis 7
                          │                     (session, rate-limit,
                          │                      cache, BullMQ)
                          └─────────────┬─────────────┘
                                   BullMQ Workers
                          ┌───────────────┼───────────────┐
                    Playwright sync   SMS OTP      Audit flush
                   (gov portal scrape)               Reports
```

**Data flow:** Playwright worker logs into gov portal per consenting dealer → scrapes beneficiaries, transactions, stock → upserts to PostgreSQL → frontend reads from local DB only.

---

## Frontend (Next.js — Planned)

**Stack:** Next.js 14+ / TypeScript / Tailwind CSS / React Hook Form + Zod / Recharts / React Query

**Portals:** Dealer Dashboard, District Officer, State Admin, Auditor (read-only)

**Key pages:**
- Login (OTP-based password reset, 2FA)
- Dashboard — stock, sales, pending beneficiaries, commission, alerts
- Lifting Records — stock received from warehouses
- Transactions — beneficiary distribution, receipts
- Stock Report — opening/incoming/sold/closing
- Monthly Reports — PDF/CSV/Excel export
- Commodity Sales — per-commodity trends
- Commission — earnings, TDS, net
- Pending List — beneficiaries who haven't collected
- Income & Expense — profit/loss
- FPS Profile, My Ads, Notifications
- Admin — dealer management, allocations, policies, bulk notify
- Audit Portal — ghost beneficiaries, duplicate sales, stock leakage detection

---

## Backend (Implemented)

**Stack:** Node.js 22 / Fastify 5 / TypeScript 5 / PostgreSQL 16 / Redis 7 / BullMQ / Argon2id / AES-256-GCM / Playwright / Pino

**18 modules:** Auth, Dealer, Beneficiary, Transaction, Stock, Lifting, Commission, Finance, Report, Notification, Sync, Ads, MDM & ICDS, Audit, Dashboard, Directory, Hierarchy, Admin

**6 background workers:** Govt sync (Playwright), Sync scheduler, SMS OTP, Audit flush, Daily report, Session cleanup

---

## Getting Started

```bash
cd efps-backend
npm install
cp .env.example .env
docker compose up -d postgres redis
npm run migrate
npm run seed
npm run dev          # http://localhost:3000, docs at /docs
```

Windows: `.\dev.ps1`

**Test accounts:** `12345` / `Password123` (Admin), `12346` / `Password123` (Dealer)

---

## API (`/api/v1`)

| Group | Key endpoints |
|-------|---------------|
| Auth | `POST /auth/login\|logout\|refresh`, `POST /auth/forgot-password/*`, `POST /auth/change-password`, `GET /auth/me` |
| Dealers | `POST /dealers/register`, `GET\|PATCH /dealers/:id`, `GET /dealers/:id/stats`, `GET /dealers/lookup/:fpsId` |
| Beneficiaries | `GET\|POST /beneficiaries`, `GET /beneficiaries/search`, `PATCH /beneficiaries/:id` |
| Transactions | `POST /transactions`, `GET /transactions`, `GET /transactions/summary\|pending` |
| Stock | `GET /stock`, `GET /stock/history` |
| Reports | `GET /reports/monthly\|audit`, `GET /reports/export/pdf\|csv` |
| Sync | `POST /sync/trigger`, `GET /sync/status/:dealerId` |
| Admin | `GET /admin/dealers`, `PATCH /admin/dealers/:id/suspend`, `GET /admin/stats`, `POST /admin/bulk-notify` |

**Response format:** `{ success, data, meta? }` / `{ success: false, error: { code, message, field?, statusCode } }`

---

## Security

- **Auth:** JWT (15min) + refresh token rotation (HttpOnly cookies)
- **Passwords:** Argon2id, never stored/returned as plaintext
- **Gov credentials:** AES-256-GCM encrypted, key in secrets manager, isolated DB table
- **Rate limit:** Login 5/15min per IP, forgot-password 3/30min, register 3/hr, general 100 req/min
- **Validation:** Zod schemas on all inputs, parameterized SQL
- **Audit:** Immutable log of every mutation (user, timestamp, old/new values, IP)

---

## Deployment

| Tier | Users | Stack | Cost |
|------|-------|-------|------|
| 0–50k | Starter | Railway/Render, 2 instances, managed PG + Redis | ~$50–100/mo |
| 50k–300k | Growth | AWS Mumbai, ECS Fargate 3–6 tasks, RDS + replica | ~$400–800/mo |
| 300k–1M | Scale | AWS Mumbai, EKS 6–20 pods, RDS cluster, ElastiCache | ~$1,500–3,000/mo |

---

## Project Layout

```
efps/
├── efps-backend/
│   ├── src/
│   │   ├── app.ts, server.ts          # Entry
│   │   ├── config/                    # Env (Zod), DB, Redis, constants
│   │   ├── plugins/                   # Auth, CORS, Helmet, rate-limit, swagger
│   │   ├── modules/                   # 18 feature modules
│   │   ├── shared/                    # Middleware, utils, errors, types
│   │   ├── database/                  # Migrations, seeds, queries
│   │   └── jobs/                      # BullMQ workers
│   ├── docker/                        # Dockerfiles (API + Playwright worker)
│   └── tests/
├── components.md                      # Component architecture
├── data_flow.md                       # Full PRD
├── efps_backend_prd.md                # Backend design spec
└── solution.md                        # Implementation guide
```
