import { describe, it, expect, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

function mockReq(headers?: any, cookies?: any) {
  return { method: 'GET', headers: headers || {}, cookies: cookies || {} } as any as NextApiRequest;
}

function mockRes() {
  const res: any = {};
  res.status = (code: number) => { res._status = code; return res; };
  res.json = (payload: any) => { res._json = payload; return res; };
  return res as any;
}

// Mock verifyPrivySession used by middleware
vi.mock('/workspaces/x402-wrapper/apps/lib/verifyPrivySession', () => ({
  verifyPrivySession: vi.fn(async (token: string) => {
    if (token === 'good-token') return { wallet: { address: '0xabc' }, sub: 'user-1' };
    return null;
  })
}));

describe('requireAuth / requireSellerAuth middleware', () => {
  it('returns 401 when token missing', async () => {
    const { requireAuth } = await import('../apps/lib/requireSellerAuth');
    const handler = requireAuth(async (req, res) => res.status(200).json({ ok: true }));
    const req = mockReq();
    const res = mockRes();
    await handler(req, res as any);
    expect(res._status).toBe(401);
  });

  it('allows valid token and attaches authUser', async () => {
    const { requireAuth } = await import('../apps/lib/requireSellerAuth');
    const spy = vi.fn((req: any, res: any) => res.status(200).json({ user: req.authUser }));
    const handler = requireAuth(spy as any);

    const req = mockReq({ authorization: 'Bearer good-token' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(spy).toHaveBeenCalled();
    const calledReq = (spy.mock.calls[0][0] as any);
    expect(calledReq.authUser).toHaveProperty('sub', 'user-1');
  });

  it('requireSellerAuth enforces wallet address', async () => {
    const { requireSellerAuth } = await import('../apps/lib/requireSellerAuth');
    const spy = vi.fn((req: any, res: any) => res.status(200).json({ wallet: req.sellerWallet }));
    const handler = requireSellerAuth(spy as any);

    const req = mockReq({ authorization: 'Bearer good-token' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(spy).toHaveBeenCalled();
    const calledReq = (spy.mock.calls[0][0] as any);
    expect(calledReq.sellerWallet).toBe('0xabc');
  });
});
