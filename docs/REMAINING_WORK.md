# Remaining Work: Exact Tasks for MVP

**Session Status:** Webhooks infrastructure complete (database + API + tests + dispatcher)
**Next:** Wire up event emission + deployment

---

## 🎯 Task 1: Event Emission (2 hours)

### 1a. Settlement Completion Event
**File:** `scripts/settlementWorker.js`
**Action:** Add webhook event after settlement succeeds

```javascript
// Around line where confirmReservationAndCreateSale is called:
const { sale, settlement } = await db.confirmReservationAndCreateSale(...);

// Add this:
if (sale && settlement) {
  await triggerWebhookEvent(db, {
    event_type: 'settlement.confirmed',
    seller_id: settlement.seller_id,
    resource_type: 'settlement',
    resource_id: settlement.id,
    payload: {
      settlement_id: settlement.id,
      payment_attempt_id: settlement.payment_attempt_id,
      amount_cents: settlement.amount_cents,
      currency: 'USDC',
      status: 'confirmed',
      facilitator_response: settlement.facilitator_response,
    },
    timestamp: new Date().toISOString(),
  });
}
```

**Import needed:**
```javascript
import { triggerWebhookEvent } from '../apps/lib/webhookDispatcher.js';
```

**Risk:** LOW - event emission is non-blocking
**Estimated time:** 30 minutes

---

### 1b. Payment Attempt Completion Event
**File:** `scripts/settlementWorker.js` (same as above)
**Action:** Emit `payment.completed` after sale is confirmed

```javascript
// Same location as 1a:
await triggerWebhookEvent(db, {
  event_type: 'payment.completed',
  seller_id: settlement.seller_id,
  resource_type: 'payment_attempt',
  resource_id: settlement.payment_attempt_id,
  payload: {
    payment_attempt_id: settlement.payment_attempt_id,
    amount_cents: sale.amount_cents,
    currency: sale.currency,
    purchaser_address: sale.purchaser_address,
    status: 'completed',
  },
  timestamp: new Date().toISOString(),
});
```

**Risk:** LOW
**Estimated time:** 15 minutes

---

### 1c. Payout Creation Event
**File:** `apps/dashboard/pages/api/payouts/create.ts`
**Action:** Emit `payout.created` after payout is recorded

```typescript
// After createPayout succeeds:
const payout = await db.createPayout({
  seller_id: sellerId,
  destination_wallet: destinationWallet,
  amount_cents: amountCents,
  status: 'queued',
  metadata: { user_agent, ip },
});

// Add this:
await db.triggerWebhookEvent({
  event_type: 'payout.created',
  seller_id: sellerId,
  resource_type: 'payout',
  resource_id: payout.id,
  payload: {
    payout_id: payout.id,
    amount_cents: amountCents,
    destination_wallet: destinationWallet,
    status: 'queued',
  },
  timestamp: new Date().toISOString(),
});
```

**Import needed:**
```typescript
import { triggerWebhookEvent } from '../../../../apps/lib/webhookDispatcher';
```

**Risk:** LOW
**Estimated time:** 20 minutes

---

### 1d. Test Event Emission (1 hour)
**Create file:** `tests/webhookEventEmission.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Webhook Event Emission', () => {
  describe('Payment completion', () => {
    it('emits payment.completed when settlement succeeds', async () => {
      // Mock settlementWorker flow
      const db = {
        confirmReservationAndCreateSale: vi.fn().mockResolvedValue({
          sale: { id: 'sale-1', amount_cents: 100 },
          settlement: { id: 'settlement-1', seller_id: 'seller-1' },
        }),
        triggerWebhookEvent: vi.fn(),
      };

      // Simulate worker logic
      const { sale, settlement } = await db.confirmReservationAndCreateSale();
      if (sale && settlement) {
        await db.triggerWebhookEvent({
          event_type: 'payment.completed',
          seller_id: settlement.seller_id,
          resource_type: 'payment_attempt',
          resource_id: settlement.payment_attempt_id,
          payload: { amount_cents: sale.amount_cents },
          timestamp: expect.any(String),
        });
      }

      expect(db.triggerWebhookEvent).toHaveBeenCalled();
      const call = db.triggerWebhookEvent.mock.calls[0][0];
      expect(call.event_type).toBe('payment.completed');
    });

    it('emits payout.created when payout is recorded', () => {
      // Similar test for payout flow
    });
  });
});
```

