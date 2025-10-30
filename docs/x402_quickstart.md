# x402-wrapper Quickstart

This document explains how to run x402-wrapper locally and how to prepare a VPS with Postgres for production usage.

## Overview

- The app is a Next.js dashboard + API that registers paid endpoints and enqueues settlements.
- A background worker processes `settlements` rows and calls the configured facilitator `/settle` endpoint.
- By default the code prefers Postgres when `USE_LOCAL_PG=true` or if Supabase envs are not present.

## Local development (with local Postgres)

1. Create a Postgres instance (docker-compose or local):

```bash
docker run -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=x402db -p 5432:5432 -d postgres:15
```

2. Apply the migrations:

```bash
psql "postgres://postgres:postgres@localhost:5432/x402db" -f db/migrations/001_init.sql
```

3. Copy `.env.example` to `.env.server` and `.env.client` and set required envs. Example server envs:

```
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=x402db
USE_LOCAL_PG=true
FACILITATOR_URL=https://facilitator.cdp.coinbase.com
```

4. Install deps and run locally:

```bash
npm install
npm run dev
```

In another terminal you can run the worker (single-run or long-running):

```bash
# single iteration
RUN_ONCE=true node scripts/settlementWorker.js

# long running
node scripts/settlementWorker.js
```

## Deploy to a VPS (Postgres on VPS)

1. Provision Postgres on your VPS and create a database `x402db` with a user.

2. Copy the migration SQL (`db/migrations/001_init.sql`) to the VPS and run it using psql to create tables.

3. Upload the app to the VPS or build Docker images and run containers. Set env vars (server-only) as systemd unit or Docker env or secrets:

Required server envs (example):

```
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your-db-password
PG_DATABASE=x402db
USE_LOCAL_PG=true
FACILITATOR_URL=https://facilitator.cdp.coinbase.com
PRIVY_APP_SECRET=... (if using Privy server verification)
```

4. Start the app (example using systemd or pm2):

```bash
# build and run
npm ci --production
npm run build
NODE_ENV=production npm start

# run worker in background via pm2, systemd, or a container
npm run worker
```

## CI

- There is a GitHub Actions workflow in `.github/workflows/ci.yml` that spins up Postgres, runs migrations, tests and builds.

## Notes

- Rotate any Supabase or Privy keys if they were previously committed.
- For production use consider: Docker image build + registry, migrations in deploy pipeline, secrets manager (AWS Secrets Manager / Vault), and monitoring.
