# MVP Quick Start & Testing Guide

## 🚀 Start Services

```bash
# Start all services (web, worker, webhook-dispatcher, postgres)
docker-compose up -d

# Check services are running
docker-compose ps

# View logs
docker-compose logs -f web
docker-compose logs -f webhook-dispatcher
docker-compose logs -f worker
```

## ✅ Verify Setup

### 1. Check Web Service
```bash
curl http://localhost:3000/health
# Should return 200 OK
```

### 2. Check Webhook Infrastructure
```bash
# Check webhook dispatcher is running
docker-compose logs webhook-dispatcher | head -20

# Should see:
# "Webhook Dispatcher starting..."
# "Poll interval: 30000ms"
```

### 3. Verify Database
```bash
# Connect to database
psql -U postgres -h localhost -d x402

# Check webhook tables exist
\dt webhook*

# Should show:
# webhook_subscriptions
# webhook_events
# webhook_deliveries
# webhook_event_types
```

## 🧪 Test Webhook Flow

### Option 1: Test via API

```bash
# 1. Get a Privy token (via browser login or Privy API)
PRIVY_TOKEN="your_token_here"

# 2. Register a webhook
curl -X POST http://localhost:3000/api/webhooks/register \
  -H "Authorization: Bearer $PRIVY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/your-unique-url",
    "events": ["payment.completed", "settlement.confirmed", "payout.created"],
    "active": true
  }'

# Response should include webhook_subscription_id and secret

# 3. List your webhooks
curl http://localhost:3000/api/webhooks/list \
  -H "Authorization: Bearer $PRIVY_TOKEN"

# 4. Create a test payment (via seller dashboard or API)
# This will trigger: payment.completed → settlement.confirmed events
```

### Option 2: Test via Browser

1. Open http://localhost:3000 in browser
2. Login with Privy wallet
3. Navigate to Webhooks section (if available in UI)
4. Register webhook pointing to https://webhook.site
5. Create a test payment link
6. Check webhook.site dashboard for incoming events

## 📊 Monitor Webhook Delivery

### Check webhook dispatcher logs
```bash
docker-compose logs webhook-dispatcher

# Look for:
# "Webhook cycle X: processed=Y, succeeded=Z, failed=W"
```

### Query delivery status
```bash
psql -U postgres -h localhost -d x402 << EOF

-- Show all webhook deliveries
SELECT 
  id,
  webhook_subscription_id,
  status,
  response_status_code,
  error_message,
  attempt_count,
  delivered_at
FROM webhook_deliveries
ORDER BY created_at DESC
LIMIT 10;

-- Show failed deliveries
SELECT * FROM webhook_deliveries
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Show pending retries
SELECT * FROM webhook_deliveries
WHERE status = 'retry' AND next_retry_at <= NOW()
ORDER BY next_retry_at DESC;

EOF
```

## 🔍 Verify Webhook Signatures

```bash
# Get a webhook event
WEBHOOK_ID="ws_your_webhook_id"

psql -U postgres -h localhost -d x402 << EOF

SELECT 
  ws.secret,
  wd.id,
  wd.payload_sent,
  wd.response_status_code
FROM webhook_subscriptions ws
JOIN webhook_deliveries wd ON ws.id = wd.webhook_subscription_id
WHERE ws.id = '$WEBHOOK_ID'
LIMIT 1;

EOF

# Manually verify signature
node << 'JS'
const crypto = require('crypto');

// From database
const payload = '{"event_type":"payment.completed",...}';
const secret = 'whsec_...';
const headerSignature = '...';

const expectedSig = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

console.log('Expected:', expectedSig);
console.log('Received:', headerSignature);
console.log('Match:', expectedSig === headerSignature);
JS
```

## 🐛 Troubleshooting

### Webhooks not delivering

1. Check webhook dispatcher is running:
   ```bash
   docker-compose ps webhook-dispatcher
   ```

2. Check logs for errors:
   ```bash
   docker-compose logs webhook-dispatcher | grep ERROR
   ```

3. Verify endpoint is reachable:
   ```bash
   curl -v https://your-webhook-endpoint.com
   ```

4. Check database for queued events:
   ```bash
   psql -U postgres -h localhost -d x402 << EOF
   SELECT * FROM webhook_deliveries WHERE status = 'pending';
   EOF
   ```

### Signature verification failing

1. Verify you're using raw body (not parsed JSON)
2. Verify secret matches exactly
3. Check encoding (hex, not base64)

### Payment not triggering events

1. Check settlement worker is running:
   ```bash
   docker-compose logs worker
   ```

2. Verify settlement table has rows:
   ```bash
   psql -U postgres -h localhost -d x402 << EOF
   SELECT * FROM settlements ORDER BY created_at DESC LIMIT 5;
   EOF
   ```

3. Check payment_logs for settlement success:
   ```bash
   psql -U postgres -h localhost -d x402 << EOF
   SELECT message, success, response FROM payment_logs 
   WHERE message LIKE '%settlement%' 
   ORDER BY created_at DESC LIMIT 5;
   EOF
   ```

## 📈 Performance Tuning

To adjust webhook processing:

Edit `.env.server`:
```bash
# Process 20 webhooks per batch (default 10)
WEBHOOK_BATCH_SIZE=20

# Check for pending webhooks every 15 seconds (default 30)
WEBHOOK_POLL_INTERVAL_MS=15000

# Retry worker cycles every 3 seconds (default 5)
POLL_INTERVAL_MS=3000
```

Then restart webhook-dispatcher:
```bash
docker-compose restart webhook-dispatcher
```

## ✨ Success Criteria

You'll know webhooks are working when:

- ✅ webhook-dispatcher starts without errors
- ✅ Webhook registration returns webhook_subscription_id + secret
- ✅ List webhooks shows your registered webhook
- ✅ Payment triggers settlement worker
- ✅ Settlement worker logs show success
- ✅ webhook_deliveries table has entries
- ✅ Delivery status is "success" (not "failed" or "retry")
- ✅ Your webhook endpoint receives POST with valid signature
- ✅ `X-Webhook-Signature` header verifies correctly

## 📚 Additional Resources

- Webhook Events: `docs/WEBHOOKS.md`
- API Reference: `docs/api-reference.md`
- Database Schema: `db/schema.sql`
- Implementation Guide: `docs/handoff_for_dev.md`
