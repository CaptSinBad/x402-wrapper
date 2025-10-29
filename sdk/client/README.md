# @x402-wrapper/sdk-client

Thin buyer SDK package that exports the `payAndFetch` helper and the `createSignedPaymentHeader` helper used in the demo.

This package is currently a thin wrapper around the workspace implementation at `apps/lib/payAndFetch.ts` for local development. For publishing, build to `dist/` using the included build config.

Usage (in-app / local):

1. Import from the package entry (within the monorepo):

```ts
import { payAndFetch, createSignedPaymentHeader } from '@x402-wrapper/sdk-client';
```

2. Use `payAndFetch` to perform the x402 flow (see `src/example.ts` for a runnable demo):

```ts
// Example snippet
const res = await payAndFetch('/api/demo/resource', {}, { walletAddress, createPayload });
```

To build (emit `dist/`):

```bash
cd sdk/client
npm run build
```

Notes:
- This package currently re-exports implementation from `apps/lib/payAndFetch.ts` to avoid duplicating logic.
- For publishing, consider copying the code into the package and adding precise dependency versions.
