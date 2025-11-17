# MVP Deployment Checklist

## ✅ Pre-Deployment Verification

### Code Quality
- [x] 92 tests passing
- [x] 0 compiler errors
- [x] Build successful (`pnpm build`)
- [x] No security issues

### Features Complete
- [x] Webhook infrastructure (database + API + dispatcher)
- [x] Event emission (settlement, payment, payout)
- [x] HMAC-SHA256 signature verification
- [x] Exponential backoff retry logic
- [x] Idempotent event delivery

### Documentation
- [x] Webhook Events Guide (`docs/WEBHOOKS.md`)
- [x] API Reference (`docs/api-reference.md`)
- [x] Testing Guide (`docs/TESTING_GUIDE.md`)
- [x] Code examples (Python, Node.js, Go)

---

## 🚀 Deployment Steps

### 1. Environment Setup

```bash
# Verify environment variables are set
cat .env.server | grep -E "WEBHOOK|PRIVY|FACILITATOR|DATABASE"

# Required variables:
# ✓ WEBHOOK_DISPATCHER_ENABLED=true
# ✓ WEBHOOK_BATCH_SIZE=10
# ✓ WEBHOOK_POLL_INTERVAL_MS=30000
# ✓ DATABASE_URL=postgres://...
# ✓ NEXT_PUBLIC_PRIVY_APP_ID=...
# ✓ PRIVY_APP_SECRET=...
```

### 2. Database Migrations

```bash
# Run migrations (if using local Postgres)
pnpm run db:migrate

# Verify webhook tables exist
psql -U postgres -h localhost -d x402 << EOF
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name LIKE 'webhook%';
EOF

# Should output:
# webhook_subscriptions
# webhook_events
# webhook_deliveries
# webhook_event_types
```

### 3. Start Services

```bash
# Build Docker images
docker-compose build

# Start all services (detached)
docker-compose up -d

# Verify all services are running
docker-compose ps

# Should show:
# web         Up (port 3000)
# worker      Up
# webhook-dispatcher  Up
# postgres    Up (port 5432)
```

### 4. Health Checks

```bash
# Check web service
curl http://localhost:3000/health
# Should return: 200 OK

# Check webhook dispatcher logs
docker-compose logs webhook-dispatcher | head -20
# Should show: "Webhook Dispatcher starting..."

# Check worker logs
docker-compose logs worker | head -10
# Should show: no errors

# Check postgres connection
psql -U postgres -h localhost -d x402 -c "SELECT NOW();"
# Should return current timestamp
```

### 5. Smoke Test

```bash
# 1. Verify webhook API endpoints
curl -i http://localhost:3000/api/webhooks/register \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","events":["payment.completed"]}'
# Should return: 401 Unauthorized (auth not valid, but endpoint works)

# 2. Check database connectivity
psql -U postgres -h localhost -d x402 << EOF
SELECT COUNT(*) FROM webhook_subscriptions;
EOF
# Should return: 0 (empty, but table accessible)

# 3. Verify dispatcher is polling
docker-compose logs webhook-dispatcher | grep "Webhook cycle"
# Should eventually show: "Webhook cycle 1: processed=0, succeeded=0, failed=0"
```

### 6. Manual End-to-End Test

```bash
# Follow steps in docs/TESTING_GUIDE.md
# 1. Register webhook
# 2. Create payment
# 3. Verify settlement completes
# 4. Verify webhook was delivered

# Monitor in real-time:
docker-compose logs -f webhook-dispatcher
```

---

## 📋 Launch Checklist

Before going to production:

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] All services start without errors
- [ ] Health checks pass
- [ ] Manual end-to-end test successful
- [ ] Webhook signatures verify correctly
- [ ] Seller can register webhooks
- [ ] Settlement triggers events
- [ ] Webhook delivery succeeds
- [ ] Retry logic tested
- [ ] Logs are clean (no warnings/errors)

---

## 🎯 MVP Feature Completeness

### Core Payment Flow
- [x] Seller creates payment link
- [x] Buyer pays with MetaMask
- [x] Settlement confirms on-chain
- [x] **[NEW] Settlement triggers webhook event**
- [ ] Seller sees payment in dashboard

