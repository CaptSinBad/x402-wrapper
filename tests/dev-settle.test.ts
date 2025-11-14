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

const mockGetPaymentAttemptById = vi.fn(async (id?: any) => ({ id, payment_payload: { reservations: ['res-1', 'res-2'], purchaser_address: '0xbuyer' } }));
const mockConfirmReservationAndCreateSale = vi.fn(async (rid: any, opts?: any) => ({ id: `sale-${rid}` }));
const mockInsertSettlement = vi.fn(async (arg?: any) => ({ id: 'settlement-dev', ...arg }));

describe('dev-settle API', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetPaymentAttemptById.mockClear();
    mockConfirmReservationAndCreateSale.mockClear();
    mockInsertSettlement.mockClear();

    // mock the actual resolved path used by the handler's dynamic import
    vi.mock('/workspaces/xSynesis/apps/lib/dbClient', () => ({
      getPaymentAttemptById: mockGetPaymentAttemptById,
      confirmReservationAndCreateSale: mockConfirmReservationAndCreateSale,
      insertSettlement: mockInsertSettlement,
      confirmReservation: async () => ({}),
    }));
  });

  it('returns 403 when disabled', async () => {
    process.env.DEV_SETTLE_ENABLED = 'false';
    const { default: handler } = await import('../apps/dashboard/pages/api/dev/dev-settle');
    const req = mockReq({ payment_attempt_id: 'a1' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  it('returns 400 when missing attempt id', async () => {
    process.env.DEV_SETTLE_ENABLED = 'true';
    const { default: handler } = await import('../apps/dashboard/pages/api/dev/dev-settle');
    const req = mockReq({});
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('direct mode confirms reservations', async () => {
    process.env.DEV_SETTLE_ENABLED = 'true';
    const { default: handler } = await import('../apps/dashboard/pages/api/dev/dev-settle');
    const req = mockReq({ payment_attempt_id: 'attempt-123', mode: 'direct' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(mockGetPaymentAttemptById).toHaveBeenCalledWith('attempt-123');
    expect(mockConfirmReservationAndCreateSale).toHaveBeenCalledTimes(2);
    expect(res._json.ok).toBe(true);
  });

  it('worker mode enqueues settlement', async () => {
    process.env.DEV_SETTLE_ENABLED = 'true';
    const { default: handler } = await import('../apps/dashboard/pages/api/dev/dev-settle');
    const req = mockReq({ payment_attempt_id: 'attempt-999', mode: 'worker' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(mockInsertSettlement).toHaveBeenCalledWith(expect.objectContaining({ payment_attempt_id: 'attempt-999' }));
    expect(res._json.mode).toBe('worker');
  });
});
