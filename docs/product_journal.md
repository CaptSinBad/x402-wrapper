# x402-wrapper — Product Journal

Date: 2025-11-06
Branch: ci/add-workflow-cdp

This journal documents what the product is, tools used to build it, the codebase structure and key files, current status of development, and the roadmap / next steps.

## 1) Product summary

x402-wrapper is a seller-facing payment gateway and dashboard for "x402"-style signed payments. It lets sellers register paid HTTP endpoints (resources) or store items, set pricing models (per-request, one-time, subscription), generate activation codes (promo/coupon or bypass codes), and accept buyer payments via client-side EIP-712 signing or facilitator-backed settlement (optional Coinbase CDP adapter). A worker handles settlements. The product aims to make accepting crypto-native payments as easy as PayPal but simpler for merchants.

Core features:
- Seller endpoints (resource URL) registration with pricing metadata
- Buyer SDK for signing payment payloads (EIP-712) and submitting `X-PAYMENT`
- Facilitator integration for verify/settle flows (HTTP or optional `@coinbase/x402` CDP)
- Webhook HMAC verification for facilitator callbacks
- Activation codes (generate, redeem, short-lived bypass)
- Store items + reservations (added) for exact-price checkout and inventory guarantees
- Settlement worker to execute facilitator settlement requests

## 2) Tools & technologies used

- Framework: Next.js (app + pages), React, TypeScript
- Test runner: Vitest
- Validation: Zod
- DB: Postgres (primary), Supabase optional (code supports both paths)
- Package manager: pnpm
- CI: GitHub Actions (workflow added for install + env-validate + tests)
- Facilitation: custom HTTP facilitator adapter + optional Coinbase CDP (`@coinbase/x402`) dynamic import
- Cryptography/Signing: EIP-712 typed data (buyer SDK in `sdk/client`)
- Dev tooling: node scripts for migrations and env validation

## 3) Codebase overview (high level, key files)

Top-level folders:
- `app/` — Next.js app routes and components (server & client pages)
- `apps/dashboard/` — Seller dashboard and API routes (legacy pages-based dashboard exists)
- `core/` — facilitator adapters and core logic
- `db/` — migrations and schema
- `scripts/` — migration runner, env-validate, worker
- `sdk/` — buyer SDK (client) for signing and pay-and-fetch helper
- `lib/` — middleware and helpers used across the app
- `tests/` — Vitest tests

Important files (examples):
- `apps/lib/dbClient.ts` — central DB helper (Postgres + Supabase branches) and now includes activation-code and store reservation helpers
- `apps/dashboard/pages/api/create_payment_session.ts` — builds paymentRequirements and (now) reserves items when `items` provided
- `apps/dashboard/pages/api/facilitator/webhook.ts` — facilitator webhook with HMAC verification (handles settlement callbacks)
- `scripts/settlementWorker.js` — worker to process `settlements` queue
- `db/migrations/001_init.sql` — initial schema
- `db/migrations/002_pricing_and_activation_codes.sql` — pricing fields + activation_codes table
- `db/migrations/003_store_items_and_reservations.sql` — store items + reservations (new migration)
- `sdk/client/src/payAndFetch.ts` — buyer SDK helper for signing and sending payment headers
- `lib/paymentMiddleware.ts` — middleware to validate incoming payments and support activation-code bypass
- `types/coinbase-x402.d.ts` — type shim added to resolve TS build issues for optional `@coinbase/x402` package

## 4) What’s implemented so far (as of this journal)

