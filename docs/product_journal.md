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

Below is an updated, concrete prioritized plan derived from the demos and mapping work. These are arranged so you can demo the "instant settlement / POS" experience quickly, then broaden to a full merchant experience and production hardening.

Immediate (high impact — demo & safety)
1. Implement dev-settle simulator (DEV only) — a gated API route and small dev-dashboard control that can either call `confirmReservationAndCreateSale` directly or insert a `settlements` row for the worker to pick up. This gives you a fast, deterministic demo of "scan QR → instant settle" without an external facilitator. (2–3 hours)
2. Implement webhook settlement confirmation hardening — ensure worker claim semantics (`UPDATE ... WHERE status='queued' RETURNING id` or `SELECT FOR UPDATE SKIP LOCKED`) and idempotent processing. (2–4 hours)
3. Add reservation reaper worker — background job to release expired reservations and restore stock to avoid stuck inventory. (2–4 hours)
4. CI `pnpm` build-script triage — resolve ignored build-scripts warnings (approve builds, pin packages, or vendor binaries) so CI installs reliably. (0.5–1 day)

Near term (MVP seller experience)
5. Add `payment_links` + link resolver — create a `payment_links` table and admin APIs; add a public resolver page `app/link/[token]` that displays product info and a Pay/QR UI. (1–2 days)
6. QR generator & POS page — endpoint to produce QR payloads and a minimal POS client `app/pos/[token]` that merchant staff can use to start the checkout flow. (0.5–1 day)
7. Merchant onboarding & receiving address UI — allow sellers to connect a wallet or input a receiving address and associate it with seller endpoints. (1 day)

Mid / longer term (production readiness)
8. RBAC / Privy integration — secure admin APIs (activation codes, item CRUD, endpoints) with server-side Privy checks. (1 day)
9. Add gated integration tests — webhook -> worker -> confirmReservationAndCreateSale (gated via `RUN_WORKER_INTEGRATION=true`). (0.5–1 day)
10. Merchant-facing UX polish — CSV exports, settlement list, item CRUD, activation-code flows, and POS UX improvements. (multi-day)
11. Subscriptions/recurring billing & enterprise features (longer roadmap). (multi-week)

Journal TODOs (immediate actionable items)
- TODO: Implement dev-settle simulator (add docs, API route, dev dashboard control). See `apps/lib/dbClient.ts` -> `confirmReservationAndCreateSale` for the atomic confirm+sale primitive. (Assigned to: engineering)
- TODO: Add `payment_links` schema and link resolver page. (Assigned to: product + engineering)
- TODO: Schedule CI run and triage pnpm ignored build-scripts. (Assigned to: engineering / devops)

Next immediate engineering task (planned)

- TODO: Protect the Payment Links admin API with RBAC/Privy server-side checks. Implementation notes:
  - File to change: `apps/dashboard/pages/api/payment_links/create.ts` — wrap the default export with `requireSellerAuth` or `requireAuth` so only authenticated sellers can create links for their account.
  - Use existing helpers: `apps/lib/requireSellerAuth.ts` and `apps/lib/verifyPrivySession.ts` (server-side verification). Ensure the created `payment_links.seller_id` is validated against the authenticated seller's wallet or ID.
  - Add unit tests: mock Privy verification and assert unauthorized requests are rejected and that authorized requests create link records.
  - Security: do not enable this API unprotected in staging/production until Privy envs and secrets are configured.

These updates will be implemented next (RBAC first), then we will continue with the merchant-facing POS polish and production hardening.

These steps are intentionally ordered so you can produce a high-impact demo (dev-settle + QR/pos stub) quickly and then lock down safety (reaper, RBAC, worker hardening) before opening to pilots.

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


## Executive summary (1‑line)
The repo contains the core plumbing for reservations, on‑server verification, a settlements queue + worker, and an atomic confirm+sale helper — so the backend has the essentials to deliver the "instant POS" demo in controlled conditions — but the product gaps to reach the full "Stripe-like payment links + consumer UX + merchant onboarding" experience are significant and mostly UI- and flow-oriented (payment link creation, QR UI, link resolution & buy flow), plus a few production hardening items (RBAC, reservation reaper, CI packaging).

## How the video's claims line up with the code & docs
I'll quote or paraphrase each claim and then show how the repo supports it (files/notes) and what remains.