### Webhook System
- [x] Webhook registration API
- [x] Event emission on settlement
- [x] Event emission on payment
- [x] Event emission on payout
- [x] HMAC signature verification
- [x] Retry logic (exponential backoff)
- [x] Database tracking
- [x] Background dispatcher
- [x] Docker deployment

### Infrastructure
- [x] PostgreSQL database
- [x] Next.js web server
- [x] Settlement worker
- [x] Webhook dispatcher worker
- [x] Docker Compose orchestration

### Testing
- [x] 92 unit/integration tests
- [x] Webhook event tests
- [x] Zero compiler errors
- [x] Successful build

---

## 🔍 Monitoring & Alerts

### Key Metrics to Monitor

1. **Webhook Dispatcher Health**
   ```bash
   # Check cycle frequency
   docker-compose logs webhook-dispatcher | grep "Webhook cycle" | tail -5
   
   # Should show cycles every 30 seconds
   ```

2. **Delivery Success Rate**
   ```bash
   psql -U postgres -h localhost -d x402 << EOF
   SELECT 
     status,
     COUNT(*) as count,
     ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM webhook_deliveries
   GROUP BY status
   ORDER BY count DESC;
   EOF
   ```

3. **Average Retry Count**
   ```bash
   psql -U postgres -h localhost -d x402 << EOF
   SELECT 
     AVG(attempt_count)::NUMERIC(10,2) as avg_attempts,
     MAX(attempt_count) as max_attempts,
     MIN(attempt_count) as min_attempts
   FROM webhook_deliveries
   WHERE status = 'success';
   EOF
   ```

4. **Event Types Emitted**
   ```bash
   psql -U postgres -h localhost -d x402 << EOF
   SELECT 
     event_type,
     COUNT(*) as count
   FROM webhook_events
   GROUP BY event_type
   ORDER BY count DESC;
   EOF
   ```

### Critical Alerts

Set up alerts for:
- Webhook dispatcher process crashes
- Database connection errors
- Delivery success rate drops below 95%
- Retry backlog grows (pending > 100)

---

## 📊 Performance Baselines

Expected performance:
- Webhook registration: < 100ms
- Event emission: < 50ms
- Delivery attempt: < 5 seconds (including network)
- Database queries: < 100ms

If slower, check:
- Database indexes
- Network latency
- Service resource limits
- PostgreSQL connection pool

---

## 🚨 Rollback Plan

If issues occur:

1. **Quick Stop**
   ```bash
   docker-compose down
   docker-compose up -d web postgres  # Just these, no dispatcher/worker
   ```

2. **Check Logs**
   ```bash
   docker-compose logs webhook-dispatcher
   docker-compose logs worker
   docker-compose logs web
   ```

3. **Database Rollback**
   ```bash
   # Last backup
   pg_restore -d x402 /path/to/backup.sql
   ```

4. **Revert Code**
   ```bash
   git checkout HEAD~1
   pnpm build
   docker-compose up -d --build
   ```

---

## ✨ Success Indicators

MVP is successfully launched when:

✅ All services running without crashes
✅ Webhook registration works via API
✅ Events emit after settlements complete
✅ Webhooks deliver to endpoints
✅ Signatures verify correctly
✅ Retries work for transient failures
✅ Database grows appropriately (no bloat)
✅ Logs are clean (minimal warnings)
✅ Documentation is complete
✅ Testing guide is followed successfully

---

## 📞 Support & Troubleshooting

If issues arise, check:

1. **Testing Guide** (`docs/TESTING_GUIDE.md`)
   - Verify setup steps
   - Run health checks
   - Follow troubleshooting section

2. **Webhook Events Guide** (`docs/WEBHOOKS.md`)
   - Understand event structure
   - Review signature verification
   - Check retry policy

3. **Logs**
   - `docker-compose logs webhook-dispatcher`
   - `docker-compose logs worker`
   - `docker-compose logs web`

4. **Database**
   - Check webhook_subscriptions table
   - Review webhook_deliveries for errors
   - Verify webhook_events are created

---

**Last Updated:** November 15, 2025
**Version:** MVP 1.0
**Status:** Ready for Deployment
