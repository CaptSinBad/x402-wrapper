import { vi, describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

function mockReq(body?: any, headers?: Record<string,string>) {
  return {
    method: 'POST',
    body: body || {},
    headers: headers || {},
    cookies: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = (code: number) => { res._status = code; return res; };
  res.json = (payload: any) => { res._json = payload; return res; };
  res.end = () => {};
  return res;
}

vi.mock('/workspaces/x402-wrapper/apps/lib/dbClient', () => ({
  updatePaymentAttemptStatus: async () => null,
  insertSettlement: async () => ({ id: 'settlement-1' }),
  insertPaymentLog: async () => ({ id: 'log-1' }),
}));

describe('facilitator webhook HMAC verification', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.FACILITATOR_WEBHOOK_SECRET = 'test-secret-123';
  });

  it('rejects requests with missing signature', async () => {
    const { default: handler } = await import('../apps/dashboard/pages/api/facilitator/webhook');
    const req = mockReq({ some: 'payload' }, {});
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(401);
    expect(res._json).toHaveProperty('error', 'missing_signature');
  });

  it('accepts request with valid signature', async () => {
    const { default: handler } = await import('../apps/dashboard/pages/api/facilitator/webhook');
    const payload = {
      paymentPayload: {
        x402Version: 1,
        scheme: 'exact',
        network: 'testnet',
        payload: {
          signature: '0xdeadbeef',
          authorization: {
            from: '0xfrom',
            to: '0xto',
            value: '100',
            validAfter: '0',
            validBefore: '9999999999',
            nonce: '1',
          },
        },
      },
      paymentRequirements: { endpoint_id: 'e1', maxAmountRequired: '100', asset: 'USDC', network: 'testnet' },
    };
    const raw = JSON.stringify(payload);
    const secret = process.env.FACILITATOR_WEBHOOK_SECRET!;
    const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex');

    const req = mockReq(payload, { 'x-hub-signature': `sha256=${sig}` });
    const res = mockRes();

    await handler(req, res);

    // Handler recognizes payload shape and returns 200 ok
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ ok: true });
  });

});