1) "Stripe Payment Links, but each one is a x402 payment link powered by onchain money"
- Evidence in repo:
  - Product intent: pitch.txt explicitly calls out "create a product or endpoint, set a price, and get a payment link or QR code".
  - Data model: `store_items` + `payment_attempts` + `item_reservations` enable product-oriented checkout (dbClient.ts implements `createStoreItem`, `reserveItem`).
- Implemented today:
  - Backend primitives for products, reservations and payment attempts — yes (dbClient.ts, migrations referenced in product_journal.md).
- Missing / partial:
  - There is no `payment_links` table or link-generation flow implemented yet (no persisted short token representing a product that resolves to a checkout). The repo expects `seller_endpoints` and pages but not a short-link generator.
  - No UI or API to create a 1-click/short link that encodes onchain payment parameters (price, seller wallet) and returns a shareable short URL/QR.
- Recommendation to support this claim:
  - Add `payment_links` DB table (token, seller_id, item_id or endpoint_id, price, network, expires_at, metadata) and endpoints/UI to create/manage links.
  - Add a public `app/link/[token]` resolver page that shows product info and a Pay button/QR.

2) "Every link can represent a product. You create it, share it, and receive funds directly on-chain — no intermediaries, no waiting."
- Evidence:
  - On-chain settlement option is in the architecture: buyer SDK signs EIP-712 (client), and facilitator/optional CDP support is in facilitator and create_payment_session.ts (per product_journal.md).
- Implemented today:
  - Buyer SDK for signing (client), and server-side payment attempt & reservation logic exist.
  - Worker + settlement queue present: settlementWorker.js plus `insertSettlement` in dbClient.ts.
- Missing / partial:
  - Direct "no intermediaries" on-chain settlement is not implemented as a payment-link-to-onchain flow that creates a transaction and routes funds directly to merchant wallet without facilitator. The code assumes either client submits a signed proof (`X-PAYMENT`) or facilitator verifies/settles.
  - The onchain direct-pay UX (generate a tx, show gas & pay) is not provided in the app UI.
- Recommendation:
  - For a true "links -> onchain" flow, implement a checkout UX that either:
    a) Uses the buyer SDK to sign an EIP-712 payment and submits it to the seller server; server verifies and optionally pushes the signed tx to the chain or returns information for the wallet to broadcast, or
    b) Redirects to a wallet flow that constructs and sends the transaction directly to the merchant wallet. This needs an explicit design for gas/chain fees, payment routing, and merchant wallet config.

3) "POS: Scan a QR → confirm payment → funds settle on-chain in seconds"
- Evidence:
  - QR + POS UX are mentioned in pitch.txt & product_journal.md as intended use cases.
  - Backend capability to confirm a reservation on settlement is implemented: `confirmReservationAndCreateSale` atomic helper exists in dbClient.ts; webhook worker exists.
- Implemented today:
  - Atomic confirm+sale helper (`confirmReservationAndCreateSale`) — gives the exact primitive needed for "scan QR -> confirm sale" behavior when the settlement event arrives.
  - Webhook handler and settlements queue: webhook.ts (documented in webhook_settlement_confirmation.md) + settlementWorker.js.
- Missing / partial:
  - QR generation page and POS flow (scan -> checkout page -> wallet signing -> facilitator settlement) are not implemented as a small POS app or dedicated page. The repo lacks a `qr` generator endpoint and a compact POS UI.
  - Achieving "settle on-chain in seconds" depends on the chain/facilitator. The repo supports facilitator-based settlement (fast if facilitator provides it), but achieving consistent seconds-level settlement on mainnet requires a facilitator that does the settlement (CDP) and chain conditions (L2 or fast relayer).
- Recommendation:
  - Add a `qr` generator endpoint that maps a `payment_link` token to a QR (or base64 PNG) and a minimal POS client `app/pos/[token]` that: displays price, shows QR, allows the buyer's wallet to sign & broadcast, and then updates the merchant UI when `confirmReservationAndCreateSale` runs.
  - Consider adding a dev-mode `dev-settle` endpoint (safe gate) to demo instant settlement without an external facilitator — quick wins for demos.

4) "I simulated this today — retail user scans the QR, the transaction executes instantly. This is what crypto payments were meant to feel like."
- Evidence:
  - There are media/demo files you uploaded and the pitch text describes a simulation.
  - The codebase includes worker + helper logic to atomically mark sales once settlement arrives.
