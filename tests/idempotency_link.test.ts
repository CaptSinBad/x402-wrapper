import { describe, it, expect, beforeEach, vi } from 'vitest';

function mockReq(body?: any, headers?: any, query?: any) {
  return { method: 'POST', body: body || {}, headers: headers || {}, cookies: {}, socket: { remoteAddress: '127.0.0.1' }, query: query || {} } as any;
}

function mockRes() {
  const res: any = {};
  res.status = (code: number) => { res._status = code; return res; };
  res.json = (payload: any) => { res._json = payload; return res; };
  return res;
}

describe('link resolver idempotency', () => {
  let mockGetPaymentLinkByToken: any;
  let mockGetIdempotencyKey: any;
  let mockCreateIdempotencyKey: any;
  let mockInsertPaymentAttempt: any;
  let mockGetPaymentAttemptById: any;

  beforeEach(() => {
    vi.resetModules();

    mockGetPaymentLinkByToken = vi.fn(async (token: string) => ({ id: 'link-1', token, seller_id: 'seller-1', endpoint_id: 'endpoint-1', item_id: null, price_cents: 100, currency: 'USDC', network: 'base-sepolia' }));

    // idempotency mapping: initially null, then present for subsequent calls
    let mapping: any = null;
    mockGetIdempotencyKey = vi.fn(async (key: string, seller_id?: string) => mapping);
    mockCreateIdempotencyKey = vi.fn(async (rec: any) => { mapping = { id: 'ik-1', idempotency_key: rec.idempotency_key, seller_id: rec.seller_id, payment_attempt_id: rec.payment_attempt_id }; return mapping; });

    mockInsertPaymentAttempt = vi.fn(async (rec: any) => ({ id: 'attempt-1', ...rec }));
    mockGetPaymentAttemptById = vi.fn(async (id: string) => ({ id, seller_endpoint_id: 'endpoint-1', payment_payload: { link_token: 'link-1' }, status: 'pending' }));

    // Mock dbClient import paths used by the handler. Use doMock (non-hoisted)
    vi.doMock('/workspaces/x402-wrapper/apps/lib/dbClient', () => ({
      getPaymentLinkByToken: mockGetPaymentLinkByToken,
      getIdempotencyKey: mockGetIdempotencyKey,
      createIdempotencyKey: mockCreateIdempotencyKey,
      insertPaymentAttempt: mockInsertPaymentAttempt,
      getPaymentAttemptById: mockGetPaymentAttemptById,
    }));
    vi.doMock('/workspaces/xSynesis/apps/lib/dbClient', () => ({
      getPaymentLinkByToken: mockGetPaymentLinkByToken,
      getIdempotencyKey: mockGetIdempotencyKey,
      createIdempotencyKey: mockCreateIdempotencyKey,
      insertPaymentAttempt: mockInsertPaymentAttempt,
      getPaymentAttemptById: mockGetPaymentAttemptById,
    }));
  });

  it('returns same payment attempt when posting twice with same Idempotency-Key', async () => {
    const { default: handler } = await import('../apps/dashboard/pages/api/link/[token]');

    const key = 'idem-abc-123';
    const req1 = mockReq({}, { 'Idempotency-Key': key }, { token: 'link-1' });
    const res1 = mockRes();
    await handler(req1, res1);

    expect(res1._status).toBe(201);
    expect(mockInsertPaymentAttempt).toHaveBeenCalledTimes(1);

    // Second call with same idempotency key: mockGetIdempotencyKey will now return mapping
    const req2 = mockReq({}, { 'Idempotency-Key': key }, { token: 'link-1' });
    const res2 = mockRes();
    await handler(req2, res2);

    // second call should return 200 and not create a new attempt
    expect(res2._status).toBe(200);
    expect(mockInsertPaymentAttempt).toHaveBeenCalledTimes(1);
    // Verify returned attempt id matches canonical
    expect(res2._json.attempt.id).toBe('attempt-1');
  });
});
