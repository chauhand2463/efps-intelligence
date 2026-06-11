# eFPS Intelligence Backend

Fair Price Shop Management Platform for Gujarat PDS.

## Tech Stack

- **Runtime:** Node.js 22 (LTS)
- **Framework:** Fastify 4
- **Language:** TypeScript 5
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Queue:** BullMQ
- **Auth:** JWT + Refresh Token Rotation

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start dependencies (PostgreSQL + Redis):
   ```bash
   docker compose -f docker/docker-compose.yml up -d db redis
   ```

4. Run migrations:
   ```bash
   npm run migrate
   ```

5. Seed test data:
   ```bash
   npm run seed
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

## API Documentation

When running in development mode, visit `/docs` for Swagger UI.

## Test Accounts

| FPS ID | Password | Role |
|--------|----------|------|
| 12345 | Password123 | Admin |
| 12346 | Password123 | Dealer |

## Project Structure

```
src/
├── app.ts                 # Fastify app factory
├── server.ts              # Entry point
├── config/                # Config (env, database, redis, constants)
├── plugins/               # Fastify plugins
├── modules/               # Feature modules (auth, dealer, beneficiary, etc.)
├── shared/                # Shared code (middleware, utils, errors, types)
├── database/              # Migrations, seeds, queries
└── jobs/                  # BullMQ background workers
```