- Implemented today:
  - The atomic backend parts that make the demo possible are present (reservations, confirm+sale, worker, settlement queue).
- Missing:
  - The repo does not yet contain the short-link/QR generator, POS UI, or a dev route to simulate an external facilitator webhook easily (a dev-settle simulator is not present but would be small).
- Recommendation:
  - Implement a dev-settle simulator (dev-only) that either calls `confirmReservationAndCreateSale` directly or injects a settlement row for the worker; add a small POS UI for demonstration.

5) "Removes friction, kills intermediaries, lets developers build repay-style retail flows natively on x402"
- Evidence:
  - The code is architected to minimize server-side complexity for sellers: `paymentMiddleware`, client, `store_items`, `reservations`, `confirmReservationAndCreateSale`.
- Implemented today:
  - The core middleware and SDK exist so developers can build flows.
- Missing:
  - UX primitives, link/QR flow and onboarding are not finished. Merchant onboarding (Wallet connect + set merchant receiving address, simple "create link" UI) is not implemented.
- Recommendation:
  - Prioritize merchant onboarding UI (connect wallet, set receiving address, create link/product, generate QR). Also add clear docs for merchants about settlement/chargeback expectations.

6) "No more banks... cart had $0.50 lattes... Cart hash prevents double-spending"
- Evidence:
  - Reservation model + `reservation_key` + `payment_attempt` association exist; `reserveItem` subtracts stock atomically in Postgres path.
  - `confirmReservationAndCreateSale` snapshots item title and amount into the sale record for reconciliation.
- Implemented today:
  - Atomic stock decrement and reservations are implemented in `reserveItem` (Postgres path).
  - Cart hash / double-spend prevention: there is a reservation mechanism; `payment_payload` stores reservation ids in attempts, enabling correlation.
- Missing:
  - A formal "cart hash" abstraction and front-end process to compute/validate it end-to-end (but it's achievable with current primitives).
- Recommendation:
  - Add a small "cart hash" computation in `create_payment_session` and the buyer SDK to demonstrate cryptographic linkage between cart state and payment attempt.

## Concrete evidence (file references)
- Reservations / confirm sale: dbClient.ts — `reserveItem`, `confirmReservation`, `confirmReservationAndCreateSale`, `releaseReservation`.
- Settlement enqueue + dedupe: dbClient.ts — `insertSettlement` (ON CONFLICT on `payment_attempt_id`).
- Webhook behavior & docs: webhook.ts (handler) and webhook_settlement_confirmation.md.
- Worker: settlementWorker.js (processes `settlements` entries and should call `confirmReservationAndCreateSale`).
- Buyer SDK & pay flow: payAndFetch.ts (signing helper).
- Product & migrations: `db/migrations/*` referenced in product_journal.md.

## Gaps that must be closed to reproduce the demo end-to-end (concrete tasks)
(ordered by priority for a demo + MVP merchant experience)

1) Payment links & link resolver (short token)
- Add `payment_links` table and APIs/UI to create/edit/expire payment links (maps to product/item or endpoint).
- Add public link resolution page `app/link/[token]` that shows product, QR, and Pay button.
- Est: 1–2 days (backend + simple frontend).

2) QR generator + POS page
- Endpoint that generates QR payload for a `payment_link` (or returns link data for client QR generation).
- Minimal POS client page that loads the link and starts the payment flow.
- Est: 0.5–1 day for basic version.

3) Dev-settle simulator (fast demo)
- Dev-only API route gated by `DEV_SETTLE_ENABLED=true` that can:
  - Accept `payment_attempt_id` and call `confirmReservationAndCreateSale` for attached reservation(s) OR
  - Insert a settlement row for the worker to pick up (choose both modes).
- Minimal dashboard button `DevSettleButton` visible in dev mode to trigger a settled callback for a chosen attempt.
- Est: 2–3 hours + tests.

4) Merchant onboarding & receiving address
- UI to let a seller connect a wallet or input a receiving address, and link it to `seller_endpoints`.
- Est: 1 day.

5) RBAC / Privy integration (seller authentication)
- Server-side seller auth for admin routes (create endpoints, items, activation codes). The repo lists Privy as intended; implement server-side verification endpoints and protect admin APIs.
- Est: 1 day (depends on Privy API integration details).

