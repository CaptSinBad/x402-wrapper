import { describe, it, expect, beforeEach, vi } from 'vitest';

function mockReq(body?: any) {
  return { method: 'POST', body: body || {}, headers: {}, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as any;
}

function mockRes() {
  const res: any = {};
  res.status = (code: number) => { res._status = code; return res; };
  res.json = (payload: any) => { res._json = payload; return res; };
  return res;
}

const mockInsertSettlement = vi.fn(async (arg?: any) => ({ id: 's1', ...arg }));
const mockInsertPaymentLog = vi.fn(async (arg?: any) => ({ id: 'log-1', ...arg }));
const mockGetOpen = vi.fn(async (attemptId?: string) => null as any);

describe('facilitator /settle deduplication', () => {
  beforeEach(() => {
  vi.resetModules();
    mockInsertSettlement.mockClear();
    mockInsertPaymentLog.mockClear();
    mockGetOpen.mockClear();
    vi.mock('/workspaces/x402-wrapper/apps/lib/dbClient', () => ({
      insertSettlement: mockInsertSettlement,
      insertPaymentLog: mockInsertPaymentLog,
      getOpenSettlementByPaymentAttempt: mockGetOpen,
    }));
  });

  it('skips inserting when an open settlement exists for the attempt', async () => {
    mockGetOpen.mockResolvedValueOnce({ id: 'existing-1' });
    const { default: handler } = await import('../apps/dashboard/pages/api/facilitator/settle');

    const payload = {
      paymentPayload: {
        x402Version: 1,
        scheme: 'exact',
        network: 'testnet',
        payload: {
          signature: '0xdeadbeef',
          authorization: { from: '0xfrom', to: '0xto', value: '100', validAfter: '0', validBefore: '9999999999', nonce: '1' },
        },
      },
    paymentRequirements: { endpoint_id: 'e1', scheme: 'exact', maxAmountRequired: '100', asset: 'USDC', network: 'testnet', attempt_id: 'attempt-123' },
    };

    const req = mockReq(payload);
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(mockInsertSettlement).not.toHaveBeenCalled();
    expect(mockInsertPaymentLog).toHaveBeenCalled();
  });

  it('inserts a settlement when none exists for the attempt', async () => {
    mockGetOpen.mockResolvedValueOnce(null);
    const { default: handler } = await import('../apps/dashboard/pages/api/facilitator/settle');

    const payload = {
      paymentPayload: {
        x402Version: 1,
        scheme: 'exact',
        network: 'testnet',
        payload: {
          signature: '0xdeadbeef',
          authorization: { from: '0xfrom', to: '0xto', value: '100', validAfter: '0', validBefore: '9999999999', nonce: '1' },
        },
      },
  paymentRequirements: { endpoint_id: 'e1', scheme: 'exact', maxAmountRequired: '100', asset: 'USDC', network: 'testnet', attempt_id: 'attempt-456' },
    };

    const req = mockReq(payload);
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(202);
    expect(mockInsertSettlement).toHaveBeenCalled();
  });
});
