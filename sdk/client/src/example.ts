/**
 * Example usage of the SDK package (for local dev).
 *
 * This file demonstrates how a consumer would import and call `payAndFetch`.
 * In a published package the consumer would `import { payAndFetch } from '@x402-wrapper/sdk-client'`.
 */
import { payAndFetch, createSignedPaymentHeader } from '.';

async function demo() {
  const wallet = '0xDEMO0000000000000000000000000000000000';

  const res = await payAndFetch('/api/demo/resource', {}, {
    walletAddress: wallet,
    createPayload: async ({ requirement, priceAtomic, walletAddress }) =>
      createSignedPaymentHeader({ requirement, priceAtomic, walletAddress }),
  });

  console.log('response status', res.status);
  console.log('body', await res.json().catch(() => null));
}

demo().catch(console.error);
