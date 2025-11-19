# Critical Fixes Applied

## [Nov 18, 2025] Facilitator Integration Fix

### The Issue
The payment verification was failing with `400: invalid_payment_requirements`.

### The Fix
The `asset` field in the payment requirements was pointing to an incorrect USDC address.
- **Incorrect:** `0x833589fCD6eDb6E08f4c7C32D4f71b1566469C3d`
- **Correct (Base Sepolia):** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

This address was corrected in `/app/api/bookstore/confirm/route.ts`.

### Verification Status
- **Code Fix:** Applied ✅
- **Verification:** BLOCKED ❌
  - Reason: Local Node.js version is v16.17.1
  - Requirement: Next.js and Vitest require Node.js v20+
  - Action Required: User needs to update Node.js to verify.
