# Webhook Events Reference

Complete guide to xSynesis webhook subscriptions, event types, and integration patterns.

## Quick Start

### 1. Register a Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/register \
  -H "Authorization: Bearer YOUR_PRIVY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/webhooks",
    "events": ["payment.completed", "settlement.confirmed"],
    "active": true
  }'
```

Response:
```json
{
  "webhook_subscription_id": "ws_abc123xyz",
  "url": "https://your-domain.com/webhooks",
  "secret": "whsec_long_random_secret_key",
  "events": ["payment.completed", "settlement.confirmed"],
  "active": true,
  "created_at": "2025-11-15T20:30:00Z"
}
```

### 2. Verify Webhook Signature

When xSynesis sends a webhook to your endpoint, it includes an `X-Webhook-Signature` header with an HMAC-SHA256 signature.

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

// In your webhook endpoint:
app.post('/webhooks', (req, res) => {
  const signature = req.get('X-Webhook-Signature');
  const payload = req.rawBody; // Must be raw, not parsed JSON
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
  res.status(200).json({ ok: true });
});
```

### 3. Handle Events

```javascript
app.post('/webhooks', (req, res) => {
  const event = req.body;

  switch (event.event_type) {
    case 'payment.completed':
      handlePaymentCompleted(event.payload);
      break;
    case 'settlement.confirmed':
      handleSettlementConfirmed(event.payload);
      break;
    case 'payout.created':
      handlePayoutCreated(event.payload);
      break;
  }

  res.status(200).json({ ok: true });
});
```

---

## Available Events

### `payment.completed`

Fired when a buyer's payment settles successfully and the transaction is confirmed on-chain.

**When:** After x402 facilitator confirms payment settlement
**Seller:** Notified immediately of completed payment

**Payload:**
```json
{
  "event_type": "payment.completed",
  "seller_id": "0xseller_wallet_address",
  "resource_type": "payment_attempt",
  "resource_id": "pa_unique_attempt_id",
  "payload": {
    "payment_attempt_id": "pa_unique_attempt_id",
    "amount_cents": 10000,
    "currency": "USDC",
    "purchaser_address": "0xbuyer_wallet_address",
    "status": "completed",
    "tx_hash": "0x1234567890abcdef..."
  },
  "timestamp": "2025-11-15T20:30:45.123Z"
}
```

**Use Cases:**
- Update payment status in your system
- Trigger fulfillment (ship product, deliver digital good)
- Send confirmation email to purchaser
- Log transaction for accounting

---

### `settlement.confirmed`

Fired when xSynesis settles payment through x402 and receives on-chain confirmation.

**When:** After settlement worker processes and confirms transaction
**Seller:** Receives full settlement details including tx hash

**Payload:**
```json
{
  "event_type": "settlement.confirmed",
  "seller_id": "0xseller_wallet_address",
  "resource_type": "settlement",
  "resource_id": "settlement_unique_id",
  "payload": {
    "settlement_id": "settlement_unique_id",
    "payment_attempt_id": "pa_unique_attempt_id",
    "amount_cents": 10000,
    "currency": "USDC",
    "status": "confirmed",
    "tx_hash": "0x1234567890abcdef...",
    "facilitator_response": {
      "success": true,
      "payer": "0xbuyer_wallet_address",
      "txHash": "0x1234567890abcdef..."
    }
  },
  "timestamp": "2025-11-15T20:30:45.123Z"
}
```

**Use Cases:**
- Track settlement completion and confirm funds
- Verify on-chain transaction with tx_hash
- Update seller dashboard with settlement status
- Reconcile with accounting systems
- Trigger payout workflows

---

### `payout.created`

Fired when a seller initiates a payout request.

**When:** After seller submits payout via API
**Seller:** Receives confirmation of payout request

**Payload:**
```json
{
  "event_type": "payout.created",
  "seller_id": "0xseller_wallet_address",
  "resource_type": "payout",
  "resource_id": "payout_unique_id",
  "payload": {
    "payout_id": "payout_unique_id",
    "amount_cents": 500000,
    "currency": "USDC",
    "destination": "0xwithdraw_wallet_or_bank",
    "method": "wallet_transfer",
    "status": "requested"
  },
  "timestamp": "2025-11-15T20:31:00.000Z"
}
```

