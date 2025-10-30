# Handoff: x402-wrapper — Developer Runbook

This document is a step-by-step handoff for a developer to take this project from local development to production (go-live). It includes tooling, install commands, environment setup, how to run the front-end and back-end locally, CI notes, secrets guidance, and an ordered checklist for go-live.

## High-level overview
- Repo: x402-wrapper
- Primary app: `apps/dashboard` (Next.js app with API routes)
- Worker: background settlement worker (node script / Docker image)
- DB: Postgres (migrations in `db/migrations/001_init.sql`)
- Payment flow: `lib/paymentMiddleware.ts`, `sdk/client` (buyer helpers), demo `pay-demo` page

## Assumptions
- You're on Linux or macOS. The dev container used while editing is Ubuntu 24.04.
- You have access to required secrets (or will create placeholders during dev).

## Tools to install (local dev)
Install tools and versions tested with this repo (Ubuntu examples). Use homebrew or platform package managers if you prefer macOS.

- Git (>=2.40)
- Node.js 20.x (LTS) — use nvm to install/manage: `nvm install 20 && nvm use 20`
- npm or pnpm (examples use npm): Node ships with npm
- Docker & Docker Compose (Docker Engine + docker-compose v2): follow Docker docs
- PostgreSQL client (psql) for debugging (optional): `sudo apt install postgresql-client`
- Optional helpful tools: `pgcli` (nice postgres CLI), `jq`, `watch`, `htop`

Install commands (Ubuntu):

```bash
# Node (using nvm)
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20

# Docker
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# PostgreSQL client
sudo apt-get install -y postgresql-client

# Optional: pgcli
pip install --user pgcli
```

Add your user to the docker group (log out/in after):

```bash
sudo usermod -aG docker $USER
```

## Get the repo and install dependencies

```bash
git clone <repo-url> x402-wrapper
cd x402-wrapper
npm ci
```

Notes:
- The monorepo has the main app at `apps/dashboard` and an SDK at `sdk/client`.
- `npm ci` from repo root installs dependencies used by test harness. If you prefer per-package installs (e.g., in `sdk/client`), adjust accordingly.

## Environment variables
- There are two example files added: `.env.client.example` and `.env.server.example` at the repo root.
- Copy them to `.env.client` and `.env.server` respectively for local development (do NOT commit these files).

Minimal values to run locally (example):

```bash
cp .env.client.example .env.client
cp .env.server.example .env.server
# Update DATABASE_URL to match your local Postgres if you're not using docker-compose
# Example: DATABASE_URL=postgres://postgres:postgres@localhost:5432/x402_dev
```

## Start Postgres + Migrations (local dev)
The repo uses a `docker-compose.yml` + `docker-compose.override.yml` pattern for dev. The override contains a `postgres` service and a `migrate` service that applies SQL in `db/migrations`.

