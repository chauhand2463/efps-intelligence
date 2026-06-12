# eFPS Intelligence — Complete System Design & Implementation Guide

> **Version:** 2.0 | **Stack:** Fastify + PostgreSQL + Redis + Playwright | **Target Scale:** 1,000,000 dealers | **Domain:** Gujarat PDS (Fair Price Shop) Management

---

## Table of Contents

1. [What This System Is](#1-what-this-system-is)
2. [How eFPS Master Gets Its Data — The Real Mechanism](#2-how-efps-master-gets-its-data)
3. [Why You Cannot Just Scrape ipds.gujarat.gov.in](#3-why-you-cannot-just-scrape-ipds)
4. [The Correct Architecture — Full System Design](#4-the-correct-architecture)
5. [Tech Stack — Every Choice Justified](#5-tech-stack)
6. [Complete Folder Structure](#6-complete-folder-structure)
7. [Database Schema — PostgreSQL](#7-database-schema)
8. [The Playwright Sync Worker — How to Get Government Data Legally](#8-playwright-sync-worker)
9. [Credential Security — The Part Everyone Gets Wrong](#9-credential-security)
10. [Authentication & Security Design](#10-authentication-and-security)
11. [Complete API Specification](#11-complete-api-specification)
12. [Real-Time Online/Offline Tracking](#12-real-time-tracking)
13. [Rate Limiting Strategy](#13-rate-limiting)
14. [Caching Strategy](#14-caching-strategy)
15. [Scalability Architecture — 1M Users](#15-scalability-architecture)
16. [Environment Variables](#16-environment-variables)
17. [Standard API Response Envelope](#17-api-response-envelope)
18. [Error Code Registry](#18-error-code-registry)
19. [RBAC — Role-Based Access Control](#19-rbac)
20. [Background Jobs](#20-background-jobs)
21. [Testing Strategy](#21-testing-strategy)
22. [CI/CD Pipeline](#22-cicd-pipeline)
23. [Monitoring & Observability](#23-monitoring-and-observability)
24. [Security Vulnerabilities Fixed From eFPS Master](#24-security-fixes)
25. [Build Priority Order](#25-build-priority-order)
26. [What NOT to Do](#26-what-not-to-do)

---

## 1. What This System Is

eFPS Intelligence is a **Fair Price Shop (Ration Shop) Management Portal** for dealers operating under Gujarat's PDS (Public Distribution System). Every FPS dealer in Gujarat is required to use the government's eFPS portal (`efps.gujarat.gov.in`) to log daily ration distributions. That portal is slow, crash-prone, and offers zero operational intelligence.

This system solves the operational problems dealers face daily:

- Logging into the government FPS portal is session-heavy and crashes on poor rural networks
- Dealers have no real-time visibility into who has collected ration and who hasn't
- Stock reconciliation is fully manual and error-prone
- No audit trail exists for disputes with area officers
- Password recovery on the existing third-party app (fpsgujarat.in) returns **plaintext passwords** — a critical security failure
- The existing app depends entirely on a Chrome extension, which breaks whenever the government updates their portal UI

Your system replaces all of this with a secure, scalable backend that pulls live government data on behalf of dealers (with their consent), stores it in your own database, and exposes clean APIs for a fast frontend.

---

## 2. How eFPS Master Gets Its Data

Understanding how fpsgujarat.in (eFPS Master) built its 16,000+ dealer database is essential before designing your own system. It uses three mechanisms working together.

### Mechanism 1: Self-Registration (Primary Source of the 16,000 Records)

The dealer database was not scraped. It was built organically. When dealers visit `fpsgujarat.in/dashboard/signup.php`, they voluntarily enter:

- Their government-issued FPSU ID
- Full name, area, taluka, district
- Mobile number
- Password

Every registration adds one row to eFPS Master's MySQL database. Over time, with enough useful features, dealers registered themselves. **The 16,000 number is the result of years of organic growth, not a bulk data import.**

This is the most important lesson for your system: build something useful enough that dealers want to register. The database builds itself.

### Mechanism 2: The Browser Extension (How Live Data Gets Captured)

This is the clever part. eFPS Master distributes a Chrome/Firefox extension. Here is exactly what happens when a dealer uses it:

```
1. Dealer opens Chrome/Firefox on their own computer
2. Dealer navigates to efps.gujarat.gov.in
3. Dealer logs in with their own government credentials
4. The eFPS Master extension is running silently in the background
5. The extension reads the rendered DOM of the government page
   — beneficiary lists, monthly transactions, stock allocations
   — all of this is already visible on screen after login
6. The extension sends this data via a background API call to fpsgujarat.in's server
7. fpsgujarat.in stores/updates it in their MySQL database
8. Next time the dealer checks fpsgujarat.in, their dashboard shows this data
```

The extension acts as a relay between the dealer's already-authenticated government session and eFPS Master's server. No government credentials are ever stored. No auth wall is bypassed. The dealer is just letting the extension read what they can already see.

This is why eFPS Master never needed to break into the government portal. The dealers' own browsers did the work.

### Mechanism 3: Their Own PHP Backend Stores Everything

Once data arrives via self-registration or the extension relay, it is stored in fpsgujarat.in's own MySQL database. The `dealer_list.php` page is simply a `SELECT * FROM dealers` query against their own database — not a live government API call.

The online/offline counters on the login page work by having dealers ping fpsgujarat.in's server whenever they open the extension. The counter reflects pings to their own server, not a live connection to any government system.

### The Full Data Flow (eFPS Master)

```
Dealer registers on fpsgujarat.in
         ↓
Name, FPSU ID, mobile stored in fpsgujarat.in MySQL
         ↓
Dealer installs Chrome/Firefox extension
         ↓
Dealer logs into efps.gujarat.gov.in with their own government credentials
         ↓
Extension reads rendered page DOM
(beneficiaries, transactions, stock data — already visible after login)
         ↓
Extension POSTs captured data to fpsgujarat.in API endpoint
         ↓
fpsgujarat.in MySQL updated with live government data
         ↓
dealer_list.php and dashboard read from fpsgujarat.in's OWN database
```

---

## 3. Why You Cannot Just Scrape IPDS

Before building anything, you need to understand why directly scraping `ipds.gujarat.gov.in` or `efps.gujarat.gov.in` will fail technically and expose you legally.

### Technical Blockers

**The site explicitly blocks automated access.** The `robots.txt` file on `ipds.gujarat.gov.in` marks the entire site as disallowed for crawlers. Attempting to fetch `frm_welcomelink.aspx` programmatically returns a `ROBOTS_DISALLOWED` error before you even get a response.

**ASP.NET WebForms ViewState.** The `.aspx` extension tells you this runs on Microsoft's old WebForms stack. Every request requires two hidden tokens that change per request:

- `__VIEWSTATE` — a large base64-encoded server-side state blob
- `__EVENTVALIDATION` — a cryptographic token validating which controls posted back

You cannot make a simple HTTP GET and receive data. You must POST both tokens, which means you must first load the page, parse the tokens, then re-POST with them. These tokens change every single request, making automation brittle and fragile.

**No JSON API exists.** There is no `api/dealers` or `api/transactions` endpoint. Data is returned as server-rendered HTML tables. You must parse raw HTML, which breaks every time the government redesigns a page.

**No stability guarantee.** The iPDS system posts maintenance notices regularly and goes offline without warning. If your app's core data pipeline depends on live government scraping, your app breaks every time they do maintenance — which happens constantly.

### Legal Blockers

**IT Act 2000 (India).** Unauthorized automated access to computer systems, even publicly accessible ones, can be interpreted as unauthorized access under Section 43 and Section 66.

**DPDP Act 2023 (India).** The Digital Personal Data Protection Act, India's new data protection law, applies to any processing of personal data. Scraping names, mobile numbers, and IDs of 16,000 dealers without their consent is a violation.

**Conclusion:** Do not build your data pipeline on scraping government portals. Use the dealer-consent approach described in Section 8.

---

## 4. The Correct Architecture

Your system should mirror what eFPS Master does — but replace the browser extension with a server-side Playwright worker that runs on behalf of consenting dealers.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DEALER'S BROWSER                             │
│  Registers on your app → provides FPSU ID + eFPS credentials        │
│  (explicitly consents to sync with government portal)                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────────┐
│                        FASTIFY API (Node.js)                         │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Auth Module  │  │Dealer Module │  │ Beneficiary│  │Transaction│  │
│  └─────────────┘  └──────────────┘  └────────────┘  └───────────┘  │
│                                                                      │
│  On registration: validates credentials, queues sync job             │
│  On all requests: serves from YOUR database, never live gov portal   │
└──────────────────┬────────────────────────────┬────────────────────┘
                   │                            │
     ┌─────────────▼──────────┐    ┌────────────▼──────────────────┐
     │     PostgreSQL 16       │    │     Redis 7                    │
     │                        │    │                                │
     │  dealers               │    │  Session store                 │
     │  beneficiaries         │    │  Rate limit counters           │
     │  transactions          │    │  BullMQ job queues             │
     │  stock_allocations     │    │  Online dealer tracking        │
     │  audit_logs            │    │  FPS ID cache                  │
     │  sessions              │    │  Dealer profile cache          │
     │  otp_requests          │    │                                │
     │  dealer_credentials    │    └────────────┬──────────────────┘
     │  sync_jobs             │                 │
     └─────────────▲──────────┘    ┌────────────▼──────────────────┐
                   │               │   BULLMQ WORKERS               │
                   │               │                                │
                   └───────────────│  efps-sync.worker.ts           │
                                   │  ┌────────────────────────┐   │
                                   │  │  Playwright (headless)  │   │
                                   │  │                         │   │
                                   │  │  1. Launch Chromium     │   │
                                   │  │  2. Login to eFPS gov   │   │
                                   │  │     portal with dealer  │   │
                                   │  │     credentials         │   │
                                   │  │  3. Scrape beneficiary  │   │
                                   │  │     list                │   │
                                   │  │  4. Scrape transactions │   │
                                   │  │  5. Scrape stock data   │   │
                                   │  │  6. Store in PostgreSQL │   │
                                   │  │  7. Schedule next sync  │   │
                                   │  └────────────────────────┘   │
                                   │                                │
                                   │  sms-otp.worker.ts             │
                                   │  audit-flush.worker.ts         │
                                   │  daily-report.worker.ts        │
                                   │  session-cleanup.worker.ts     │
                                   └────────────────────────────────┘
```

### Key Design Decisions

**Your database is the source of truth, not the government portal.** After the initial sync, all queries hit your PostgreSQL database. The government portal is only accessed by the Playwright worker during scheduled syncs.

**Playwright runs in a separate Docker container.** Browser instances are memory-intensive. Isolating them from the API server prevents memory pressure on your API layer.

**Dealer credentials are encrypted at rest.** The eFPS credentials stored for sync are encrypted with AES-256-GCM before hitting the database. The encryption key is stored in a secrets manager, never in your codebase. See Section 9.

**Sync is opt-in with explicit consent.** Dealers must explicitly agree to allow your system to access their government portal on their behalf. This is what makes this legal. Without consent, do not run a sync.

---

## 5. Tech Stack

Every choice here has a concrete reason. This is not a default stack.

| Layer | Choice | Why |
|-------|--------|-----|
| **Runtime** | Node.js 22 LTS | Non-blocking I/O critical for handling 1M users with high concurrency. Event loop handles thousands of simultaneous connections on a single thread. |
| **Framework** | Fastify 4 (NOT Express) | Fastify benchmarks at ~30,000 req/sec on a single core vs Express at ~10,000. Schema validation is built-in via JSON Schema. Plugin system is more structured. At 1M users, this difference matters. |
| **Language** | TypeScript 5 | Catches entire categories of bugs at compile time. Essential when multiple developers touch the same codebase. Interfaces document intent at every boundary. |
| **Primary DB** | PostgreSQL 16 | ACID compliance is non-negotiable for ration transaction records. These are government-adjacent records — partial writes are unacceptable. PostgreSQL's JSONB, full-text search, and table partitioning cover advanced needs without adding infrastructure. |
| **Cache** | Redis 7 | Multi-purpose: session store, rate limit counters, BullMQ backend, dealer online tracking. Upstash for serverless start, self-hosted for scale. |
| **Job Queue** | BullMQ (Redis-backed) | Used for Playwright sync jobs, OTP SMS dispatch, audit log flushing, daily reports. Redis-backed means no separate queue infrastructure. Retry logic, job prioritization, and dead-letter queues are built in. |
| **Auth** | Custom JWT + Refresh Token Rotation | No NextAuth needed — this is a backend-only API. Full control over token lifecycle, rotation strategy, and Redis-backed invalidation. |
| **Password Hashing** | Argon2id | Argon2id is the winner of the Password Hashing Competition (2015). It is memory-hard, making GPU-based brute force attacks dramatically more expensive than bcrypt. Parameters: memory=65536, iterations=3, parallelism=4. |
| **Credential Encryption** | AES-256-GCM | For encrypting eFPS government credentials at rest. GCM mode provides both encryption and authentication (prevents tampering). Key stored in AWS KMS or Doppler, never in the database. |
| **Gov Portal Sync** | Playwright + Chromium (headless) | Can handle ASP.NET WebForms including ViewState tokens, CAPTCHA detection, and session management. Unlike raw HTTP scraping, Playwright runs a real browser that handles JavaScript, form tokens, and redirects correctly. |
| **OTP/SMS** | MSG91 (India) | Indian phone numbers, reliable delivery, competitive pricing, supports DLT-registered templates required by TRAI. |
| **File Storage** | Cloudflare R2 | Zero egress fees. Compatible with S3 API. Stores dealer documents, transaction receipts, exported reports. |
| **Search** | PostgreSQL FTS | Full-text search on dealer names and beneficiary records. No need for Elasticsearch at this stage — PostgreSQL GIN indexes handle millions of records efficiently. |
| **API Docs** | Swagger/OpenAPI (Fastify auto-generated) | Fastify generates OpenAPI spec from route schemas automatically. Frontend developers get live interactive documentation. |
| **Logging** | Pino | Fastest Node.js logger. JSON output. Levels: trace/debug/info/warn/error/fatal. Ships to CloudWatch or Grafana Loki. |
| **Monitoring** | Prometheus + Grafana | Custom metrics: login failure rate, sync success rate, Playwright session duration, cache hit ratio. |
| **Error Tracking** | Sentry | Automatic stack traces, source maps, issue grouping, alerting. |
| **Deployment (Start)** | Railway or Render | Managed PostgreSQL, Redis, and Node.js. One-click deploys. Suitable for 0–50k users. |
| **Deployment (Scale)** | AWS ap-south-1 (Mumbai) | ECS Fargate → EKS. RDS PostgreSQL + read replicas. ElastiCache Redis. Closest region to Gujarat dealers. |

---

## 6. Complete Folder Structure

```
efps-backend/
├── src/
│   ├── app.ts                          # Fastify app factory — registers all plugins and routes
│   ├── server.ts                       # Entry point: binds port, graceful shutdown handler
│   │
│   ├── config/
│   │   ├── index.ts                    # Zod schema validates all env vars at startup
│   │   ├── database.ts                 # PostgreSQL connection pool (pg-pool)
│   │   ├── redis.ts                    # Redis client (ioredis)
│   │   └── constants.ts                # App-wide constants (OTP TTL, token expiry, etc.)
│   │
│   ├── plugins/
│   │   ├── auth.plugin.ts              # JWT verify hook — attaches req.user on protected routes
│   │   ├── cors.plugin.ts              # CORS: whitelist frontend domains only
│   │   ├── rate-limit.plugin.ts        # Per-IP + per-user rate limiting via Redis
│   │   ├── swagger.plugin.ts           # OpenAPI docs auto-generated from route schemas
│   │   ├── helmet.plugin.ts            # Security headers: CSP, HSTS, X-Frame-Options
│   │   └── multipart.plugin.ts         # File upload handling for dealer documents
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.routes.ts          # Route definitions with JSON Schema validation
│   │   │   ├── auth.controller.ts      # Request/response handling — thin layer
│   │   │   ├── auth.service.ts         # Business logic: login, logout, refresh, OTP flows
│   │   │   ├── auth.schema.ts          # Zod schemas + JSON Schema for request validation
│   │   │   └── auth.test.ts            # Integration tests for all auth flows
│   │   │
│   │   ├── dealer/
│   │   │   ├── dealer.routes.ts
│   │   │   ├── dealer.controller.ts
│   │   │   ├── dealer.service.ts       # Dealer CRUD, profile updates, FPS ID lookup
│   │   │   ├── dealer.schema.ts
│   │   │   └── dealer.test.ts
│   │   │
│   │   ├── beneficiary/
│   │   │   ├── beneficiary.routes.ts
│   │   │   ├── beneficiary.controller.ts
│   │   │   ├── beneficiary.service.ts  # Ration card holder management under each FPS
│   │   │   ├── beneficiary.schema.ts
│   │   │   └── beneficiary.test.ts
│   │   │
│   │   ├── transaction/
│   │   │   ├── transaction.routes.ts
│   │   │   ├── transaction.controller.ts
│   │   │   ├── transaction.service.ts  # Ration distribution recording, pending/summary
│   │   │   ├── transaction.schema.ts
│   │   │   └── transaction.test.ts
│   │   │
│   │   ├── stock/
│   │   │   ├── stock.routes.ts
│   │   │   ├── stock.controller.ts
│   │   │   ├── stock.service.ts        # Monthly commodity allocation tracking
│   │   │   ├── stock.schema.ts
│   │   │   └── stock.test.ts
│   │   │
│   │   ├── sync/                       # ← THIS MODULE IS CRITICAL — NOT IN ORIGINAL PRD
│   │   │   ├── sync.routes.ts          # POST /sync/trigger, GET /sync/status/:dealerId
│   │   │   ├── sync.controller.ts
│   │   │   ├── sync.service.ts         # Queues Playwright sync jobs, tracks sync state
│   │   │   ├── sync.schema.ts
│   │   │   └── sync.test.ts
│   │   │
│   │   ├── notification/
│   │   │   ├── notification.routes.ts
│   │   │   ├── notification.controller.ts
│   │   │   ├── notification.service.ts # SMS, push, in-app alert dispatch
│   │   │   ├── notification.schema.ts
│   │   │   └── notification.test.ts
│   │   │
│   │   ├── report/
│   │   │   ├── report.routes.ts
│   │   │   ├── report.controller.ts
│   │   │   ├── report.service.ts       # Monthly reports, audit exports, PDF/CSV generation
│   │   │   ├── report.schema.ts
│   │   │   └── report.test.ts
│   │   │
│   │   └── admin/
│   │       ├── admin.routes.ts
│   │       ├── admin.controller.ts
│   │       ├── admin.service.ts        # Super admin: dealer management, bulk operations
│   │       ├── admin.schema.ts
│   │       └── admin.test.ts
│   │
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── authenticate.ts         # JWT guard — verifies token, attaches req.user
│   │   │   ├── authorize.ts            # RBAC guard — checks role, throws 403 if insufficient
│   │   │   ├── audit-log.ts            # Auto-logs all mutating requests to audit_logs table
│   │   │   └── validate-fps-id.ts      # FPS ID format validator middleware
│   │   │
│   │   ├── utils/
│   │   │   ├── hash.ts                 # Argon2id wrappers: hash() and verify()
│   │   │   ├── token.ts                # JWT sign/verify with type-safe payloads
│   │   │   ├── otp.ts                  # 6-digit OTP generation, SHA-256 hashing, TTL logic
│   │   │   ├── encrypt.ts              # AES-256-GCM encrypt/decrypt for eFPS credentials
│   │   │   ├── pagination.ts           # Cursor-based pagination helpers
│   │   │   ├── response.ts             # Standard success/error response envelope builders
│   │   │   └── logger.ts               # Pino logger singleton with request context
│   │   │
│   │   ├── errors/
│   │   │   ├── AppError.ts             # Base error class with statusCode and errorCode
│   │   │   ├── AuthError.ts            # 401/403 error variants
│   │   │   ├── ValidationError.ts      # 422 input validation errors
│   │   │   └── error-handler.ts        # Global Fastify error hook — formats all errors
│   │   │
│   │   └── types/
│   │       ├── fastify.d.ts            # Augments FastifyRequest with user: JWTPayload
│   │       ├── models.ts               # TypeScript interfaces for all DB entities
│   │       └── enums.ts                # Role, CardCategory, CommodityType, SyncStatus enums
│   │
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_init_core_tables.sql
│   │   │   ├── 002_add_sessions.sql
│   │   │   ├── 003_add_audit_log.sql
│   │   │   ├── 004_add_sync_tables.sql      # dealer_credentials + sync_jobs tables
│   │   │   ├── 005_add_notifications.sql
│   │   │   └── 006_partition_transactions.sql  # Partition transactions by month
│   │   ├── seeds/                       # Dev/test seed data factories
│   │   └── queries/                     # Raw SQL for complex joins (not ORM-friendly)
│   │
│   └── jobs/
│       ├── efps-sync.job.ts             # ← MOST IMPORTANT WORKER — Playwright gov portal sync
│       ├── sms-otp.job.ts               # BullMQ worker: send OTP SMS via MSG91
│       ├── audit-flush.job.ts           # Batch-flush audit log buffer to DB
│       ├── daily-report.job.ts          # Generate and store daily summary reports
│       └── session-cleanup.job.ts       # Expire stale sessions from Redis and DB
│
├── tests/
│   ├── integration/                     # Full route tests with real test DB (Docker)
│   ├── unit/                            # Service-layer unit tests — no DB required
│   └── fixtures/                        # Test data factories (faker.js based)
│
├── docker/
│   ├── Dockerfile                       # Production image (Node 22 Alpine)
│   ├── Dockerfile.dev                   # Dev image with hot reload
│   ├── Dockerfile.worker                # ← SEPARATE IMAGE for Playwright worker
│   │                                    #   Includes Chromium + system deps
│   └── docker-compose.yml              # PostgreSQL + Redis + API + Worker
│
├── scripts/
│   ├── migrate.ts                       # Run pending migrations
│   ├── seed.ts                          # Seed development data
│   └── generate-openapi.ts             # Export OpenAPI JSON for frontend codegen
│
├── .env.example
├── .env.test
├── tsconfig.json
├── package.json
├── eslint.config.js
├── vitest.config.ts
└── README.md
```

---

## 7. Database Schema

### Design Principles

- All primary keys use `UUID` (gen_random_uuid()) — not sequential integers. Sequential integer IDs are enumerable; an attacker can scan `GET /dealers/1`, `GET /dealers/2`, etc. UUIDs make enumeration infeasible.
- All timestamps use `TIMESTAMPTZ` (timezone-aware). Dealers operate across different districts; TIMESTAMPTZ ensures correct time handling.
- Foreign keys have `ON DELETE CASCADE` where child records have no meaning without a parent.
- All mutations use parameterized queries. No string interpolation in SQL.
- The `audit_logs` table uses `BIGSERIAL` (not UUID) for append-only high-volume inserts. It is never updated or deleted.

### Full Schema

```sql
-- ============================================================
-- DEALERS
-- ============================================================
CREATE TABLE dealers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fps_id            VARCHAR(20) UNIQUE NOT NULL,
  area_id           VARCHAR(20),
  full_name         VARCHAR(255) NOT NULL,
  mobile            VARCHAR(15) UNIQUE NOT NULL,
  address           TEXT,
  district          VARCHAR(100),
  taluka            VARCHAR(100),
  village           VARCHAR(100),
  password_hash     VARCHAR(255) NOT NULL,       -- Argon2id hash ONLY
  role              VARCHAR(20) DEFAULT 'dealer', -- dealer | area_officer | admin
  is_active         BOOLEAN DEFAULT TRUE,
  is_verified       BOOLEAN DEFAULT FALSE,
  sync_enabled      BOOLEAN DEFAULT FALSE,        -- Has dealer consented to gov portal sync?
  last_login_at     TIMESTAMPTZ,
  last_sync_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dealers_fps_id   ON dealers(fps_id);
CREATE INDEX idx_dealers_mobile   ON dealers(mobile);
CREATE INDEX idx_dealers_district ON dealers(district);
CREATE INDEX idx_dealers_taluka   ON dealers(taluka);

-- Full-text search on dealer name
CREATE INDEX idx_dealers_fts ON dealers
  USING GIN(to_tsvector('simple', full_name));

-- ============================================================
-- DEALER CREDENTIALS (for Playwright sync — encrypted)
-- ============================================================
-- CRITICAL: This table is isolated from the main dealers table.
-- Access is restricted to the sync worker service only.
-- Credentials are NEVER returned in any API response.
CREATE TABLE dealer_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID UNIQUE REFERENCES dealers(id) ON DELETE CASCADE,
  efps_username   TEXT NOT NULL,    -- AES-256-GCM encrypted, base64 stored
  efps_password   TEXT NOT NULL,    -- AES-256-GCM encrypted, base64 stored
  iv              VARCHAR(32) NOT NULL,  -- GCM initialization vector
  auth_tag        VARCHAR(32) NOT NULL,  -- GCM auth tag for tamper detection
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- No index on efps_username — this table is accessed only by dealer_id

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id            UUID REFERENCES dealers(id) ON DELETE CASCADE,
  refresh_token_hash   VARCHAR(255) NOT NULL,  -- SHA-256 hash of the refresh token
  user_agent           TEXT,
  ip_address           INET,
  expires_at           TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_dealer_id ON sessions(dealer_id);
CREATE INDEX idx_sessions_expires   ON sessions(expires_at);

-- ============================================================
-- OTP REQUESTS
-- ============================================================
CREATE TABLE otp_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile      VARCHAR(15) NOT NULL,
  fps_id      VARCHAR(20),
  otp_hash    VARCHAR(255) NOT NULL,  -- SHA-256 of the 6-digit OTP
  purpose     VARCHAR(30) NOT NULL,   -- password_reset | verify_mobile | login_2fa
  attempts    SMALLINT DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,            -- NULL = not yet used
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_mobile    ON otp_requests(mobile);
CREATE INDEX idx_otp_fps_id    ON otp_requests(fps_id);
CREATE INDEX idx_otp_expires   ON otp_requests(expires_at);

-- ============================================================
-- SYNC JOBS
-- ============================================================
CREATE TABLE sync_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'pending',  -- pending | running | success | failed
  triggered_by    VARCHAR(20) DEFAULT 'scheduled', -- scheduled | manual | registration
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,                 -- Last error if status = failed
  records_synced  INTEGER DEFAULT 0,    -- Count of records pulled in this sync
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_dealer_id ON sync_jobs(dealer_id);
CREATE INDEX idx_sync_status    ON sync_jobs(status);
CREATE INDEX idx_sync_created   ON sync_jobs(created_at);

-- ============================================================
-- BENEFICIARIES
-- ============================================================
CREATE TABLE beneficiaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id) ON DELETE CASCADE,
  ration_card_no  VARCHAR(30) UNIQUE NOT NULL,
  head_of_family  VARCHAR(255) NOT NULL,
  mobile          VARCHAR(15),
  member_count    SMALLINT DEFAULT 1,
  category        VARCHAR(20),          -- APL | BPL | AAY | PHH
  address         TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  synced_from_gov BOOLEAN DEFAULT FALSE, -- TRUE if populated via Playwright sync
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_beneficiaries_dealer_id   ON beneficiaries(dealer_id);
CREATE INDEX idx_beneficiaries_ration_card ON beneficiaries(ration_card_no);
CREATE INDEX idx_beneficiaries_fts         ON beneficiaries
  USING GIN(to_tsvector('simple', head_of_family));

-- ============================================================
-- STOCK ALLOCATIONS
-- ============================================================
CREATE TABLE stock_allocations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id      UUID REFERENCES dealers(id),
  month          DATE NOT NULL,          -- First day of month (e.g. 2025-06-01)
  commodity      VARCHAR(50) NOT NULL,   -- Rice | Wheat | Sugar | Kerosene | Oil
  allocated_kg   NUMERIC(10,3) NOT NULL,
  lifted_kg      NUMERIC(10,3) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, month, commodity)    -- One row per dealer per month per commodity
);

CREATE INDEX idx_stock_dealer_month ON stock_allocations(dealer_id, month);

-- ============================================================
-- TRANSACTIONS
-- Partitioned by month for performance at scale
-- ============================================================
CREATE TABLE transactions (
  id               UUID DEFAULT gen_random_uuid(),
  dealer_id        UUID REFERENCES dealers(id),
  beneficiary_id   UUID REFERENCES beneficiaries(id),
  transaction_date DATE NOT NULL,
  month            DATE NOT NULL,        -- Partition key — first day of month
  commodity        VARCHAR(50) NOT NULL,
  quantity_kg      NUMERIC(8,3) NOT NULL,
  price_per_kg     NUMERIC(6,2),
  total_amount     NUMERIC(10,2),
  mode             VARCHAR(20) DEFAULT 'pos',  -- pos | manual | otg
  biometric_auth   BOOLEAN DEFAULT FALSE,
  remarks          TEXT,
  synced_from_gov  BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (month);

-- Create initial partitions (run monthly via migration or cron)
CREATE TABLE transactions_2025_06 PARTITION OF transactions
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE transactions_2025_07 PARTITION OF transactions
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

-- Index on each partition (PostgreSQL auto-indexes partition keys)
CREATE INDEX idx_transactions_dealer_date ON transactions(dealer_id, transaction_date);
CREATE INDEX idx_transactions_beneficiary ON transactions(beneficiary_id);

-- ============================================================
-- AUDIT LOGS (Immutable — append only, never update or delete)
-- ============================================================
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,  -- BIGSERIAL for high-volume sequential inserts
  dealer_id   UUID,
  action      VARCHAR(100) NOT NULL,  -- e.g. TRANSACTION_CREATE, DEALER_UPDATE
  entity      VARCHAR(50),            -- e.g. transaction, beneficiary
  entity_id   UUID,
  old_data    JSONB,                  -- State before change
  new_data    JSONB,                  -- State after change
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_dealer  ON audit_logs(dealer_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);  -- DESC for recent-first queries
CREATE INDEX idx_audit_action  ON audit_logs(action);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id   UUID REFERENCES dealers(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  type        VARCHAR(30),             -- info | warning | alert | success
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_dealer_unread ON notifications(dealer_id, is_read)
  WHERE is_read = FALSE;  -- Partial index — only indexes unread, much smaller
```

---

## 8. Playwright Sync Worker

This is the most important and most absent part of the original PRD. Without it, your app has no way to get live government data.

### How It Works

The sync worker is a BullMQ job processor that runs in a separate Docker container. When triggered (on dealer registration, on a daily schedule, or manually), it:

1. Decrypts the dealer's eFPS credentials from the `dealer_credentials` table
2. Launches a headless Chromium browser using Playwright
3. Navigates to `efps.gujarat.gov.in` and logs in using the dealer's own credentials
4. Navigates through the portal pages to collect beneficiary data, monthly transactions, and stock allocations
5. Upserts all collected data into your PostgreSQL database
6. Updates `sync_jobs` with the result (success/failure/record count)
7. Updates `dealers.last_sync_at`
8. Shuts down the browser

### Implementation

```typescript
// src/jobs/efps-sync.job.ts

import { Worker, Job } from 'bullmq';
import { chromium, Browser, Page } from 'playwright';
import { redis } from '../config/redis';
import { db } from '../config/database';
import { decrypt } from '../shared/utils/encrypt';
import { logger } from '../shared/utils/logger';

interface SyncJobData {
  dealerId: string;
  triggeredBy: 'registration' | 'scheduled' | 'manual';
}

export const efpsSyncWorker = new Worker<SyncJobData>(
  'efps-sync',
  async (job: Job<SyncJobData>) => {
    const { dealerId } = job.data;
    let browser: Browser | null = null;

    // Mark job as running
    await db.query(
      `UPDATE sync_jobs SET status = 'running', started_at = NOW()
       WHERE dealer_id = $1 AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [dealerId]
    );

    try {
      // Step 1: Fetch and decrypt credentials
      const credRow = await db.query(
        `SELECT efps_username, efps_password, iv, auth_tag
         FROM dealer_credentials WHERE dealer_id = $1`,
        [dealerId]
      );

      if (!credRow.rows.length) {
        throw new Error('No credentials found for dealer — sync skipped');
      }

      const { efps_username, efps_password, iv, auth_tag } = credRow.rows[0];
      const username = decrypt(efps_username, iv, auth_tag);
      const password = decrypt(efps_password, iv, auth_tag);

      // Step 2: Launch headless browser
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',  // Critical for Docker
          '--disable-gpu',
        ],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: { width: 1280, height: 720 },
      });

      const page = await context.newPage();

      // Step 3: Login to eFPS portal
      await loginToEfps(page, username, password);

      // Step 4: Collect data
      const beneficiaries = await scrapeBeneficiaries(page, dealerId);
      const transactions   = await scrapeTransactions(page, dealerId);
      const stockData      = await scrapeStockAllocations(page, dealerId);

      // Step 5: Upsert all data into PostgreSQL
      const recordCount = await upsertData(dealerId, beneficiaries, transactions, stockData);

      // Step 6: Mark sync as successful
      await db.query(
        `UPDATE sync_jobs
         SET status = 'success', completed_at = NOW(), records_synced = $2
         WHERE dealer_id = $1 AND status = 'running'`,
        [dealerId, recordCount]
      );

      await db.query(
        `UPDATE dealers SET last_sync_at = NOW() WHERE id = $1`,
        [dealerId]
      );

      logger.info({ dealerId, recordCount }, 'eFPS sync completed successfully');
      return { success: true, recordCount };

    } catch (error: any) {
      logger.error({ dealerId, error: error.message }, 'eFPS sync failed');

      await db.query(
        `UPDATE sync_jobs
         SET status = 'failed', completed_at = NOW(), error_message = $2
         WHERE dealer_id = $1 AND status = 'running'`,
        [dealerId, error.message]
      );

      throw error; // BullMQ will handle retry logic

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },
  {
    connection: redis,
    concurrency: 3,           // Max 3 concurrent browser instances per worker
    limiter: {
      max: 10,
      duration: 60000,        // Max 10 syncs per minute across all workers
    },
  }
);

async function loginToEfps(page: Page, username: string, password: string): Promise<void> {
  await page.goto('https://efps.gujarat.gov.in/loginroutingmanager/Login', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  // Fill login form (selectors must be verified against actual page)
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for successful login redirect
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Check for login failure
  const errorEl = await page.$('.error-message, .alert-danger');
  if (errorEl) {
    const errorText = await errorEl.textContent();
    throw new Error(`eFPS login failed: ${errorText}`);
  }
}

async function scrapeBeneficiaries(page: Page, dealerId: string): Promise<any[]> {
  // Navigate to beneficiary list page
  await page.goto('https://efps.gujarat.gov.in/...beneficiary-list...', {
    waitUntil: 'networkidle',
  });

  // Wait for table to load
  await page.waitForSelector('table.beneficiary-table', { timeout: 10000 });

  // Extract table data
  const rows = await page.$$eval('table.beneficiary-table tbody tr', (trs) =>
    trs.map((tr) => {
      const cells = tr.querySelectorAll('td');
      return {
        rationCardNo: cells[0]?.textContent?.trim(),
        headOfFamily: cells[1]?.textContent?.trim(),
        memberCount:  parseInt(cells[2]?.textContent?.trim() || '0', 10),
        category:     cells[3]?.textContent?.trim(),
        mobile:       cells[4]?.textContent?.trim(),
      };
    })
  );

  return rows.filter((r) => r.rationCardNo); // Filter empty rows
}

// scrapeTransactions and scrapeStockAllocations follow same pattern

async function upsertData(
  dealerId: string,
  beneficiaries: any[],
  transactions: any[],
  stock: any[]
): Promise<number> {
  let total = 0;

  // Upsert beneficiaries — update if ration card exists, insert if new
  for (const b of beneficiaries) {
    await db.query(
      `INSERT INTO beneficiaries
         (dealer_id, ration_card_no, head_of_family, member_count, category, mobile, synced_from_gov)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (ration_card_no) DO UPDATE SET
         head_of_family = EXCLUDED.head_of_family,
         member_count   = EXCLUDED.member_count,
         updated_at     = NOW()`,
      [dealerId, b.rationCardNo, b.headOfFamily, b.memberCount, b.category, b.mobile]
    );
    total++;
  }

  // Transactions and stock follow the same upsert pattern
  // ...

  return total;
}
```

### Triggering a Sync

```typescript
// src/modules/sync/sync.service.ts

import { Queue } from 'bullmq';
import { redis } from '../../config/redis';

const syncQueue = new Queue('efps-sync', { connection: redis });

export async function triggerSync(dealerId: string, triggeredBy: string): Promise<void> {
  // Create sync_jobs record
  await db.query(
    `INSERT INTO sync_jobs (dealer_id, status, triggered_by)
     VALUES ($1, 'pending', $2)`,
    [dealerId, triggeredBy]
  );

  // Add job to BullMQ queue
  await syncQueue.add(
    'sync-dealer',
    { dealerId, triggeredBy },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },  // Retry after 5s, 10s, 20s
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );
}

// Called during dealer registration if sync_enabled = true
export async function triggerRegistrationSync(dealerId: string): Promise<void> {
  await triggerSync(dealerId, 'registration');
}

// Called by daily-report.job.ts for all sync-enabled dealers
export async function triggerScheduledSync(): Promise<void> {
  const dealers = await db.query(
    `SELECT id FROM dealers WHERE sync_enabled = true AND is_active = true`
  );

  for (const dealer of dealers.rows) {
    await triggerSync(dealer.id, 'scheduled');
    // Stagger by 2 seconds to avoid hammering the government portal
    await new Promise((r) => setTimeout(r, 2000));
  }
}
```

### Docker Configuration for Playwright Worker

The Playwright worker needs a special Docker image because it must include Chromium and all its Linux system dependencies. This is why it runs as a separate container.

```dockerfile
# docker/Dockerfile.worker

FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Install only Chromium (not Firefox/WebKit — saves ~400MB)
RUN npx playwright install chromium

COPY . .
RUN yarn build

CMD ["node", "dist/jobs/efps-sync.job.js"]
```

```yaml
# docker/docker-compose.yml (relevant section)

services:
  api:
    build:
      context: .
      dockerfile: docker/Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis

  sync-worker:
    build:
      context: .
      dockerfile: docker/Dockerfile.worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}   # AES key for credential decryption
    deploy:
      resources:
        limits:
          memory: 2G      # Chromium is memory-heavy
          cpus: '1.0'
    depends_on:
      - postgres
      - redis
```

---

## 9. Credential Security

This is the section most developers skip and the one that will destroy your app if you get it wrong. You are storing dealers' government portal login credentials. This is extremely sensitive data.

### What Can Go Wrong

If your `dealer_credentials` table is compromised and credentials are stored in plaintext or with weak encryption, an attacker can:

- Log into the Gujarat government's eFPS portal as 16,000+ dealers
- Manipulate ration distribution records for hundreds of thousands of beneficiaries
- Access personal data of millions of ration card holders
- Cause a government-scale data breach

### The Correct Approach: AES-256-GCM with External Key Management

```typescript
// src/shared/utils/encrypt.ts

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_BUFFER = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
// ENCRYPTION_KEY must be a 64-character hex string = 32 bytes = 256 bits

interface EncryptedPayload {
  ciphertext: string;  // base64
  iv: string;          // base64, 12 bytes (96 bits) — standard for GCM
  authTag: string;     // base64, 16 bytes — GCM authentication tag
}

export function encrypt(plaintext: string): EncryptedPayload {
  const iv = randomBytes(12);  // New IV for every encryption
  const cipher = createCipheriv(ALGORITHM, KEY_BUFFER, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decrypt(ciphertext: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    KEY_BUFFER,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
  // If the authTag doesn't match (data was tampered), final() throws an error.
  // This is the authentication guarantee of GCM mode.
}
```

### Storing Credentials on Registration

```typescript
// In dealer registration flow

const { ciphertext: encUsername, iv, authTag } = encrypt(efpsUsername);
const { ciphertext: encPassword } = encrypt(efpsPassword);
// Note: use a NEW IV for each value in production, shown simplified here

await db.query(
  `INSERT INTO dealer_credentials (dealer_id, efps_username, efps_password, iv, auth_tag)
   VALUES ($1, $2, $3, $4, $5)`,
  [dealerId, encUsername, encPassword, iv, authTag]
);
```

### Key Management Rules

The `ENCRYPTION_KEY` must never be stored in your database or source code. Use one of:

- **AWS KMS** — managed key service, rotates automatically, audit log for all key usage
- **Doppler** — secrets manager that injects keys at runtime, supports key rotation
- **HashiCorp Vault** — self-hosted, more complex but more control

Rotate the key quarterly. When rotating: decrypt all credentials with the old key, re-encrypt with the new key in a single migration transaction.

### Access Control on dealer_credentials

The `dealer_credentials` table must only be accessible by the sync worker. In PostgreSQL:

```sql
-- Create a restricted role for the sync worker
CREATE ROLE sync_worker_role;
GRANT SELECT ON dealer_credentials TO sync_worker_role;
-- No INSERT, UPDATE, DELETE — the API service handles those with a different role

-- API service role does NOT have SELECT on dealer_credentials
REVOKE SELECT ON dealer_credentials FROM api_role;
```

In practice, use two separate DATABASE_URL values: one for the API server (no access to `dealer_credentials`) and one for the sync worker (access to `dealer_credentials` only).

---

## 10. Authentication and Security

### Token Strategy

```
Login
  → Access Token  (JWT, 15 min TTL, stateless, signed with JWT_ACCESS_SECRET)
  + Refresh Token (opaque random string, 30 day TTL, stored as hash in Redis + sessions table)
  + HttpOnly Cookie (holds the refresh token — never accessible via JavaScript)

Access token expires?
  → POST /auth/refresh with the HttpOnly cookie
  → Server validates refresh token hash in Redis
  → Issues new access token + new refresh token (old one invalidated)
  → This is token rotation — stolen refresh tokens can only be used once

Logout
  → DELETE refresh token from Redis
  → Record expires_at in sessions table
  → HttpOnly cookie cleared
```

### Why HttpOnly Cookie for the Refresh Token

Storing the refresh token in `localStorage` is a common mistake. Any XSS vulnerability on your frontend can steal it. HttpOnly cookies are inaccessible to JavaScript — they can only be sent by the browser as part of HTTP requests. Combined with `Secure` and `SameSite=Strict` attributes, this eliminates the most common token theft vector.

### Password Security

```typescript
// src/shared/utils/hash.ts

import argon2 from 'argon2';

const ARGON2_CONFIG = {
  type: argon2.argon2id,        // argon2id = hybrid of argon2i + argon2d (best for passwords)
  memoryCost: 65536,            // 64MB RAM required per hash
  timeCost: 3,                  // 3 iterations
  parallelism: 4,               // 4 parallel threads
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_CONFIG);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

### OTP Design

```
Generation:
  → crypto.randomInt(100000, 999999)  — 6 digits, cryptographically random
  → SHA-256 hash of the OTP stored in otp_requests table
  → Raw OTP sent via SMS only — never stored, never logged

Verification:
  → Fetch otp_requests row by mobile + purpose WHERE used_at IS NULL AND expires_at > NOW()
  → Increment attempts counter (max 3)
  → Compare SHA-256(submitted_otp) with stored otp_hash
  → If match: set used_at = NOW()
  → If attempts >= 3: the OTP is invalidated — user must request a new one

Rate limiting (Redis):
  → 3 OTP requests per mobile per 30 minutes
  → Key: otp_rate_limit:{mobile}
  → TTL: 1800 seconds
```

### Input Validation

Every route schema validates inputs before the controller is reached. Fastify's schema validation is synchronous and runs before your handler:

```typescript
// Example route schema
const loginSchema = {
  body: {
    type: 'object',
    required: ['fps_id', 'password'],
    properties: {
      fps_id:   { type: 'string', pattern: '^\\d{5,20}$' },
      password: { type: 'string', minLength: 8, maxLength: 128 },
    },
    additionalProperties: false,  // Reject any extra fields
  },
};
```

FPS ID must match `/^\d{5,20}$/` — pure numeric, 5–20 digits. Any other format is rejected before it reaches the database.

---

## 11. Complete API Specification

All endpoints are prefixed with `/api/v1`.

### Authentication — `/api/v1/auth`

| Method | Path | Auth Required | Description |
|--------|------|:---:|-------------|
| POST | `/auth/login` | No | Login with FPS ID + password. Returns access token + sets refresh token cookie. |
| POST | `/auth/logout` | Yes | Invalidates session in Redis and sessions table. Clears cookie. |
| POST | `/auth/refresh` | No | Rotates refresh token. Returns new access token. |
| POST | `/auth/forgot-password/request` | No | Sends 6-digit OTP to registered mobile. |
| POST | `/auth/forgot-password/verify` | No | Verifies OTP. Returns a single-use reset token (10 min TTL). |
| POST | `/auth/forgot-password/reset` | No | Accepts reset token + new password. Updates hash. Invalidates all existing sessions. |
| PATCH | `/auth/change-password` | Yes | Changes password for authenticated dealer. Requires current password confirmation. |
| GET | `/auth/me` | Yes | Returns current dealer profile. |

### Dealers — `/api/v1/dealers`

| Method | Path | Auth Required | Description |
|--------|------|:---:|-------------|
| POST | `/dealers/register` | No | Creates dealer account. Validates FPS ID format. Optionally accepts eFPS credentials for sync. |
| GET | `/dealers/:id` | Yes | Returns dealer profile. Dealers can only access their own; admins can access any. |
| PATCH | `/dealers/:id` | Yes | Updates name, address, mobile. FPS ID and role are immutable via this endpoint. |
| GET | `/dealers/:id/stats` | Yes | Dashboard stats: total beneficiaries, this month's distributions, online status. |
| GET | `/dealers/:id/sessions` | Yes | Lists active sessions (device, IP, created_at). |
| DELETE | `/dealers/:id/sessions/:sessionId` | Yes | Revokes a specific session (for "sign out all devices"). |
| GET | `/dealers/lookup/:fpsId` | No | Returns `{ exists: boolean }`. Used during registration to check if FPS ID is already registered. |
| POST | `/dealers/:id/sync/enable` | Yes | Dealer provides eFPS credentials and consents to sync. Encrypts and stores. Triggers first sync. |
| DELETE | `/dealers/:id/sync/disable` | Yes | Dealer revokes sync consent. Deletes credentials from dealer_credentials table. |

### Sync — `/api/v1/sync`

| Method | Path | Auth Required | Description |
|--------|------|:---:|-------------|
| POST | `/sync/trigger` | Yes | Manually triggers a sync for the authenticated dealer. Rate limited: once per hour. |
| GET | `/sync/status` | Yes | Returns latest sync_jobs record for the dealer: status, last_sync_at, records_synced. |
| GET | `/sync/history` | Yes | Returns last 10 sync jobs with timestamps and record counts. |

### Beneficiaries — `/api/v1/beneficiaries`

| Method | Path | Auth Required | Description |
|--------|------|:---:|-------------|
| GET | `/beneficiaries` | Yes | Paginated list of beneficiaries for the authenticated dealer. |
| GET | `/beneficiaries/:id` | Yes | Single beneficiary record. |
| GET | `/beneficiaries/search?q=` | Yes | Full-text search on name and ration card number. Uses PostgreSQL GIN index. |
| POST | `/beneficiaries` | Yes | Manually add a beneficiary (for dealers not using sync). |
| PATCH | `/beneficiaries/:id` | Yes | Update beneficiary details. Cannot change ration card number. |
| DELETE | `/beneficiaries/:id` | Yes | Soft delete (sets is_active = false). Physical records never deleted. |

### Transactions — `/api/v1/transactions`

| Method | Path | Auth Required | Description |
|--------|------|:---:|-------------|
| POST | `/transactions` | Yes | Records a ration distribution. Updates stock lifted_kg automatically. |
| GET | `/transactions` | Yes | Paginated list. Filter params: `month`, `commodity`, `beneficiary_id`. Cursor-based pagination. |
| GET | `/transactions/:id` | Yes | Single transaction detail. |
| GET | `/transactions/summary` | Yes | Monthly summary: total distributed vs allocated per commodity. |
| GET | `/transactions/pending` | Yes | Beneficiaries who have not collected ration this month. |

### Stock — `/api/v1/stock`

| Method | Path | Auth Required | Description |
|--------|------|:---:|-------------|
| GET | `/stock` | Yes | Current month's stock allocation per commodity with remaining quantities. |
| GET | `/stock/history` | Yes | Historical allocations by month. |
| PATCH | `/stock/:id` | Admin only | Update an allocation. Admin and area officers only. |

### Notifications — `/api/v1/notifications`

| Method | Path | Auth Required | Description |
|--------|------|:---:|-------------|
| GET | `/notifications` | Yes | Paginated notifications. Filter: `is_read`. |
| PATCH | `/notifications/:id/read` | Yes | Marks one notification as read. |
| PATCH | `/notifications/read-all` | Yes | Marks all notifications as read. |

### Reports — `/api/v1/reports`

| Method | Path | Auth Required | Description |
|--------|------|:---:|-------------|
| GET | `/reports/monthly` | Yes | Full monthly distribution report. Accepts `month` query param. |
| GET | `/reports/audit` | Yes | Audit log for the dealer. Admins can view any dealer's log. |
| GET | `/reports/export/pdf` | Yes | Monthly report as PDF. Generated server-side via pdfkit. |
| GET | `/reports/export/csv` | Yes | Transaction data as CSV for the selected month. |

### Admin — `/api/v1/admin`

All admin routes require `role = 'admin'` in JWT payload.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dealers` | Paginated list of all dealers. Filter by district, taluka, status. |
| PATCH | `/admin/dealers/:id/suspend` | Suspends dealer account. Sets is_active = false. |
| PATCH | `/admin/dealers/:id/activate` | Reactivates a suspended dealer. |
| GET | `/admin/stats` | Platform-wide stats: total dealers, online now, syncs today, transactions today. |
| POST | `/admin/bulk-notify` | Sends notification to all dealers or a filtered subset. Queued via BullMQ. |
| GET | `/admin/sync/queue` | BullMQ queue status: pending, active, failed job counts. |

---

## 12. Real-Time Tracking

The eFPS Master login page shows live online/offline dealer counts. Here is the production-correct implementation.

### Online Status via Redis SADD/SREM

```typescript
// On successful login
await redis.sadd('online_dealers', dealerId);
await redis.set(`dealer_session:${dealerId}`, '1', 'EX', 900);  // 15 min TTL

// On any authenticated request (sliding window)
await redis.expire(`dealer_session:${dealerId}`, 900);

// On explicit logout
await redis.srem('online_dealers', dealerId);
await redis.del(`dealer_session:${dealerId}`);

// Get online count for dashboard
const onlineCount = await redis.scard('online_dealers');
```

### Cleanup Job (Every 5 Minutes)

```typescript
// src/jobs/session-cleanup.job.ts

// Find dealers in online_dealers set whose session key has expired
const onlineDealers = await redis.smembers('online_dealers');
for (const dealerId of onlineDealers) {
  const sessionExists = await redis.exists(`dealer_session:${dealerId}`);
  if (!sessionExists) {
    await redis.srem('online_dealers', dealerId);
  }
}
```

### Why NOT Use KEYS Pattern

`KEYS dealer:*:online` scans the entire Redis keyspace. At 1M users, this blocks Redis for seconds. `SADD`/`SREM` on a single set is O(1) and the correct approach.

---

## 13. Rate Limiting

All limits are enforced via Redis sliding window counters. The `@fastify/rate-limit` plugin handles this automatically when configured with a Redis store.

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `POST /auth/login` | 5 attempts | 15 minutes | Per IP address |
| `POST /auth/login` | 10 attempts | 1 hour | Per FPS ID |
| `POST /auth/forgot-password/request` | 3 requests | 30 minutes | Per mobile number |
| `POST /dealers/register` | 3 requests | 1 hour | Per IP address |
| `POST /sync/trigger` | 1 request | 1 hour | Per dealer ID |
| All other authenticated endpoints | 100 requests | 1 minute | Per dealer ID |
| All other unauthenticated endpoints | 20 requests | 1 minute | Per IP address |

When a rate limit is exceeded, return:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please wait before trying again.",
    "retryAfter": 847,
    "statusCode": 429
  }
}
```

Always include `Retry-After` header in rate limit responses.

---

## 14. Caching Strategy

All cache entries are stored in Redis with explicit TTLs. Cache invalidation is always explicit — never rely on TTL alone for write-heavy data.

| Data | Cache Key | TTL | Invalidated On |
|------|-----------|-----|----------------|
| Dealer profile | `dealer:profile:{id}` | 5 minutes | PATCH /dealers/:id |
| Dashboard stats | `dealer:stats:{id}` | 30 seconds | Any transaction write |
| FPS ID existence | `fps_id:exists:{fpsId}` | 1 hour | POST /dealers/register |
| Online dealer count | Redis SCARD (live) | N/A — real-time | N/A |
| Beneficiary search results | `bsearch:{dealerId}:{query}` | 2 minutes | Any beneficiary write |
| Monthly summary | `summary:{dealerId}:{month}` | 10 minutes | Any transaction write |

### Cache-Aside Pattern (Standard Implementation)

```typescript
async function getDealerProfile(dealerId: string) {
  const cacheKey = `dealer:profile:${dealerId}`;

  // 1. Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss — query database
  const result = await db.query(
    `SELECT id, fps_id, full_name, mobile, district, taluka, role, is_active, last_sync_at
     FROM dealers WHERE id = $1`,
    [dealerId]
  );

  if (!result.rows.length) throw new AppError('DEALER_NOT_FOUND', 404);

  // 3. Store in cache
  await redis.setex(cacheKey, 300, JSON.stringify(result.rows[0]));

  return result.rows[0];
}

// Invalidation on update
async function updateDealerProfile(dealerId: string, updates: Partial<Dealer>) {
  await db.query('UPDATE dealers SET ...', [...]);
  await redis.del(`dealer:profile:${dealerId}`);  // Explicit invalidation
}
```

---

## 15. Scalability Architecture

### Traffic Estimation

```
1,000,000 dealers
× 5 requests/day average
= 5,000,000 requests/day
= 57.8 req/sec average

Peak factor (morning 8–11am — dealers opening shops):
57.8 × 10 = ~580 req/sec peak

Fastify throughput: ~30,000 req/sec per core
Your peak load needs: 580 / 30,000 = ~2% of one core
For HA + failure tolerance: minimum 3 instances
```

### Deployment Tiers

**Tier 1: Launch (0–50,000 dealers)**

```
Railway or Render:
  - 2x Node.js API instances (512MB RAM each)
  - 1x Playwright sync worker (2GB RAM)
  - PostgreSQL: Neon or Supabase (managed, free tier → paid)
  - Redis: Upstash (serverless, pay per request)

Estimated cost: $50–100/month
```

**Tier 2: Growth (50,000–300,000 dealers)**

```
AWS ap-south-1 (Mumbai region — closest to Gujarat):
  - ECS Fargate: 3–6 tasks (auto-scale on CPU > 70%)
  - ECS sync worker: 2–4 tasks (auto-scale on BullMQ queue depth)
  - RDS PostgreSQL: db.t4g.large with 1 read replica
  - ElastiCache Redis: cache.r7g.large
  - CloudFront CDN for static assets

Estimated cost: $400–800/month
```

**Tier 3: Scale (300,000–1,000,000 dealers)**

```
AWS ap-south-1:
  - EKS Kubernetes: 6–20 pods, HPA on CPU + RPS metrics
  - EKS sync worker: separate node pool with 4GB RAM nodes
  - RDS PostgreSQL: db.r7g.xlarge + 2 read replicas + PgBouncer
  - ElastiCache Redis: cluster mode (3 shards)
  - Read queries routed to replicas via pg-read-replica connection string
  - Transactions partitioned by month and archived to S3 after 12 months

Estimated cost: $1,500–3,000/month
```

### Database Query Optimization

**Cursor-based pagination (not OFFSET)**

```typescript
// WRONG — breaks at 100k+ rows because PostgreSQL must scan and discard all OFFSET rows
SELECT * FROM transactions WHERE dealer_id = $1 ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

// CORRECT — cursor-based, O(log n) regardless of how deep in the result set you are
SELECT * FROM transactions
WHERE dealer_id = $1
  AND created_at < $2  -- cursor = created_at of last item in previous page
ORDER BY created_at DESC
LIMIT 20;
```

**Never SELECT \***

```typescript
// WRONG
SELECT * FROM dealers WHERE id = $1;

// CORRECT — only fetch columns you will actually use
SELECT id, fps_id, full_name, mobile, district, role, last_sync_at
FROM dealers WHERE id = $1;
```

**Transaction table partitioning**

Each monthly partition (`transactions_2025_06`, `transactions_2025_07`, etc.) is a separate physical table. Queries filtered by `month` only scan one partition instead of the entire transactions table. At 1M dealers × 30 transactions/month, the unpartitioned table would have 360M rows after 12 months. With monthly partitions, each query scans at most 30M rows.

---

## 16. Environment Variables

```env
# ─────────────────────────────────────────────
# APPLICATION
# ─────────────────────────────────────────────
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.efpsintelligence.in

# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────
DATABASE_URL=postgresql://efps_api:pass@host:5432/efps_prod
DATABASE_URL_SYNC_WORKER=postgresql://efps_sync:pass@host:5432/efps_prod
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# ─────────────────────────────────────────────
# REDIS
# ─────────────────────────────────────────────
REDIS_URL=redis://:password@host:6379

# ─────────────────────────────────────────────
# JWT
# ─────────────────────────────────────────────
JWT_ACCESS_SECRET=<64-byte-random-hex>       # openssl rand -hex 64
JWT_REFRESH_SECRET=<64-byte-random-hex>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# ─────────────────────────────────────────────
# ENCRYPTION (for eFPS credentials at rest)
# ─────────────────────────────────────────────
ENCRYPTION_KEY=<64-char-hex-string>          # openssl rand -hex 32

# ─────────────────────────────────────────────
# OTP / SMS (MSG91 India)
# ─────────────────────────────────────────────
MSG91_AUTH_KEY=<key>
MSG91_SENDER_ID=EFPSMS
MSG91_TEMPLATE_ID_OTP=<dlt-registered-template>
OTP_TTL_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_MAX=3
OTP_RATE_LIMIT_WINDOW_SECONDS=1800

# ─────────────────────────────────────────────
# SECURITY
# ─────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://efpsintelligence.in,https://www.efpsintelligence.in
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW_MS=900000

# ─────────────────────────────────────────────
# FILE STORAGE (Cloudflare R2)
# ─────────────────────────────────────────────
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_NAME=efps-files
R2_PUBLIC_URL=https://files.efpsintelligence.in

# ─────────────────────────────────────────────
# PLAYWRIGHT SYNC WORKER
# ─────────────────────────────────────────────
PLAYWRIGHT_SYNC_CONCURRENCY=3
PLAYWRIGHT_SYNC_RATE_MAX=10
PLAYWRIGHT_SYNC_RATE_WINDOW_MS=60000
EFPS_GOV_URL=https://efps.gujarat.gov.in
SYNC_STAGGER_DELAY_MS=2000

# ─────────────────────────────────────────────
# MONITORING
# ─────────────────────────────────────────────
LOG_LEVEL=info
SENTRY_DSN=<sentry-dsn>
```

---

## 17. API Response Envelope

Every endpoint returns the same wrapper shape. The frontend can always check `success` before accessing `data`.

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fps_id": "12345",
    "full_name": "Ramesh Patel"
  }
}
```

### Paginated Success Response

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "limit": 20,
    "total": 1500,
    "cursor": "2025-06-01T08:30:00Z",
    "hasMore": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "FPS ID or password is incorrect.",
    "field": "password",
    "statusCode": 401
  }
}
```

`field` is optional — only present when the error maps to a specific input field. `code` is always a machine-readable string from the error code registry (Section 18).

---

## 18. Error Code Registry

```typescript
export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS:    'INVALID_CREDENTIALS',     // 401
  TOKEN_EXPIRED:          'TOKEN_EXPIRED',            // 401
  TOKEN_INVALID:          'TOKEN_INVALID',            // 401
  SESSION_NOT_FOUND:      'SESSION_NOT_FOUND',        // 401
  ACCOUNT_SUSPENDED:      'ACCOUNT_SUSPENDED',        // 403
  ACCOUNT_UNVERIFIED:     'ACCOUNT_UNVERIFIED',       // 403

  // OTP
  OTP_INVALID:            'OTP_INVALID',              // 400
  OTP_EXPIRED:            'OTP_EXPIRED',              // 400
  OTP_MAX_ATTEMPTS:       'OTP_MAX_ATTEMPTS',         // 400
  OTP_RATE_LIMITED:       'OTP_RATE_LIMITED',         // 429

  // Dealer
  FPS_ID_NOT_FOUND:       'FPS_ID_NOT_FOUND',         // 404
  FPS_ID_TAKEN:           'FPS_ID_TAKEN',             // 409
  MOBILE_TAKEN:           'MOBILE_TAKEN',             // 409
  DEALER_NOT_FOUND:       'DEALER_NOT_FOUND',         // 404

  // Sync
  SYNC_CREDENTIALS_MISSING: 'SYNC_CREDENTIALS_MISSING', // 400
  SYNC_ALREADY_RUNNING:   'SYNC_ALREADY_RUNNING',     // 409
  SYNC_RATE_LIMITED:      'SYNC_RATE_LIMITED',        // 429
  EFPS_LOGIN_FAILED:      'EFPS_LOGIN_FAILED',        // 502
  EFPS_PORTAL_UNAVAILABLE: 'EFPS_PORTAL_UNAVAILABLE', // 503

  // General
  VALIDATION_ERROR:       'VALIDATION_ERROR',         // 422
  NOT_FOUND:              'NOT_FOUND',                // 404
  FORBIDDEN:              'FORBIDDEN',                // 403
  RATE_LIMITED:           'RATE_LIMITED',             // 429
  INTERNAL_ERROR:         'INTERNAL_ERROR',           // 500
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

---

## 19. RBAC

Three roles exist. Each is enforced at the middleware level — not in service logic.

```typescript
// src/shared/types/enums.ts
export enum Role {
  DEALER        = 'dealer',        // Default — can only access own data
  AREA_OFFICER  = 'area_officer',  // Can view dealers in assigned area (read-only)
  ADMIN         = 'admin',         // Full access including bulk operations
}

// src/shared/middleware/authorize.ts
export function authorize(requiredRole: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.user.role;

    const roleHierarchy = {
      [Role.DEALER]: 0,
      [Role.AREA_OFFICER]: 1,
      [Role.ADMIN]: 2,
    };

    if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
      throw new AuthError('FORBIDDEN', 403, 'Insufficient permissions');
    }
  };
}

// Usage in routes
fastify.get('/admin/dealers', {
  preHandler: [authenticate, authorize(Role.ADMIN)],
}, adminController.listDealers);

// Ownership check — dealers can only access their own data
export function requireOwnership(paramName: string = 'id') {
  return async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const resourceId = request.params[paramName];
    const userId = request.user.id;
    const userRole = request.user.role;

    // Admins can access anything
    if (userRole === Role.ADMIN) return;

    // Dealers can only access their own resources
    if (resourceId !== userId) {
      throw new AuthError('FORBIDDEN', 403, 'You can only access your own data');
    }
  };
}
```

---

## 20. Background Jobs

All jobs run via BullMQ workers. Each job type has its own queue and worker.

### efps-sync.job.ts

Described fully in Section 8. The most critical worker.

Queue: `efps-sync`
Concurrency: 3 (per worker instance)
Retry: 3 attempts, exponential backoff (5s, 10s, 20s)
Schedule: Daily at 3:00 AM IST for all sync-enabled dealers

### sms-otp.job.ts

```typescript
// Sends OTP SMS via MSG91
// Called immediately on OTP request — async so the API returns instantly

interface OtpJobData {
  mobile: string;
  otp: string;      // Raw OTP — only in transit, never stored
  purpose: string;
}

// Job processor
async function sendOtpSms(job: Job<OtpJobData>) {
  const { mobile, otp, purpose } = job.data;

  await msg91.sendOtp({
    mobile: `91${mobile}`,  // Indian country code
    otp,
    templateId: process.env.MSG91_TEMPLATE_ID_OTP,
  });
}
```

Queue: `sms-otp`
Retry: 3 attempts, fixed 2s delay
TTL: OTPs expire in 10 minutes — jobs older than that are pointless

### audit-flush.job.ts

Audit log entries are written to a Redis buffer during request handling (non-blocking). Every 30 seconds, this job flushes the buffer to PostgreSQL in a single bulk INSERT. This prevents audit log writes from adding latency to API responses.

### daily-report.job.ts

Runs at midnight IST. Generates aggregated daily stats per dealer (total distributions, remaining stock, pending beneficiaries) and stores them in a `daily_summaries` table. Also triggers `triggerScheduledSync()` for all sync-enabled dealers.

### session-cleanup.job.ts

Runs every 5 minutes. Removes expired dealer IDs from the Redis `online_dealers` SET. Removes expired rows from the PostgreSQL `sessions` table.

---

## 21. Testing Strategy

### Unit Tests (Vitest — no database required)

Test each service function in isolation by mocking the database and Redis clients.

- `auth.service.ts` — password hashing, token generation, OTP validation logic
- `encrypt.ts` — AES-256-GCM round-trip (encrypt then decrypt = original)
- `pagination.ts` — cursor encoding/decoding
- `response.ts` — envelope builder output shape
- `otp.ts` — 6-digit range, SHA-256 output format

### Integration Tests (Vitest + Supertest — real test DB via Docker)

Test complete request/response cycles with a real PostgreSQL and Redis instance.

- Full auth flow: register → login → refresh → logout
- OTP flow: request → verify → reset → login with new password
- Transaction creation → stock update → summary reflects change
- Rate limiting: exceed limit → receive 429 → wait → retry succeeds
- Sync trigger → job queued → mock worker runs → database updated

### Load Tests (k6)

Run before each major release.

```javascript
// k6/login.js — 1000 concurrent users
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 1000,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed:   ['rate<0.01'],  // Less than 1% error rate
  },
};

export default function () {
  const res = http.post('https://api.efpsintelligence.in/api/v1/auth/login', {
    fps_id: '12345',
    password: 'testpassword',
  });
  check(res, { 'status is 200 or 401': (r) => r.status === 200 || r.status === 401 });
  sleep(1);
}
```

Coverage target: 80% on service layer. Controllers and routes are thin; focus testing effort on service logic.

---

## 22. CI/CD Pipeline

```yaml
# .github/workflows/ci.yml

name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: efps_test
      redis:
        image: redis:7

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: yarn install --frozen-lockfile
      - run: yarn tsc --noEmit              # TypeScript type check
      - run: yarn lint                      # ESLint
      - run: yarn test:unit                 # Vitest unit tests
      - run: yarn test:integration          # Integration tests (uses service containers)

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t efps-api:${{ github.sha }} -f docker/Dockerfile .
      - run: docker build -t efps-worker:${{ github.sha }} -f docker/Dockerfile.worker .
      - run: docker push ...

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: railway up --service api
      - run: yarn test:smoke -- --env staging  # Basic smoke tests

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production      # Requires manual approval in GitHub
    steps:
      - run: railway up --service api --environment production
```

---

## 23. Monitoring and Observability

### Metrics (Prometheus + Grafana)

| Metric | Alert Threshold |
|--------|----------------|
| HTTP 5xx error rate | > 1% over 5 minutes |
| API p95 response time | > 500ms |
| Database query time (slow query log) | > 1000ms |
| Redis memory usage | > 80% capacity |
| Login failure rate | > 50 failures/minute from single IP |
| Playwright sync failure rate | > 20% of sync jobs failing |
| BullMQ queue depth (efps-sync) | > 1000 pending jobs |

### Custom Metrics

```typescript
// Track sync success/failure rate
syncSuccess.inc({ triggered_by: job.data.triggeredBy });
syncDuration.observe(Date.now() - startTime);

// Track cache hit rate
cacheHit.inc({ key_type: 'dealer_profile' });
cacheMiss.inc({ key_type: 'dealer_profile' });

// Track login attempts
loginAttempt.inc({ result: 'success' | 'failure', reason: errorCode });
```

### Structured Logging (Pino)

```typescript
// Every log line is valid JSON
logger.info({
  requestId: req.id,
  dealerId: req.user?.id,
  method: req.method,
  path: req.url,
  statusCode: reply.statusCode,
  durationMs: responseTime,
}, 'request completed');
```

---

## 24. Security Vulnerabilities Fixed From eFPS Master

The existing fpsgujarat.in app has critical security flaws. Every one of these is fixed in this system.

| # | Vulnerability in eFPS Master | Fix in This System |
|---|------------------------------|---------------------|
| 1 | Password recovery returns **plaintext password** — passwords stored unhashed | Argon2id hashing. Password reset via OTP only. Raw password never stored, never returned. |
| 2 | FPS ID as login = sequential, enumerable — trivially brute-forced | UUID primary keys. FPS ID rate limited to 10 attempts/hour. Exponential backoff after failures. |
| 3 | No rate limiting on login or signup | Redis-backed rate limiting on all sensitive endpoints. See Section 13. |
| 4 | HTTPS not enforced on all API calls | HSTS header forces HTTPS. All API calls redirect HTTP to HTTPS. `Secure` flag on all cookies. |
| 5 | Session tokens long-lived without rotation | 15-minute access tokens. 30-day refresh tokens with rotation on every use. |
| 6 | No input validation — SQLi surface | All inputs validated by Fastify JSON Schema before handler runs. All DB queries use parameterized statements. |
| 7 | No 2FA for dealer accounts | OTP-based 2FA option via SMS. Configurable per-dealer. |
| 8 | "Forgot password" reveals account existence | Both found and not-found cases return identical response: "If this mobile is registered, you will receive an OTP." |
| 9 | Chrome extension dependency for core data | Server-side Playwright sync worker. No browser extension required. |
| 10 | No offline fallback | Service Worker on frontend (PWA). Cached data available offline. Sync on reconnect. |

---

## 25. Build Priority Order

Build in this exact order. Each item unblocks the next.

1. **Database schema + migrations** — everything depends on this. Run migrations before writing a single line of application code.

2. **Auth module** — login, JWT, refresh token rotation, logout. This unblocks the frontend.

3. **Rate limiting plugin** — install this before exposing any endpoint publicly. A single misconfigured endpoint without rate limiting can take down your entire server.

4. **Dealer registration + FPS ID lookup** — onboarding flow. Includes AES-256-GCM credential encryption setup.

5. **Playwright sync worker** — this is the core differentiator. Get it working with one dealer before building any other features. Verify the government portal login succeeds in headless mode.

6. **OTP + password reset** — fixes the biggest existing security flaw. Makes your app immediately safer than eFPS Master.

7. **Beneficiary CRUD** — now populated automatically from sync results. Manual add is the fallback.

8. **Transaction recording** — the main daily workflow for every dealer.

9. **Dashboard stats + online tracking** — Redis SADD/SREM implementation. Frontend needs this for the home screen.

10. **Reports + exports** — monthly PDF/CSV. Lower priority but dealers will ask for it early.

11. **Notifications** — build last. Infrastructure already exists via BullMQ.

12. **Admin panel** — build last. You need real data before admin tooling is meaningful.

---

## 26. What NOT to Do

These are mistakes that will cost weeks to undo.

**Do not use Express.** Fastify is 3x faster at the same code complexity. Express has no built-in schema validation. At 1M users, you will hit Express's performance ceiling.

**Do not store passwords in anything other than Argon2id.** Not bcrypt. Not SHA-256. Not MD5. Not plaintext. The existing eFPS Master app does this wrong. Do not repeat it.

**Do not store eFPS credentials in plaintext or with weak encryption.** AES-256-GCM with an externally managed key is the minimum. A breach of this table is a breach of Gujarat's entire ration distribution system.

**Do not use OFFSET pagination.** `OFFSET 50000` forces PostgreSQL to scan and discard 50,000 rows on every request. At scale this makes your API unusable. Use cursor-based pagination from day one.

**Do not put JWT refresh tokens in localStorage.** XSS can steal them. HttpOnly cookies only.

**Do not put your ENCRYPTION_KEY in your source code or .env file in version control.** Use a secrets manager.

**Do not run Playwright in the same process as your API server.** Chromium instances use 300–500MB RAM each. At 3 concurrent syncs, that is 1.5GB that your API server cannot use. Separate containers are mandatory.

**Do not scrape `ipds.gujarat.gov.in` or `efps.gujarat.gov.in` without dealer consent.** The correct approach is Playwright acting on behalf of a dealer who has explicitly consented and provided their own credentials.

**Do not build the admin panel before core dealer auth is solid.** An insecure dealer auth layer means your admin panel is also insecure.

**Do not use `SELECT *` in production queries.** Always name the columns you need. It prevents accidental exposure of sensitive fields and reduces data transferred from the database.

**Do not skip the Playwright worker and try to fake it with manually entered data.** Your entire competitive advantage over eFPS Master is that your app pulls live government data automatically. Without the sync worker, you are just a form with a database.

---

*eFPS Intelligence — Complete System Design v2.0*
*Stack: Fastify 4 + PostgreSQL 16 + Redis 7 + Playwright + BullMQ*
*Target: 1,000,000 Gujarat FPS dealers*
*Author: Generated as technical specification for eFPS Intelligence backend*