**Use Cases:**
- Log payout request for audit trail
- Notify seller of submission confirmation
- Track payout status in your system
- Calculate fees or commissions
- Update analytics

---

## Webhook Delivery & Retries

### Retry Logic

xSynesis uses exponential backoff to retry failed webhook deliveries:

| Attempt | Delay | Total Time |
|---------|-------|-----------|
| 1 | Immediate | 0 min |
| 2 | 2 minutes | 2 min |
| 3 | 4 minutes | 6 min |
| 4 | 8 minutes | 14 min |
| 5 | 16 minutes | 30 min |

After 5 failed attempts (30 minutes total), delivery is marked as failed and not retried.

### Delivery Guarantees

⚠️ **Important:** Webhooks are **at-least-once** delivery, not exactly-once.

- Same event may be delivered multiple times
- **Solution:** Implement idempotency using `resource_id`
- Store processed event IDs in your database
- Skip duplicate events with same ID

### Response Requirements

Your webhook endpoint **must:**

1. **Respond with 2xx status code** (200, 201, 202, etc.)
   - Any 4xx/5xx will trigger retry
   
2. **Respond within 30 seconds**
   - Timeout after 30s triggers retry
   
3. **Verify signature** before processing
   - Prevents unauthorized requests
   
4. **Idempotency:** Process safely if called twice with same event

```javascript
// Example: Idempotent webhook handler
async function handleWebhook(req, res) {
  const event = req.body;
  
  // 1. Verify signature
  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 2. Check idempotency
  const isProcessed = await db.webhookEvents.exists(event.resource_id);
  if (isProcessed) {
    // Already processed, return success
    return res.status(200).json({ ok: true });
  }
  
  // 3. Process the event
  try {
    await processEvent(event);
    
    // 4. Record as processed
    await db.webhookEvents.create({
      id: event.resource_id,
      event_type: event.event_type,
      processed_at: new Date(),
    });
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Don't return success - let it retry
    res.status(500).json({ error: 'Processing failed' });
  }
}
```

---

## Security

### Signature Verification

All webhooks are signed using HMAC-SHA256:

```
Signature = HEX(HMAC-SHA256(payload, secret))
```

**Headers:**
- `X-Webhook-Signature`: The HMAC-SHA256 signature (hex-encoded)
- `X-Webhook-Event`: Event type (e.g., "payment.completed")
- `X-Webhook-Timestamp`: Event timestamp (ISO 8601)

### Best Practices

1. **Always verify signature** - Don't trust unsigned requests
2. **Use HTTPS only** - No HTTP webhooks accepted
3. **Rotate secrets** - Regenerate via API if compromised
4. **Rate limiting** - Implement client-side rate limiting (webhooks respect it)
5. **Logging** - Log all webhook deliveries for audit trail
6. **Monitoring** - Alert on repeated failures (5+ retries)

---

## API Reference

### Register Webhook

```http
POST /api/webhooks/register
Authorization: Bearer <PRIVY_TOKEN>
Content-Type: application/json

{
  "url": "https://your-domain.com/webhooks",
  "events": ["payment.completed", "settlement.confirmed"],
  "active": true
}
```

**Response (201):**
```json
{
  "webhook_subscription_id": "ws_abc123",
  "url": "https://your-domain.com/webhooks",
  "secret": "whsec_...",
  "events": ["payment.completed", "settlement.confirmed"],
  "active": true,
  "created_at": "2025-11-15T20:30:00Z"
}
```

### List Webhooks

```http
GET /api/webhooks/list
Authorization: Bearer <PRIVY_TOKEN>
```

**Response (200):**
```json
[
  {
    "webhook_subscription_id": "ws_abc123",
    "url": "https://your-domain.com/webhooks",
    "events": ["payment.completed"],
    "active": true,
    "created_at": "2025-11-15T20:30:00Z",
    "last_delivered_at": "2025-11-15T20:35:00Z"
  }
]
```