To start local services:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build -d
# Wait until the migrate service exits successfully and Postgres is healthy.
docker compose logs migrate --follow
```

If you don't use docker for Postgres, ensure `DATABASE_URL` points to a running Postgres and run migration SQL: `psql $DATABASE_URL -f db/migrations/001_init.sql`.

## Run the app and worker locally

Run Next.js app (dashboard):

```bash
cd apps/dashboard
npm run dev
```

Run worker locally (node script):

```bash
npm run worker
```

Or run both via docker-compose (web + worker images built from Dockerfile):

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

## Tests

Unit & integration tests are run with Vitest.

```bash
npx tsc --noEmit
npx vitest run --reporter verbose
```

Notes:
- Some integration tests require Postgres to be running (the tests refer to a local Postgres). If you see ECONNREFUSED about 127.0.0.1:5432, confirm docker compose is running.

## Front-end notes (apps/dashboard)

- Framework: Next.js (app router in `apps/dashboard/app` or `pages` depending on project layout). The public UI is in `apps/dashboard/pages`.
- Entry point for demo pages: `apps/dashboard/pages/pay-demo.tsx` (a demo that requests protected resources and simulates client-side payment header creation).
- API routes: `apps/dashboard/pages/api/*` provide server endpoints including `api/paid/resource` which is a demo protected API route using `lib/paymentMiddleware.ts`.

Run only the front-end dev server (hot reload):

```bash
cd apps/dashboard
npm run dev
# Visit http://localhost:3000/pay-demo
```

Front-end build for production:

```bash
cd apps/dashboard
npm run build
npm run start
```

If you host the front-end separately (Vercel, Netlify, or static host), configure build to run `next build` and set correct environment variables in the host UI.

## CI/CD notes (GitHub Actions)

- There is a CI workflow that starts Postgres, applies migrations, runs `tsc`, `vitest`, and builds the app. Key points:
  - DO NOT store production secrets directly in workflows; use GitHub repository secrets.
  - CI applies migrations against a test Postgres service in the job. Ensure migration SQL is idempotent (it already uses IF NOT EXISTS for extensions/tables).

Recommended CI improvements before go-live:
- Update workflow to read database credentials from GitHub secrets (DB_HOST, DB_USER, DB_PASS, DATABASE_URL).
- Add steps to publish Docker images and deploy to your target infra (VPS, k8s, or cloud provider).
- Add a job that runs integration tests against a fresh Postgres instance (and tears it down afterwards).

## Secrets & runtime config (critical before go-live)

1. Rotate and remove any secrets mistakenly committed in the repo history. Add `.env.*` to `.gitignore` (already done).
2. Use a secrets store (GitHub Actions secrets, HashiCorp Vault, AWS Secrets Manager) for production. CI jobs should read secrets from repo secrets.
3. For Docker Compose production, use an env file stored securely on the server (not in git) or use docker secrets.

Required server secrets (from `.env.server.example`):
- DATABASE_URL
- SUPABASE_SERVICE_KEY
- PRIVY_API_KEY / PRIVY_CLIENT_SECRET
- FACILITATOR_URL / FACILITATOR_API_KEY

## Go-live runbook (step-by-step)
This is a minimal, ordered checklist to get from dev -> production.

1. Prepare infra
   - Provision a production Postgres (managed or self-hosted). Create backups and ensure point-in-time recovery.
   - Set up a provisioning user and a production database.
   - Reserve a domain and set up DNS.

2. Secrets & config
   - Add required secrets to your secrets manager (GitHub Secrets, Vault). Use strong, rotated keys.
   - Create a production `.env` (or inject secrets into your container runtime) using values from the secrets manager.

3. CI adjustments
   - Update the GitHub Actions workflow to publish Docker images to a registry (GitHub Packages, Docker Hub, ECR).
   - Add a `deploy` job that pulls the image(s) on your server and performs a migration step before switching traffic.

4. Migration strategy
   - Ensure migrations are idempotent. Run `psql $DATABASE_URL -f db/migrations/001_init.sql` on a staging DB first.
   - Make a DB backup before applying migrations in production. If using managed Postgres, take a snapshot.

5. Deploy to production
   - Pull published Docker images on the target host(s).
   - Run migration step on production DB.
   - Start containers (web, worker) using `docker compose -f docker-compose.prod.yml up -d` or your orchestrator.
   - Monitor logs for errors.

6. Smoke tests
   - Run a set of smoke tests: request a non-402 resource; request a protected resource and ensure a 402 is returned; run worker health-checks.

7. Monitor & rollback
   - Monitor Postgres performance, app logs, error rates.
   - If migration causes issues: rollback to DB backup and redeploy the previous image.

## Front-end specific go-live notes
- If you deploy front-end separately (Vercel/Netlify): set build command to `npm run build` and publish directory per provider (Next handles routing). Set environment variables in the provider settings.
- If you deploy with Docker Compose, build the `web` image and serve with `next start`.
- Use a CDN in front of the app for static assets and caching.

## Operational concerns
- Logging & alerts: integrate Sentry or similar in both web and worker. Add Prometheus metrics if you need high visibility.
- Worker scaling: design how many worker processes to run and how to scale them. Worker consumes DB queue or other job source.
- Security: ensure server-only envs are never sent to client builds. Review `docker-compose.yml` env handling to avoid leaking secrets at build time.

## Recommended next steps (priority order)
1. Remove any committed `.env.*` files from git history and rotate keys (if any leaks detected).
2. Wire GitHub Actions to use repository secrets and add a `deploy` job to publish Docker images.
3. Add a staging environment to test migrations and the full stack before production.
4. Add integration tests for the worker and end-to-end payment flow.
5. Add monitoring and alerting (Sentry + Prometheus) and on-call runbooks.

## Troubleshooting & common pitfalls
- If tests fail with `ECONNREFUSED` on 5432: ensure Postgres is running locally (via docker compose or installed Postgres) and `DATABASE_URL` is correct.
- If `docker compose` fails to apply migrations, inspect the `migrate` service logs and ensure the DB is healthy and accepting connections.
- If the front-end receives server-only envs in the client bundle, check build env passing in `docker-compose.yml` and Next.js config.

## Contact & context
- Last edits done on: 2025-10-30 (local dev). The repo currently includes demo payment middleware, a buyer SDK example, and a `pay-demo` page.
- Files of interest:
  - `docker-compose.yml`, `docker-compose.override.yml` — local dev compose
  - `db/migrations/001_init.sql` — migration SQL
  - `lib/paymentMiddleware.ts` — middleware example
  - `apps/dashboard/pages/api/paid/resource.ts` — demo protected API route
  - `sdk/client/src/example.ts` — buyer SDK demo helpers
  - `apps/dashboard/pages/pay-demo.tsx` — demo UI

## Appendix: Quick commands summary

Start dev stack (build images, apply migrations):

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build -d
```

Run front-end locally:

```bash
cd apps/dashboard
npm run dev
```

Run worker locally:

```bash
npm run worker
```

Run tests and typecheck:

```bash
npx tsc --noEmit
npx vitest run --reporter verbose
```

If you want, I can now (pick one):

- Add a `docs/x402_quickstart.md` with trimmed commands for an onboarding checklist.
- Implement a safe way to remove tracked `.env` files from git history (and create examples) and automate adding `.env` to `.gitignore`.
- Reintroduce a pay-demo test with a compatible test setup (install React testing libs or modify test harness).

---

End of handoff.
