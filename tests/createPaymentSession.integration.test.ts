import { vi, describe, it, expect, beforeEach } from 'vitest';

// Helpers to build mock Next.js req/res objects
function mockReq(body?: any) {
  return {
    method: 'POST',
    body: body || {},
    headers: {},
    cookies: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = (code: number) => {
    res._status = code;
    return res;
  };
  res.json = (payload: any) => {
    res._json = payload;
    return res;
  };
  res.end = () => {};
  return res;
}

// Mock the DB client used by the handler so tests don't need Postgres
// Use absolute path specifier so Vitest resolves the same module id as the handler
vi.mock('/workspaces/x402-wrapper/apps/lib/dbClient', () => {
  return {
    getSellerEndpointByUrl: async (url: string) => {
      if (url === '/xlayer/test') {
        return {
          id: '11111111-1111-1111-1111-111111111111',
          seller_wallet: '0xseller',
          endpoint_url: '/xlayer/test',
          price: 100000,
          currency: 'USDC',
          scheme: 'exact',
          network: 'okx-x-layer',
          facilitator_url: 'https://open.x402.host/xlayer',
          metadata: { description: 'Test endpoint' },
        };
      }
      return null;
    },
    getSellerEndpointById: async (id: string) => null,
    insertPaymentAttempt: async (rec: any) => ({ id: 'attempt-1', ...rec }),
    insertPaymentLog: async (log: any) => ({ id: 'log-1', ...log }),
  };
});

// Mock facilitator config import used by handler (use absolute path so Vitest resolves it)
vi.mock('/workspaces/x402-wrapper/core/facilitator/config', () => {
  return {
    loadFacilitatorConfig: () => ({ baseUrl: 'https://open.x402.host/xlayer' }),
    urlFor: () => 'https://open.x402.host/xlayer/verify',
  };
});

describe('create_payment_session integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('creates a payment session and returns x402 paymentRequirements with attempt_id', async () => {
    const req = mockReq({ endpoint_url: '/xlayer/test' });
    const res = mockRes();

    // Import the handler after mocks are registered
    const { default: handler } = await import('../apps/dashboard/pages/api/create_payment_session');

    // Call the handler
    await handler(req, res);

    if (res._status !== 201) {
      // helpful debug info for CI/local runs
      // eslint-disable-next-line no-console
      console.error('create_payment_session response:', res._status, res._json);
    }

    expect(res._status).toBe(201);
    expect(res._json).toHaveProperty('paymentRequirements');
    expect(res._json.paymentRequirements).toHaveProperty('attempt_id');
    expect(res._json.paymentAttempt).toBeTruthy();
    expect(res._json.paymentAttempt.id).toBe('attempt-1');
  });
});
