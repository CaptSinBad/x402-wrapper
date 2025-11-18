# xSynesis — Immediate Action Items (Nov 18, 2025)

## 🎯 Current Status
- **Overall:** Phase 1 (Buyer Demo) is 75% working
- **Blocker:** Facilitator returns `400: invalid_payment_requirements`
- **Estimated Fix Time:** 1-2 hours
- **Handoff Status:** ✅ Ready for Google Antigravity

---

## 🚨 CRITICAL ISSUE (Must Fix First)

**Error:** `Facilitator returned 400: {"isValid":false,"invalidReason":"invalid_payment_requirements"...}`

**Location:** Server logs during payment attempt
- Frontend: `/apps/dashboard/pages/pay-demo.tsx`
- Backend: `/app/api/bookstore/confirm/route.ts` → `/core/facilitator/index.ts`

**Root Cause:** Unknown (investigation needed)

**Possible Causes (in priority order):**
1. Payment requirements missing required fields (mimeType, maxTimeoutSeconds)
2. USDC token address incorrect (should be actual address, not "USDC" string)
3. Payment requirements structure doesn't match facilitator schema
4. Facilitator at https://x402.org/facilitator is offline/misconfigured

---

## 📋 Investigation Checklist (START HERE)

### ✅ Verify Setup
```bash
cd /workspaces/xSynesis

# 1. Server running?
pnpm dev
# Should see: "✓ Ready in XXms"

# 2. Database migrated?
pnpm test -- --run | head -20
# Should see: "✓ passing"

# 3. Environment configured?
grep FACILITATOR .env.server
# Should show: NEXT_PUBLIC_FACILITATOR_URL=https://x402.org/facilitator
```

### 🔍 Reproduce the Bug
```bash
# In browser
http://localhost:3000/pay-demo

# 1. Select any book
# 2. Click "Checkout"
# 3. If prompted, connect wallet (via Privy)
# 4. Sign the payment
# 5. Watch for error in console and server logs
```

### 📊 Check What's Being Sent
**File:** `/app/api/bookstore/confirm/route.ts`

Look for this log output:
```
[bookstore/confirm] Payment Requirements: {
  "scheme": "exact",
  "network": "base-sepolia",
  "maxAmountRequired": "33980000",
  ...
}
```

**Compare to reference:** `/X402_WORKING_CODE_PATTERNS.md` (lines 150-180)

**Questions to answer:**
- [ ] Does it have `mimeType` field?
- [ ] Does it have `maxTimeoutSeconds` field?
- [ ] Is `asset` field the actual USDC token address or just "USDC"?
- [ ] Is `extra` field present (with name/version)?
- [ ] Are all fields the correct type?

### 🧪 Test Facilitator Directly
```bash
# Is facilitator responding?
curl -X POST https://x402.org/facilitator/verify \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -v

# Check response - if error, facilitator may be offline
```

---

## 🔧 Likely Fixes (Pick One and Try)

### Fix Option 1: Add Missing Fields to PaymentRequirements
**File:** `/app/api/bookstore/confirm/route.ts` (around line 30-40)

**Current code might be:**
```typescript
const paymentRequirements = {
  scheme: "exact",
  network: "base-sepolia",
  maxAmountRequired: PRICE_AMOUNT.toString(),
  resource: "/bookstore-demo",
  description: `Bookstore Purchase - ${PRICE_DISPLAY}`,
  asset: "USDC",
  payTo: SELLER_ADDRESS,
};
```

**Add these fields:**
```typescript
const paymentRequirements = {
  scheme: "exact",
  network: "base-sepolia",
  maxAmountRequired: PRICE_AMOUNT.toString(),
  mimeType: "application/json",              // ← ADD
  maxTimeoutSeconds: 300,                    // ← ADD
  resource: "/bookstore-demo",
  description: `Bookstore Purchase - ${PRICE_DISPLAY}`,
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // ← CHANGE: USDC on Base Sepolia
  payTo: SELLER_ADDRESS,
};
```

### Fix Option 2: Check USDC Token Address
**Base Sepolia USDC Address:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

Search the codebase:
```bash
grep -r "833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" .
grep -r "asset.*USDC" . --include="*.ts" --include="*.tsx"
```

