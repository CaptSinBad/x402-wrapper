/**
 * Minimal buyer SDK helper for demo purposes.
 * Exports a small helper to create a simulated X-PAYMENT header (base64 JSON).
 * This is NOT a production implementation — signatures/authorizations are placeholders.
 */

export type PaymentRequirements = any;

export function createPaymentHeader(paymentRequirements: PaymentRequirements) {
  // Simulate a payment payload that the facilitator.verify middleware will accept in tests.
  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: paymentRequirements?.accepts?.[0]?.network || 'base',
    payload: {
      // placeholder signature and authorization — in test/demo we don't validate crypto
      signature: 'DEMO_SIGNATURE',
      authorization: {
        from: '0xDEMO_FROM',
        to: paymentRequirements?.accepts?.[0]?.payTo || '0xDEMO_TO',
        value: paymentRequirements?.accepts?.[0]?.maxAmountRequired || '1000000',
        validAfter: '0',
        validBefore: '' + (Math.floor(Date.now() / 1000) + 3600),
        nonce: 'demo-nonce',
      },
    },
  };

  const headerObj = {
    paymentPayload,
    paymentRequirements,
  };

  const json = JSON.stringify(headerObj);
  return Buffer.from(json, 'utf8').toString('base64');
}

export async function fetchPaidResource(url: string) {
  // First try without payment header
  const res = await fetch(url);
  if (res.status === 402) {
    const paymentRequirements = await res.json();
    const header = createPaymentHeader(paymentRequirements);
    const res2 = await fetch(url, { headers: { 'X-PAYMENT': header } });
    return await res2.json();
  }
  return await res.json();
}
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
