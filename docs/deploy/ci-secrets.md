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
- `CDP_API_KEY_ID` — Coinbase CDP API key identifier (server-side key id).
- `CDP_API_KEY_SECRET` — Coinbase CDP API key secret (server-side). These are required if you plan to enable the optional Coinbase CDP adapter.

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

If you prefer the matrix job to bring up a local Postgres service (as in current `ci.yml`), leave the service as-is and run the migration runner against `postgres://postgres:postgres@localhost:5432/x402`.

## PNPM build-scripts in CI

On CI you may see `pnpm` log lines like "Ignored build scripts: <package>" and the workflow in this repo fails the run when that happens. This occurs when a dependency declares a `prepare`/`install` script that pnpm won't run automatically in some CI contexts. You have two options:

- Approve the builds in CI by running `pnpm approve-builds` before `pnpm install` (non-interactive via echo):

```bash
echo -e "@coinbase/x402\nfacilitators" | pnpm approve-builds
pnpm install --frozen-lockfile
```

- Or pin/replace the dependency versions that require native build steps with prebuilt alternatives.

Choose the approach that matches your CI security policy. The first option is simplest for dev teams; the second is safer for strict CI environments.

## Local developer flow

- Create an untracked `.env.postgres` with the following keys (do NOT commit):

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=x402
POSTGRES_PORT=5432
```

- Run Postgres locally via `docker-compose -f docker-compose.postgres.yml --env-file .env.postgres up -d`, then `npm run migrate`.