If the token address is hardcoded as just "USDC", that's the problem.

### Fix Option 3: Check Facilitator Integration
**File:** `/core/facilitator/index.ts` (around line 168-170)

```typescript
export async function verify(req: VerifyRequest): Promise<VerifyResponse> {
  // ...
  if (!FACILITATOR_URL) throw new Error('FACILITATOR_URL not configured');
  const path = `${FACILITATOR_URL.replace(/\/$/, '')}/verify`;
  return await postJSON<VerifyRequest, VerifyResponse>(path, req, { 
    timeoutMs: 8000, 
    retries: 1 
  });
}
```

**Check:**
- [ ] Is `FACILITATOR_URL` defined? (Should be from `NEXT_PUBLIC_FACILITATOR_URL`)
- [ ] Is path correct? (Should be `https://x402.org/facilitator/verify`)
- [ ] Is timeout too short? (8000ms = 8 seconds, might be OK)
- [ ] Should we add more retries? (Currently 1)

---

## 📝 How to Apply Fixes

### Step 1: Edit the file
```bash
# Edit the file (opens in VS Code)
# Make changes based on Fix Option chosen above
```

### Step 2: Restart server
```bash
# Kill current server (Ctrl+C in terminal)
# Restart
pnpm dev
```

### Step 3: Test the fix
```bash
# In browser: http://localhost:3000/pay-demo
# 1. Try payment again
# 2. Check console for new error (if any)
# 3. Check server logs for [bookstore/confirm] messages
```

### Step 4: If it works
```bash
# Run tests to ensure no regressions
pnpm test

# Should see: "✓ X tests passing"
```

### Step 5: Document
- Update `/CRITICAL_FIXES_APPLIED.md` with what was fixed and why
- Update `/docs/product_journal.md` URGENT section
- Add a note to this file with the fix applied

---

## 🎓 Key Files Reference

| File | What It Does | Key Lines |
|------|-------------|-----------|
| `/apps/dashboard/pages/pay-demo.tsx` | Buyer UI, payment form, signing | 140-250 |
| `/app/api/bookstore/confirm/route.ts` | Endpoint that calls facilitator | 1-70 |
| `/core/facilitator/index.ts` | Makes HTTP POST to facilitator | 168-170 |
| `/X402_WORKING_CODE_PATTERNS.md` | Reference implementation | 150-180 |
| `/.env.server` | Configuration (facilitator URL) | Line with NEXT_PUBLIC_FACILITATOR_URL |

---

## 🚀 Success Criteria

**Fix is complete when:**
- [ ] Payment submitted from `/pay-demo`
- [ ] No `400: invalid_payment_requirements` error
- [ ] Facilitator returns `isValid: true`
- [ ] Server shows success log
- [ ] Sale record created in database
- [ ] Success confirmation shown to user
- [ ] All tests still passing

---

## 🆘 If You Get Stuck

### Problem: "Cannot find module" errors
```bash
pnpm install
```

### Problem: Database not migrated
```bash
node scripts/run-migrations.js
```

### Problem: Port 3000 already in use
```bash
lsof -i :3000
kill -9 <PID>
pnpm dev
```

### Problem: Privy wallet won't connect
- This is normal in Codespaces (domain mismatch)
- Use dev/test wallet if available
- Or update Privy config with your domain

### Problem: Still getting error
1. Check server logs carefully (look for `[bookstore/confirm]` prefix)
2. Check browser console (F12)
3. Test facilitator endpoint with curl (see above)
4. Read `/X402_WORKING_CODE_PATTERNS.md` again
5. Search `/CRITICAL_FIXES_APPLIED.md` for similar errors

---

## 📞 Quick Links

- **Main Handoff:** `/ANTIGRAVITY_HANDOFF.md`
- **Session Summary:** `/SESSION_2_SUMMARY.md`
- **Recent Fixes:** `/CRITICAL_FIXES_APPLIED.md`
- **Reference Patterns:** `/X402_WORKING_CODE_PATTERNS.md`
- **Product Vision:** `/docs/product_journal.md`

---

**Last Updated:** Nov 18, 2025  
**Handoff Status:** ✅ READY FOR ANTIGRAVITY  
**Est. Time to Fix:** 1-2 hours (investigation + fix + test)
