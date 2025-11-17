import { describe, it, expect, beforeEach, vi } from 'vitest';

function mockReq(body?: any, headers?: Record<string,string>) {
  return { method: 'POST', body: body || {}, headers: headers || {}, cookies: {}, socket: { remoteAddress: '127.0.0.1' } } as any;
}

function mockRes() {
  const res: any = {};
  res.status = (code: number) => { res._status = code; return res; };
  res.json = (payload: any) => { res._json = payload; return res; };
  return res;
}

const mockConfirmAndCreate = vi.fn(async (rid: any, opts?: any) => ({ id: `sale-${rid}` }));
const mockRelease = vi.fn(async () => null);
const mockGetPaymentAttempt = vi.fn(async (id?: any) => ({ id, payment_payload: { reservations: ['res-a', 'res-b'] } }));
const mockInsertPaymentLog = vi.fn(async () => ({ id: 'log-1' }));

describe('facilitator webhook -> confirm reservations', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.FACILITATOR_WEBHOOK_SECRET = 'test-secret-abc';
    mockConfirmAndCreate.mockClear();
    mockRelease.mockClear();
    mockGetPaymentAttempt.mockClear();
    mockInsertPaymentLog.mockClear();

    vi.mock('/workspaces/xSynesis/apps/lib/dbClient', () => ({
      confirmReservationAndCreateSale: mockConfirmAndCreate,
      releaseReservation: mockRelease,
      getPaymentAttemptById: mockGetPaymentAttempt,
      insertPaymentLog: mockInsertPaymentLog,
      updatePaymentAttemptStatus: async () => ({}),
      insertSettlement: async () => ({ id: 's1' }),
      getOpenSettlementByPaymentAttempt: async () => null,
    }));
    vi.mock('/workspaces/xSynesis/apps/lib/dbClient', () => ({
      confirmReservationAndCreateSale: mockConfirmAndCreate,
      releaseReservation: mockRelease,
      getPaymentAttemptById: mockGetPaymentAttempt,
      insertPaymentLog: mockInsertPaymentLog,
      updatePaymentAttemptStatus: async () => ({}),
      insertSettlement: async () => ({ id: 's1' }),
      getOpenSettlementByPaymentAttempt: async () => null,
    }));
  });

  it('confirms reservations and creates sales when settle indicates success', async () => {
    const { default: handler } = await import('../apps/dashboard/pages/api/facilitator/webhook');

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
  paymentRequirements: { endpoint_id: 'e1', scheme: 'exact', maxAmountRequired: '100', asset: 'USDC', network: 'testnet', attempt_id: 'attempt-1' },
      isValid: true,
    };

    const raw = JSON.stringify(payload);
    const sig = require('crypto').createHmac('sha256', process.env.FACILITATOR_WEBHOOK_SECRET).update(raw).digest('hex');
    const req = mockReq(payload);
    req.headers['x-hub-signature'] = `sha256=${sig}`;
    const res = mockRes();

    await handler(req, res);

  const db = await import('/workspaces/xSynesis/apps/lib/dbClient');
  expect(res._status).toBe(200);
  expect(db.getPaymentAttemptById).toHaveBeenCalledWith('attempt-1');
  expect(db.confirmReservationAndCreateSale).toHaveBeenCalledTimes(2);
  expect(db.releaseReservation).not.toHaveBeenCalled();
  });

  it('releases reservations when settle indicates failure', async () => {
    const { default: handler } = await import('../apps/dashboard/pages/api/facilitator/webhook');

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
  paymentRequirements: { endpoint_id: 'e1', scheme: 'exact', maxAmountRequired: '100', asset: 'USDC', network: 'testnet', attempt_id: 'attempt-2' },
      isValid: false,
    };

    const raw = JSON.stringify(payload);
    const sig = require('crypto').createHmac('sha256', process.env.FACILITATOR_WEBHOOK_SECRET).update(raw).digest('hex');
    const req = mockReq(payload);
    req.headers['x-hub-signature'] = `sha256=${sig}`;
    const res = mockRes();

    await handler(req, res);

  const db = await import('/workspaces/xSynesis/apps/lib/dbClient');
  expect(res._status).toBe(200);
  expect(db.getPaymentAttemptById).toHaveBeenCalledWith('attempt-2');
  expect(db.releaseReservation).toHaveBeenCalledTimes(2);
  expect(db.confirmReservationAndCreateSale).not.toHaveBeenCalled();
  });
});