6) Reservation reaper worker
- Background job to cleanup expired reservations and restore stock.
- Est: 2–4 hours.

7) QA & production hardening
- Worker claim semantics: make worker claim settlements with `UPDATE ... WHERE status='queued' RETURNING id` or `SELECT FOR UPDATE SKIP LOCKED`.
- Add monitoring/logging/alerts and reconciliation tooling.
- Address CI pnpm "ignored build scripts" issue per product_journal.md.
- Est: 1–2 days.

8) E2E integration tests
- Add a gated integration test for webhook -> worker -> confirmReservationAndCreateSale flow (gated by RUN_WORKER_INTEGRATION).
- Est: 0.5–1 day.

## Short technical contract for implementing "Stripe-like payment links + POS"
- Inputs
  - A `payment_link` token or `item_id`
  - Buyer wallet (for client-side signing) or facilitator webhook callback
- Outputs
  - `payment_attempt` entry + optionally `item_reservations`
  - `settlement` row + worker processing
  - `sales` row created atomically from reservation (via `confirmReservationAndCreateSale`)
- Failure modes
  - Duplicate webhooks (handled by `insertSettlement` ON CONFLICT + worker claim semantics)
  - Reservation expiration (handled by reaper, and releaseReservation)
  - Missing `payment_attempt` correlation — worker should process without an attempt but log and surface for reconciliation
- Success criteria
  - The repo can demonstrate: create link -> buyer signs & pays (or simulate) -> worker marks sale -> dashboard shows sale and CSV exports include `item_title`.

## Edge cases & considerations
- Missing or delayed facilitator callbacks:
  - Provide reconciliation tools to match blockchain transactions to `payment_attempt` by purchaser address & amount.
- Fraud / chargebacks:
  - Crypto reduces traditional chargebacks, but you still need dispute processes (reclaiming activation codes, shipping reversals).
- Gas / chain fee UX:
  - For instant settlement UX, choose a low-latency settling chain (L2) or a facilitator that abstracts bundling/relayer fees; document the implications for merchant settlement times.
- Supabase vs Postgres:
  - Supabase path is best-effort and lacks strong transaction semantics for reservations — Postgres recommended in production (already noted in `product_journal`).

## Prioritized next steps (concrete, actionable)
1. Implement dev-settle simulator (dev mode) — immediate demo value and useful to validate UI and confirm+sale path. (2–3 hours)
2. Implement `payment_links` + link resolver page + QR generator (short link & POS page). (1–2 days)
3. Small POS demo page that uses buyer SDK to sign and send an `X-PAYMENT` to the server or to broadcast a transaction. (1 day)
4. Implement server-side RBAC/Privy gating for admin routes. (1 day)
5. Add reservation reaper worker. (2–4 hours)
6. Add integration test for webhook -> worker -> sale (gated). (0.5–1 day)
7. Triage CI `pnpm` build-script warnings. (0.5–1 day)

If you want me to take a single next change now, I recommend #1 (dev-settle simulator) because it gives you an immediate way to demo the "instant settlement" claim without depending on an external facilitator. I can implement it gated by `DEV_SETTLE_ENABLED=true` and wire a tiny dev-only dashboard control.

## Tests & verification I’d add
- Unit test for the new dev route (happy-path success/failure).
- Mocked unit test proving the flow calls `confirmReservationAndCreateSale`.
- Add or enable an integration test (gated) to show worker processing a settlement creates a sale.

## Risks / production blockers to resolve before shipping
- RBAC/Privy for seller endpoints
- Reservation reaper (prevents stuck-reservations & inventory lock)
- CI package build-script issue (may break installs in CI)
- Supabase path is not strongly transactional; prefer Postgres for production

## Do you want me to implement something next?
Options:
- “Go: dev-settle” (I’ll add a dev-only settle endpoint + small dev dashboard button, tests, and run unit tests)
- “Go: short-link” (I’ll implement `payment_links` table + link resolver page + QR generator)
- “Docs only” (I’ll write the team-facing document synthesizing the above into docs or a single export `docs/x402_mapping.md`)

If you pick dev-settle, confirm whether the default behavior should:
A) Immediately call `confirmReservationAndCreateSale` for all reservations associated with the provided `payment_attempt_id` (fast demo), or
B) Insert a `settlements` row and let the worker process it (exercises worker path).

I'll implement and run unit tests and report back with PASS/FAIL, file changes, and how to try it locally.