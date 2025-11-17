# xSynesis API Reference

## Webhook Management Endpoints

### Register Webhook

Create a new webhook subscription to receive events for your seller account.

**Endpoint:** `POST /api/webhooks/register`

**Authentication:** Privy Session Token (Bearer)

**Request Body:**
```json
{
  "url": "https://example.com/webhooks",
  "events": ["payment.completed", "settlement.confirmed"],
  "active": true
}
```

**Parameters:**
- `url` (string, required): HTTPS endpoint where xSynesis will POST events
- `events` (array of strings, optional): Event types to subscribe to
- `active` (boolean, optional, default: true): Enable/disable webhook delivery

**Success Response (201 Created):**
```json
{
  "webhook_subscription_id": "ws_abc123xyz",
  "url": "https://example.com/webhooks",
  "secret": "whsec_long_random_secret_key",
  "events": ["payment.completed", "settlement.confirmed"],
  "active": true,
  "created_at": "2025-11-15T20:30:00Z"
}
```

### List Webhooks

Retrieve all webhook subscriptions for the authenticated seller.

**Endpoint:** `GET /api/webhooks/list`

**Authentication:** Privy Session Token (Bearer)

**Success Response (200 OK):**
```json
[
  {
    "webhook_subscription_id": "ws_abc123xyz",
    "url": "https://example.com/webhooks",
    "events": ["payment.completed"],
    "active": true,
    "created_at": "2025-11-15T20:30:00Z",
    "last_delivered_at": "2025-11-15T20:35:00Z"
  }
]
```

### Unregister Webhook

Delete a webhook subscription and stop receiving events.

**Endpoint:** `POST /api/webhooks/unregister`

**Authentication:** Privy Session Token (Bearer)

**Request Body:**
```json
{
  "webhook_subscription_id": "ws_abc123xyz"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Webhook unregistered successfully"
}
```

---

## Webhook Events

### `payment.completed`

Fired when a buyer's payment settles successfully.

**Payload:**
```json
{
  "payment_attempt_id": "pa_unique_id",
  "amount_cents": 10000,
  "currency": "USDC",
  "purchaser_address": "0xbuyer_wallet",
  "status": "completed",
  "tx_hash": "0xtransaction_hash"
}
```

### `settlement.confirmed`

Fired when xSynesis settles payment through x402 facilitator.

**Payload:**
```json
{
  "settlement_id": "settlement_unique_id",
  "payment_attempt_id": "pa_unique_id",
  "amount_cents": 10000,
  "currency": "USDC",
  "status": "confirmed",
  "tx_hash": "0xtransaction_hash",
  "facilitator_response": {}
}
```

### `payout.created`

Fired when seller initiates a payout request.

**Payload:**
```json
{
  "payout_id": "payout_unique_id",
  "amount_cents": 500000,
  "currency": "USDC",
  "destination": "0xwithdraw_wallet",
  "method": "wallet_transfer",
  "status": "requested"
}
```

---

## Webhook Delivery

### Headers

Each webhook includes:
- `X-Webhook-Signature`: HMAC-SHA256 signature
- `X-Webhook-Event`: Event type
- `X-Webhook-Timestamp`: ISO 8601 timestamp

### Signature Verification

Verify using the webhook secret:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### Retry Policy

Failed webhooks retry with exponential backoff (2m, 4m, 8m, 16m). Max 5 attempts.

---

## See Also

- **Full Webhook Guide:** `/docs/WEBHOOKS.md`
- **Security & Examples:** `/docs/WEBHOOKS.md#security`
