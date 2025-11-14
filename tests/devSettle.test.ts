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

const mockInsertSettlement = vi.fn(async (arg?: any) => ({ id: 'dev-s1', ...arg }));
const mockInsertPaymentLog = vi.fn(async (arg?: any) => ({ id: 'log-1', ...arg }));

describe('dev settle simulator', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInsertSettlement.mockClear();
    mockInsertPaymentLog.mockClear();
    // Mock the absolute path used by the handler's dynamic import
    vi.mock('/workspaces/x402-wrapper/apps/lib/dbClient', () => ({
      insertSettlement: mockInsertSettlement,
      insertPaymentLog: mockInsertPaymentLog,
    }));
    // Mirror the mock for the repo-local import path the handler may use
    vi.mock('/workspaces/xSynesis/apps/lib/dbClient', () => ({
      insertSettlement: mockInsertSettlement,
      insertPaymentLog: mockInsertPaymentLog,
    }));
  });

  it('returns 403 when dev mode is disabled', async () => {
    process.env.DEV_SETTLE_ENABLED = 'false';
    const { default: handler } = await import('../apps/dashboard/pages/api/dev/settle');
    const req = mockReq({ payment_attempt_id: 'attempt-1' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  it('returns 400 when payment_attempt_id missing', async () => {
    process.env.DEV_SETTLE_ENABLED = 'true';
    const { default: handler } = await import('../apps/dashboard/pages/api/dev/settle');
    const req = mockReq({});
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('inserts a settlement when enabled and attempt id provided', async () => {
    process.env.DEV_SETTLE_ENABLED = 'true';
    const { default: handler } = await import('../apps/dashboard/pages/api/dev/settle');
    const payload = { payment_attempt_id: 'attempt-42', example: 'payload' };
    const req = mockReq(payload);
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(202);
    expect(mockInsertSettlement).toHaveBeenCalled();
    expect(mockInsertPaymentLog).toHaveBeenCalled();
    expect(res._json && res._json.settlement).toBeTruthy();
  });
});
