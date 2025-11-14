---
title: Webhook settlement confirmation
date: 2025-11-06
---

# Webhook settlement confirmation

This article documents the webhook settlement confirmation flow implemented in the x402-wrapper codebase. It explains the contract, the DB operations, idempotency considerations, tests, and how to run/verify locally.

Summary
- Source: facilitator -> POST webhook (verify / settle shapes).
- Goal: reliably persist a queued settlement, correlate it to a `payment_attempt` when available, and confirm or release any `item_reservations` attached to that attempt.

Why this matters
- Ensures reserved inventory is atomically marked sold on successful settlement.
- Preserves an audit trail (payment logs + settlement queue) for retries and reconciliation.

Contract (inputs / outputs)
- Inputs: facilitator webhook HTTP POST (JSON). Two primary shapes:
  - verify payload (verification-only)
  - settle payload (settlement event, may contain success flag and `paymentRequirements.attempt_id`)
- Outputs:
  - Create an entry in `settlements` table: `{ payment_attempt_id, facilitator_request, facilitator_response, status }` (status initially `queued`).
  - Update `payment_attempt.status` (e.g., `verified` / `failed`) and attach `verifier_response`.
  - For any reservations referenced by the `payment_attempt` (stored in `payment_payload.reservations` or `reservation_ids`): call `confirmReservation(reservationId)` on success, or `releaseReservation(reservationId)` on failure.

Implementation notes (where to look)
- Webhook handler: `apps/dashboard/pages/api/facilitator/webhook.ts`
  - Verifies HMAC signature using `FACILITATOR_WEBHOOK_SECRET`.
  - Parses payload with `FacilitatorVerifyRequest` and `FacilitatorSettleRequest` validators in `lib/validators`.
  - Calls into DB helpers in `apps/lib/dbClient.ts` (exported helpers are imported from `lib/dbClient`):
    - `insertSettlement` — enqueue the settlement for worker processing.
    - `updatePaymentAttemptStatus` — update verifier response/status on the correlated attempt (if present).
    - `getPaymentAttemptById` — retrieve attempt to get reservation ids.
    - `confirmReservation` / `releaseReservation` — finalize the reservation lifecycle.
  - Writes a `payment_log` (`insertPaymentLog`) for observability.

Idempotency & safety
- Webhook calls are often retried by providers. The implementation uses these safeguards:
  - `insertSettlement` persists the raw facilitator request; the worker that processes queued settlements should use an idempotency key or the settlement `id` (DB primary key) to ensure a settlement is only processed once.
  - `confirmReservation`/`releaseReservation` implementations in `dbClient` should be idempotent:
    - `confirmReservation` should either update `status='confirmed'` only when current status is `'reserved'` and return success even if already `'confirmed'`.
    - `releaseReservation` should only restore stock when reservation is still `'reserved'`; repeated `releaseReservation` calls should be noop.
  - `updatePaymentAttemptStatus` should be tolerant of repeated status writes.
  - The webhook handler currently enqueues a settlement row (status=`queued`) — the worker marks it `processing` → `confirmed`/`failed`; the worker should avoid double-processing by claiming a settlement row in a single `UPDATE ... WHERE status='queued'` step (or using `SELECT FOR UPDATE SKIP LOCKED` where supported).

Error handling & observability
- All webhook paths record info/warn logs via `insertPaymentLog`. Any DB errors are caught and logged but don't block returning 200 to the sender (policy chosen to avoid provider retries causing repeated alarms). If stricter semantics are desired, change to return non-200 on unrecoverable errors.

Tests
- Unit tests to add / verify:
  - `facilitator webhook` unit tests that simulate verify and settle payloads and assert `insertSettlement` and `updatePaymentAttemptStatus` are called; mock `getPaymentAttemptById` to emulate reservation ids.
  - `confirmReservation` and `releaseReservation` unit tests that assert idempotent behavior (calling twice doesn't change state incorrectly).
  - Worker integration test (already present but gated behind `RUN_WORKER_INTEGRATION=true`): start Postgres, insert a settlement and queued attempt, run the worker once and assert `sales` row created and reservations moved to `confirmed`.

How to run locally
1. Ensure `FACILITATOR_WEBHOOK_SECRET` is set in your `.env` (or `process.env`) and matches the verifier used in tests.
2. Run unit tests:

```bash
pnpm test
```

3. To run the worker integration test (requires Postgres + env):

```bash
# start local postgres (see docs/product_journal.md for exact docker command)
export RUN_WORKER_INTEGRATION=true
pnpm test -- -t 'worker processes a queued settlement (RUN_ONCE)'
```

Next steps
- Add the unit tests listed above (particularly idempotency tests for reservation helpers).
- Harden the worker's claim/processing flow with explicit DB-level claim semantics (UPDATE ... WHERE status='queued' RETURNING id) to avoid race conditions.
- Add monitoring/alerts on unusually high rates of `facilitator_settle_callback` logs or failures.

Related files
- `apps/dashboard/pages/api/facilitator/webhook.ts`
- `apps/lib/dbClient.ts` (confirmReservation / releaseReservation / insertSettlement / insertPaymentLog / getPaymentAttemptById)
- `scripts/settlementWorker.js`

Acknowledgements
This article complements `docs/product_journal.md` and documents the shape and rationale for the webhook -> settlement -> reservation confirmation flow.