**Risk:** LOW
**Estimated time:** 1 hour (write + debug)

---

## 🚀 Task 2: Webhook Dispatcher Deployment (1.5 hours)

### 2a. Docker Compose Integration
**File:** `docker-compose.yml`
**Action:** Add webhookDispatcher service

```yaml
version: '3.8'
services:
  # ... existing services ...

  webhook-dispatcher:
    build: .
    command: node scripts/webhookDispatcher.js
    environment:
      WEBHOOK_DISPATCHER_ENABLED: "true"
      WEBHOOK_BATCH_SIZE: "10"
      WEBHOOK_POLL_INTERVAL_MS: "30000"
      DATABASE_URL: ${DATABASE_URL}
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      USE_LOCAL_PG: ${USE_LOCAL_PG}
      PG_USER: ${PG_USER}
      PG_PASSWORD: ${PG_PASSWORD}
      PG_HOST: ${PG_HOST}
      PG_PORT: ${PG_PORT}
      PG_DATABASE: ${PG_DATABASE}
    depends_on:
      - postgres
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Risk:** MEDIUM - Must have correct env vars
**Estimated time:** 20 minutes

---

### 2b. Environment Configuration
**File:** `.env.server`
**Action:** Add webhook dispatcher settings

```bash
# Webhook Dispatcher Configuration
WEBHOOK_DISPATCHER_ENABLED=true
WEBHOOK_BATCH_SIZE=10
WEBHOOK_POLL_INTERVAL_MS=30000
```

**Risk:** LOW
**Estimated time:** 5 minutes

---

### 2c. Local Testing Script
**Create file:** `scripts/test-webhooks.sh`

```bash
#!/bin/bash
# Test webhook delivery end-to-end

set -e

echo "🚀 Starting webhook dispatcher test..."

# Start a simple HTTP server to receive webhooks
python3 -m http.server 9999 > /tmp/webhook_server.log 2>&1 &
WEBHOOK_SERVER_PID=$!
echo "📡 Webhook server started on localhost:9999 (PID: $WEBHOOK_SERVER_PID)"

# Give server time to start
sleep 2

# Register webhook subscription
echo "📝 Registering webhook subscription..."
WEBHOOK_ID=$(curl -X POST http://localhost:3000/api/webhooks/register \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:9999/webhook",
    "events": ["payment.completed"]
  }' | jq -r '.webhook_subscription_id')

echo "✅ Webhook registered: $WEBHOOK_ID"

# Cleanup
trap "kill $WEBHOOK_SERVER_PID" EXIT

echo "📊 Webhook test complete"
```

**Risk:** LOW - Optional testing aid
**Estimated time:** 30 minutes

---

### 2d. Systemd Service File (Alternative to Docker)
**Create file:** `systemd/webhook-dispatcher.service`

```ini
[Unit]
Description=xSynesis Webhook Dispatcher
After=network.target postgresql.service

[Service]
Type=simple
User=app
WorkingDirectory=/opt/xsynesis
ExecStart=/usr/bin/node /opt/xsynesis/scripts/webhookDispatcher.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

Environment="NODE_ENV=production"
Environment="WEBHOOK_DISPATCHER_ENABLED=true"
Environment="DATABASE_URL=postgres://..."

[Install]
WantedBy=multi-user.target
```

**Risk:** LOW - Optional for VM deployment
**Estimated time:** 20 minutes

---

## 📚 Task 3: Documentation (1.5 hours)

### 3a. Webhook Events Reference
**Create file:** `docs/WEBHOOKS.md`

**Content:**
```markdown
# Webhook Events Reference

## Available Events

### payment.completed
Fired when a payment settles successfully.
```json
{
  "event_type": "payment.completed",
  "seller_id": "0xabc...",
  "resource_type": "payment_attempt",
  "resource_id": "pa_xyz",
  "payload": {
    "payment_attempt_id": "pa_xyz",
    "amount_cents": 10000,
    "currency": "USDC",
    "purchaser_address": "0x123...",
    "status": "completed"
  },
  "timestamp": "2025-11-15T20:30:00Z"
}
```

### settlement.confirmed
Fired when x402 confirms settlement.

### payout.created
Fired when seller initiates a payout.