- Webhook HMAC verification + unit tests (facilitator webhook)
- CI workflow file added (install + env-validate + tests)
- Env validation updated to require `FACILITATOR_WEBHOOK_SECRET`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` and load `.env.server` locally for build-time envs
- Optional Coinbase CDP adapter wired in `core/facilitator/` with dynamic import
- Pricing fields added to `seller_endpoints`; paymentRequirements updated in `create_payment_session`
- Activation codes: migration, DB helpers, generate & redeem endpoints
- Payment middleware updated to accept `x-activation-code` header and redeem codes
- Store items & reservations: migration and DB helpers added
- Reservation flow wired into `create_payment_session` (reserves stock when `items` present and attaches reservation ids to `payment_attempt`)
- Tests: unit tests pass locally (Vitest); one worker integration test skipped
- Branch `ci/add-workflow-cdp` created and pushed (PR pending to run CI)

### Recent updates (item_title snapshot & sales reporting)
- Sales table now includes an `item_title` column to snapshot the human-friendly item title at time of settlement. This preserves the historical name even if sellers later change item titles.
- `scripts/settlementWorker.js` was updated to read the `title` from `store_items` when confirming reservations and persist `item_title` into the `sales` record (Postgres and Supabase flows). The worker still computes per-item amount from `store_items.price_cents` when available, falling back to `paymentRequirements.maxAmountRequired`.
- `apps/dashboard/pages/api/sales.ts` and `apps/dashboard/components/SalesList.tsx` were updated so the dashboard shows a human-friendly `item_title` (falls back to `item_id` if no title available). The CSV export includes an `item_title` column.

### CI / package manager findings
- A CI-style frozen `pnpm install` was executed against the branch and the install reported: `Ignored build scripts: @coinbase/x402, facilitators. Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.`
- This indicates that some upstream packages require build/postinstall scripts (native builds or other actions). On CI we must either approve these builds, provide build toolchain, vendor a prebuilt artifact, or pin to a version that doesn't require native build steps. This is currently being triaged as "Decide remediation for upstream `facilitators` package".

## 4.1) Additional seller scenarios (new ideas)

- Books (physical and digital): Merchants selling books can list physical and digital formats (PDF/eBook). Buyers browsing the store can purchase a physical copy (reserve stock, pay, and have shipping handled by the seller) or immediately receive a digital download after settlement. Activation codes can be used to issue free copies, previews, or promotional downloads.
- Digital goods and downloads: single-use license keys, timed access, or downloadable content delivered after confirmed settlement.
- Service bookings: time-slot reservations (e.g., classes, appointments) where a reservation is held on checkout and confirmed on payment settlement.
- Donations and tipping: open-amount QR flows for community fundraising and flexible tips at market stalls.

These scenarios are compatible with the reservation and activation-code models implemented in the codebase. We'll track each as potential follow-up features (delivery workflows, digital asset hosting, license key issuance, shipping integrations).

## 5) Remaining gaps / risks

High priority gaps:
- Seller auth / access control: admin APIs (create endpoints, generate activation codes, manage items) need server-side seller authentication (Privy integration) and RBAC.
- Webhook -> reservation confirmation: webhook must mark reservations as confirmed/sold on successful settlement, and release on failure.
- Reservation reaper: background job to release expired reservations.
- Seller UI: minimal CRUD pages for items, activation codes, endpoints, and settlements.
- Buyer UI: payment pages that support exact-price item checkout and open-amount keypad, plus QR generation endpoints.
- CI/packaging risk: pnpm logs show ignored build-scripts warnings for some upstream packages; PR CI must be run and triaged (may require approving builds or pinning vendor binaries).

Operational risks:
- Supabase path lacks strong atomic guarantees for reservations; Postgres transactional path is implemented and preferred for production.
- Idempotency and reconciliation: ensure webhook handling is idempotent and add reconciliation for missing webhooks.

## 6) Roadmap & recommended next steps (prioritized)

Immediate (high impact):
1. Implement webhook settlement confirmation for reservations (mark `item_reservations` as confirmed and persist a sale record), idempotent. (2–4h)
2. Add seller authentication/guards for admin APIs (`activation_codes/generate`, store item CRUD) with Privy server-side checks. (1 day)
3. Reservation reaper (worker) to release expired reservations and log/notify sellers. (1–2h)
4. CI PR run & triage upstream package build-script warnings. (0.5–1 day depending on remediation)

Near term (MVP seller experience):
5. Buyer-facing checkout page and QR generator (support precise invoice for items and open-amount keypad). (1–2 days)
6. Minimal seller UI for items (CRUD), activation codes, and settlement list. (2–3 days)
7. Tests: concurrency tests for reservations and integration tests for sign->verify->settle. (1–2 days)

Longer term (production readiness):
8. Subscriptions/recurring billing support and billing records. (multi-week)
9. Monitoring and runbook, secrets in CI, staging deploy and smoke tests. (multi-day)

## 7) Implementation notes & conventions

- Use `RESERVATION_TTL` env var for reservation life (default 900s = 15 min).
- Prefer Postgres for strong transactional behavior; Supabase support is best-effort for reservations.
- Store `reservation` ids inside `payment_attempt.payment_payload` so webhooks can correlate attempts to reservations without schema changes.
- Use `UPDATE ... WHERE stock >= qty` pattern and `SELECT ... FOR UPDATE` in transactions to avoid double-sells.

## 8) Ownership & contributors

- Repo owner: `hmichaelsonpixel`
- Current branch with changes: `ci/add-workflow-cdp`
- Important contributors / places to check for further work: `core/facilitator`, `apps/dashboard/pages/api/*`, `apps/lib/dbClient.ts`, `sdk/client`.

## 9) Next action I'll take (unless you direct otherwise)
- Implement webhook settlement confirmation to call `confirmReservation` and create sale records (idempotent), then add tests for reservation confirm/release flows.

## 10) How to run this project locally (developer instructions)

These are the exact steps your partner/developer should follow after cloning the repository to run the migrations, start a local Postgres for integration testing, and run the worker integration test locally.

Prereqs:
- Docker installed (for running Postgres container)
- Node 20 installed (or use the repo dev container)
- corepack & pnpm available (we use pnpm in CI and locally)

Quick steps (copy-paste):

1. Clone and checkout the feature branch:

```bash
git clone <your-repo-url>
cd x402-wrapper
git checkout ci/add-workflow-cdp
```

2. Enable corepack and install pnpm (if not present):

```bash
corepack enable
corepack prepare pnpm@8.8.0 --activate
pnpm install --frozen-lockfile
```

3. Start a local Postgres container (this uses the same credentials in `.env.postgres`):

```bash
docker run --name x402-postgres \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_PASSWORD=Gi7BJfYpTy7Gf2ZBXNNwUUwc9CCKxVm2 \
	-e POSTGRES_DB=x402 \
	-p 5432:5432 -d postgres:15

# wait for it to be ready (optional helper)
for i in $(seq 1 30); do docker exec x402-postgres pg_isready -U postgres >/dev/null 2>&1 && break || sleep 1; done
```

4. Source the local env file and run migrations (this will apply db migrations found in `db/migrations`):

```bash
set -a; source .env.postgres; set +a
node scripts/run-migrations.js
```

5. Run the worker integration test (it is gated behind `RUN_WORKER_INTEGRATION=true` to avoid running unexpectedly locally):

```bash
export RUN_WORKER_INTEGRATION=true
pnpn test -- -t 'worker processes a queued settlement (RUN_ONCE)'
# Note: if you use pnpm directly the command is `pnpm test -- -t 'worker processes a queued settlement (RUN_ONCE)'`
```

6. When finished, stop/remove the local postgres container:

```bash
docker stop x402-postgres && docker rm x402-postgres
```

Notes & tips:
- The integration test creates a small HTTP stub facilitator during its run and inserts a queued `settlements` row. The worker will pick this up and update the settlement row to `confirmed`.
- If you prefer not to use Docker, you can point the test to a remote Postgres by setting `TEST_DATABASE_URL` or the `PG_*` env vars before running the test.
- The test is intentionally gated by `RUN_WORKER_INTEGRATION=true`. If you want CI to run the test, set that env var in the CI job (we can do this in a follow-up PR).

## 11) Files changed in this work
- `apps/dashboard/pages/api/sales.ts` — prefer `sales.item_title` snapshot and CSV export includes `item_title`.
- `apps/dashboard/components/SalesList.tsx` — show human-friendly item title (fallback to `item_id`).
- `db/migrations/004_sales.sql` — added `item_title` column.
- `scripts/settlementWorker.js` — now reads `store_items.title` and persists `item_title` into `sales` rows (Postgres & Supabase flows).
- `tests/worker.integration.test.ts` — made conditional on `RUN_WORKER_INTEGRATION=true`.
- `.env.postgres` — aligned `DATABASE_URL` to POSTGRES_* and DB name `x402`.
- `.github/workflows/ci.yml` — install native build tools, capture pnpm install log, and fail on ignored build scripts; CI Postgres service DB set to `x402`.
- `docs/product_journal.md` — updated journal with recent changes and local run instructions.

If you want, I can open a PR with these changes or push this branch to your remote and create the PR for you. If pushing fails due to auth, I'll provide the exact git commands for you to run locally.

---

This journal file will be kept in the repository at `docs/product_journal.md`. Update it as milestones are completed.