### Unregister Webhook

```http
POST /api/webhooks/unregister
Authorization: Bearer <PRIVY_TOKEN>
Content-Type: application/json

{
  "webhook_subscription_id": "ws_abc123"
}
```

**Response (200):**
```json
{
  "message": "Webhook unregistered successfully"
}
```

---

## Examples

### Python

```python
import hmac
import hashlib
import json
from flask import Flask, request

app = Flask(__name__)

def verify_signature(payload_body, signature, secret):
    expected_sig = hmac.new(
        secret.encode(),
        payload_body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_sig)

@app.route('/webhooks', methods=['POST'])
def handle_webhook():
    payload_body = request.get_data()
    signature = request.headers.get('X-Webhook-Signature')
    secret = 'whsec_...'
    
    if not verify_signature(payload_body, signature, secret):
        return {'error': 'Invalid signature'}, 401
    
    event = json.loads(payload_body)
    
    if event['event_type'] == 'payment.completed':
        handle_payment(event['payload'])
    elif event['event_type'] == 'settlement.confirmed':
        handle_settlement(event['payload'])
    
    return {'ok': True}, 200
```

### Node.js with Express

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.raw({ type: 'application/json' }));

function verifySignature(payload, signature, secret) {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

app.post('/webhooks', (req, res) => {
  const signature = req.get('X-Webhook-Signature');
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!verifySignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = JSON.parse(req.body);
  
  console.log(`Received ${event.event_type} for seller ${event.seller_id}`);
  
  res.status(200).json({ ok: true });
});

app.listen(3001);
```

### Go

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
)

func verifySignature(payload []byte, signature string, secret string) bool {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	expectedSig := hex.EncodeToString(h.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedSig))
}

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	payload, _ := io.ReadAll(r.Body)
	signature := r.Header.Get("X-Webhook-Signature")
	secret := os.Getenv("WEBHOOK_SECRET")
	
	if !verifySignature(payload, signature, secret) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	
	var event map[string]interface{}
	json.Unmarshal(payload, &event)
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func main() {
	http.HandleFunc("/webhooks", handleWebhook)
	http.ListenAndServe(":3001", nil)
}
```

---

## Troubleshooting

### Webhooks Not Delivering

**Check:**
1. Is `WEBHOOK_DISPATCHER_ENABLED=true` in `.env.server`?
2. Is webhook-dispatcher service running? (`docker-compose ps`)
3. Is your endpoint HTTPS and reachable?
4. Check Docker logs: `docker-compose logs webhook-dispatcher`

**Debug:**
```bash
# Check webhook subscriptions
curl http://localhost:3000/api/webhooks/list -H "Authorization: Bearer TOKEN"

# Check webhook deliveries in database
SELECT * FROM webhook_deliveries 
WHERE webhook_subscription_id = 'ws_...' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Signature Verification Failing

**Common Issues:**
1. Using parsed JSON instead of raw body - **Always use raw bytes**
2. Secret mismatch - Copy entire secret from webhook registration
3. Encoding issues - Ensure hex encoding is correct
4. Timing attack - Use `timingSafeEqual` or `constant_time_compare`

### High Retry Rate

**Check:**
1. Is your endpoint responding with 2xx?
2. Is it responding within 30 seconds?
3. Are you returning errors for processing failures?

**Solution:** Return 200 immediately, process async:

```javascript
app.post('/webhooks', async (req, res) => {
  // Verify & respond immediately
  if (!verifySignature(req)) {
    return res.status(401).end();
  }
  
  res.status(200).json({ received: true });
  
  // Process async (don't wait)
  processEventAsync(req.body).catch(err => {
    console.error('Async processing failed:', err);
  });
});
```

---

## Support

For issues or questions:
- Documentation: `/docs/WEBHOOKS.md`
- API Reference: `/docs/api-reference.md`
- GitHub Issues: Report bugs and feature requests
