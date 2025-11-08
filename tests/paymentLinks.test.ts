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

const mockCreatePaymentLink = vi.fn(async (arg?: any) => ({ id: 'pl-1', ...arg }));

describe('payment links admin API (protected)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreatePaymentLink.mockClear();
    // Mock dbClient
    vi.mock('/workspaces/x402-wrapper/apps/lib/dbClient', () => ({ createPaymentLink: mockCreatePaymentLink }));
    // Mock requireSellerAuth to inject sellerWallet into req and call the handler
    vi.mock('/workspaces/x402-wrapper/apps/lib/requireSellerAuth', () => ({
      requireSellerAuth: (handler: any) => {
        return async (req: any, res: any) => {
          // inject a sellerWallet as if authenticated
          req.sellerWallet = '0xsellerabc';
          return handler(req, res);
        };
      }
    }));
  });

  it('creates a payment link and uses authenticated seller when seller_id not provided', async () => {
    const { default: handler } = await import('../apps/dashboard/pages/api/payment_links/create');
    const payload = { token: 'coffee-50', price_cents: 50 };
    const req = mockReq(payload);
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(201);
    expect(mockCreatePaymentLink).toHaveBeenCalled();
    const arg = mockCreatePaymentLink.mock.calls[0][0];
    expect(arg.seller_id).toBe('0xsellerabc');
  });

  it('honors explicit seller_id if provided (but we still may want to validate in prod)', async () => {
    const { default: handler } = await import('../apps/dashboard/pages/api/payment_links/create');
    // If seller_id does not match authenticated seller, we should reject
    const payload = { token: 'gift', price_cents: 100, seller_id: '0xother' };
    const req = mockReq(payload);
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  it('accepts explicit seller_id when it matches authenticated seller', async () => {
    const { default: handler } = await import('../apps/dashboard/pages/api/payment_links/create');
    const payload = { token: 'gift', price_cents: 100, seller_id: '0xsellerabc' };
    const req = mockReq(payload);
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(201);
    const arg = mockCreatePaymentLink.mock.calls[0][0];
    expect(arg.seller_id).toBe('0xsellerabc');
  });
});
