# CI secrets and deployment wiring

This document describes the runtime secrets required by the application and example wiring for GitHub Actions.

## Required secrets

- `DATABASE_URL` — Full Postgres connection string for production/staging. Example: `postgres://postgres:<PASSWORD>@<HOST>:5432/x402`.
- `SUPABASE_URL` — Supabase project URL (if used in production).
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key for browser usage (if needed).
- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy public app id (client-side).
- `PRIVY_APP_SECRET` — Privy secret (server-side only).
- `FACILITATOR_URL` — URL of facilitator service.
- `FACILITATOR_KEY` — Facilitator auth key (if applicable).
- `SENTRY_DSN` — Optional Sentry DSN for error reporting.
- `CDP_CLIENT_KEY_ID` — Coinbase CDP client key id (front-end client key identifier).
- `CDP_CLIENT_API_KEY` — Coinbase CDP client API key (client usage; treat as secret for CI/staging).

Do NOT commit secret values to the repository. Use your CI provider's secret storage.

## Example: GitHub Actions

Add the above secrets to your repository (Settings → Secrets → Actions) using the exact names above.

Then in your workflow you can reference them as environment variables. Example snippet to run migrations and tests:

```yaml
- name: Apply DB migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    # Use our migration runner which reads DATABASE_URL or .env.postgres
    node scripts/run-migrations.js

- name: Run DB smoke check
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    node scripts/check-db-ready.js
```

If you prefer the matrix job to bring up a local Postgres service (as in current `ci.yml`), leave the service as-is and run the migration runner against `postgres://postgres:postgres@localhost:5432/x402db`.

## Local developer flow

- Create an untracked `.env.postgres` with the following keys (do NOT commit):

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=x402
POSTGRES_PORT=5432
```

- Run Postgres locally via `docker-compose -f docker-compose.postgres.yml --env-file .env.postgres up -d`, then `npm run migrate`.
