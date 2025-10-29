import { describe, it, expect, beforeEach, vi } from 'vitest';
import { payAndFetch, createSignedPaymentHeader } from '../apps/lib/payAndFetch';

// Basic unit tests for payAndFetch using mocked fetch and a mock provider
describe('payAndFetch', () => {
  beforeEach(() => {
    // reset globals
    (global as any).fetch = undefined;
    (window as any).privy = undefined;
  });

  it('fetches non-402 resource without payment', async () => {
    (global as any).fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));

    const res = await payAndFetch('/some', {} as any, {
      createPayload: async () => ({ x402Version: 1, scheme: 'exact', network: 'base', payload: {} }),
      walletAddress: '0x0',
    });

    expect(res.status).toBe(200);
  });

  it('retries after 402 with created payment header', async () => {
    // First call returns 402 with accepts array
    const first = new Response(JSON.stringify({ accepts: [{ scheme: 'exact', network: 'base', maxAmountRequired: '100', resource: '/api/demo/resource' }] }), { status: 402, headers: { 'Content-Type': 'application/json' } });
    const second = new Response(JSON.stringify({ success: true }), { status: 200 });

    const fetchMock = vi.fn()
      .mockImplementationOnce(() => Promise.resolve(first))
      .mockImplementationOnce((_url: any, opts: any) => {
        // ensure header present
        const headers = opts?.headers || {};
        expect(headers['X-PAYMENT']).toBeDefined();
        return Promise.resolve(second);
      });

    (global as any).fetch = fetchMock;

    // mock provider for createSignedPaymentHeader
    (window as any).privy = { provider: { request: async ({ method }: any) => '0xSIG' } };

    const res = await payAndFetch('/api/demo/resource', {}, {
      createPayload: async ({ requirement, priceAtomic, walletAddress }) =>
        createSignedPaymentHeader({ requirement, priceAtomic, walletAddress }),
      walletAddress: '0xDEMO',
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