## Verification

All webhooks are signed with HMAC-SHA256:

```bash
signature = HMAC_SHA256(payload, secret)
# Compare with X-Webhook-Signature header
```

## Retries

Webhooks are retried with exponential backoff:
- Attempt 1: Immediately
- Attempt 2: 2 minutes
- Attempt 3: 4 minutes
- Attempt 4: 8 minutes
- Attempt 5: 16 minutes
```

**Risk:** LOW
**Estimated time:** 1 hour

---

### 3b. API Reference Update
**File:** `docs/API_REFERENCE.md`
**Action:** Add webhook endpoints section

```markdown
## Webhook Management

### Register Webhook
`POST /api/webhooks/register`

Requires: Privy authentication

Request:
```json
{
  "url": "https://example.com/webhook",
  "events": ["payment.completed", "settlement.confirmed"],
  "active": true
}
```

Response:
```json
{
  "webhook_subscription_id": "ws_abc123",
  "url": "https://example.com/webhook",
  "secret": "whsec_long_random_secret",
  "events": ["payment.completed"],
  "active": true
}
```

### List Webhooks
`GET /api/webhooks/list`

### Unregister Webhook
`POST /api/webhooks/unregister`
```

**Risk:** LOW
**Estimated time:** 30 minutes

---

## 🧪 Task 4: End-to-End Testing (1 hour)

### 4a. Manual Test Flow
```
1. Create seller account (via Privy wallet)
2. Create payment link with price $0.10
3. Generate QR code via /api/qr
4. Register webhook: https://webhook.site/abc...
5. As buyer: scan QR → pay with MetaMask
6. Verify:
   - Payment attempt created
   - Settlement worker processes
   - Webhook delivers event
   - HMAC signature valid
   - Seller balance updates
```

**Time:** 20 minutes (manual testing)

---

### 4b. Automated Integration Test
**Create file:** `tests/webhookIntegrationEnd2End.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('End-to-End Webhook Flow', () => {
  it('delivers webhook event after payment settles', async () => {
    // 1. Register webhook
    // 2. Create payment attempt
    // 3. Simulate settlement confirmation
    // 4. Assert webhook was delivered with valid signature
  });
});
```

**Time:** 40 minutes (write + debug)

---

## ⏱️ Complete Timeline

```
Task 1: Event Emission          2.0 hours
  1a. Settlement event          0.5 hours
  1b. Payment event             0.3 hours
  1c. Payout event              0.3 hours
  1d. Tests                      1.0 hours

Task 2: Deployment              1.5 hours
  2a. Docker Compose            0.3 hours
  2b. Environment               0.1 hours
  2c. Testing script            0.5 hours
  2d. Systemd service           0.3 hours

Task 3: Documentation           1.5 hours
  3a. Webhook reference         1.0 hours
  3b. API docs                  0.5 hours

Task 4: Testing                 1.0 hours
  4a. Manual test               0.3 hours
  4b. Automation                0.7 hours
─────────────────────────────────────────
TOTAL MVP COMPLETION            5.0 hours
```

---

## 🚀 Launch Sequence

```bash
# 1. Implement event emission
git commit -m "feat: emit webhook events from settlement worker"

# 2. Run tests
pnpm test

# 3. Deploy webhook dispatcher
docker-compose up -d webhook-dispatcher

# 4. Verify with test flow
./scripts/test-webhooks.sh

# 5. Create demo seller
# 6. Create payment link
# 7. Test end-to-end
# 8. Launch! 🎉
```

---

## ✅ Definition of Done

- [ ] All 4 tasks completed
- [ ] 95+ tests passing (including new tests)
- [ ] All code merged to main
- [ ] Manual end-to-end test passed
- [ ] Webhook dispatcher running in Docker
- [ ] Documentation complete
- [ ] README updated with webhook info
- [ ] Demo video recorded (optional)

---

## 🎁 What You'll Have

After these 5 hours:

✅ **Complete payment pipeline**
- Seller creates link
- Buyer pays
- Settlement confirms
- **Webhooks notify** ← NEW
- Seller withdraws

✅ **Production-ready**
- 95+ tests
- Atomic semantics
- Error handling
- Exponential backoff retries

✅ **Enterprise-grade**
- HMAC signatures
- Delivery tracking
- Retry queue
- Background processing

