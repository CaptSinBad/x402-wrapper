// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Integration test for Payment Links admin endpoints with Privy authentication.
 * 
 * This test mocks verifyPrivySession to simulate Privy's token verification.
 * For real Privy testing with actual tokens, you would:
 * 1. Use Privy's test app credentials (available in Privy dashboard)
 * 2. Call Privy client to generate a real test token
 * 3. Pass that token to the handlers
 */

// Set up verifyPrivySession mock BEFORE importing handlers
const mockVerifyPrivySession = vi.fn();

vi.mock('/workspaces/xSynesis/apps/lib/verifyPrivySession', () => ({
  verifyPrivySession: mockVerifyPrivySession,
}));

vi.mock('/workspaces/x402-wrapper/apps/lib/verifyPrivySession', () => ({
  verifyPrivySession: mockVerifyPrivySession,
}));

// Mock dbClient helpers
const mockListLinks = vi.fn();
const mockCreateLink = vi.fn();
const mockGetLinkById = vi.fn();
const mockUpdateLink = vi.fn();
const mockExpireLink = vi.fn();

vi.doMock('/workspaces/xSynesis/apps/lib/dbClient', () => ({
  listPaymentLinksBySeller: mockListLinks,
  createPaymentLink: mockCreateLink,
  getPaymentLinkById: mockGetLinkById,
  updatePaymentLink: mockUpdateLink,
  expirePaymentLink: mockExpireLink,
}));

function mockReq(body?: any, method: string = 'POST', headers?: any) {
  return {
    method,
    body: body || {},
    headers: headers || { authorization: 'Bearer seller-token-123' },
    cookies: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = (code: number) => { res._status = code; return res; };
  res.json = (payload: any) => { res._json = payload; return res; };
  return res;
}

describe('Payment Links Admin Endpoints (with Privy Auth)', () => {
  beforeEach(() => {
    mockVerifyPrivySession.mockClear();
    mockListLinks.mockClear();
    mockCreateLink.mockClear();
    mockGetLinkById.mockClear();
    mockUpdateLink.mockClear();
    mockExpireLink.mockClear();
  });

  describe('GET /api/payment_links/list', () => {
    it('returns 401 when authentication token is missing', async () => {
      mockVerifyPrivySession.mockResolvedValue(null);
      const { default: handler } = await import('../apps/dashboard/pages/api/payment_links/list');
      const req = mockReq({}, 'GET', {}); // no auth header
      const res = mockRes();
      await handler(req, res);
      expect(res._status).toBe(401);
    });

    it('lists payment links for authenticated seller', async () => {
      const sellerWallet = '0xseller123';
      mockVerifyPrivySession.mockResolvedValue({ wallet: { address: sellerWallet }, sub: 'privy-user-1' });
      mockListLinks.mockResolvedValue([
        { id: 'link-1', token: 'tok-abc', seller_id: sellerWallet, price_cents: 100, currency: 'USDC', created_at: '2025-01-01' },
        { id: 'link-2', token: 'tok-def', seller_id: sellerWallet, price_cents: 200, currency: 'USDC', created_at: '2025-01-02' },
      ]);

      const { default: handler } = await import('../apps/dashboard/pages/api/payment_links/list');
      const req = mockReq({}, 'GET');
      const res = mockRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ok).toBe(true);
      expect(res._json.links).toHaveLength(2);
      expect(mockListLinks).toHaveBeenCalledWith(sellerWallet);
    });
  });

  describe('POST /api/payment_links/update', () => {
    it('updates payment link when seller is the owner', async () => {
      const sellerWallet = '0xseller456';
      mockVerifyPrivySession.mockResolvedValue({ wallet: { address: sellerWallet }, sub: 'privy-user-2' });
      mockGetLinkById.mockResolvedValue({
        id: 'link-1',
        seller_id: sellerWallet,
        price_cents: 100,
        currency: 'USDC',
      });
      mockUpdateLink.mockResolvedValue({
        id: 'link-1',
        seller_id: sellerWallet,
        price_cents: 150,
        currency: 'USDC',
      });

      const { default: handler } = await import('../apps/dashboard/pages/api/payment_links/update');
      const req = mockReq({ id: 'link-1', price_cents: 150 });
      const res = mockRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.link.price_cents).toBe(150);
      expect(mockUpdateLink).toHaveBeenCalledWith('link-1', { price_cents: 150 });
    });

    it('returns 403 when seller does not own the link', async () => {
      mockVerifyPrivySession.mockResolvedValue({ wallet: { address: '0xattacker' }, sub: 'privy-user-3' });
      mockGetLinkById.mockResolvedValue({
        id: 'link-1',
        seller_id: '0xlegit-owner',
        price_cents: 100,
      });

      const { default: handler } = await import('../apps/dashboard/pages/api/payment_links/update');
      const req = mockReq({ id: 'link-1', price_cents: 150 });
      const res = mockRes();
      await handler(req, res);

      expect(res._status).toBe(403);
      expect(mockUpdateLink).not.toHaveBeenCalled();
    });

    it('returns 404 when link does not exist', async () => {
      mockVerifyPrivySession.mockResolvedValue({ wallet: { address: '0xseller789' }, sub: 'privy-user-4' });
      mockGetLinkById.mockResolvedValue(null);

      const { default: handler } = await import('../apps/dashboard/pages/api/payment_links/update');
      const req = mockReq({ id: 'nonexistent' });
      const res = mockRes();
      await handler(req, res);

      expect(res._status).toBe(404);
    });
  });

  describe('POST /api/payment_links/expire', () => {
    it('expires a payment link when seller is the owner', async () => {
      const sellerWallet = '0xseller999';
      mockVerifyPrivySession.mockResolvedValue({ wallet: { address: sellerWallet }, sub: 'privy-user-5' });
      mockGetLinkById.mockResolvedValue({
        id: 'link-1',
        seller_id: sellerWallet,
        expires_at: null,
      });
      mockExpireLink.mockResolvedValue({
        id: 'link-1',
        seller_id: sellerWallet,
        expires_at: new Date().toISOString(),
      });

      const { default: handler } = await import('../apps/dashboard/pages/api/payment_links/expire');
      const req = mockReq({ id: 'link-1' });
      const res = mockRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.link.expires_at).toBeTruthy();
      expect(mockExpireLink).toHaveBeenCalledWith('link-1');
    });

    it('returns 401 when not authenticated', async () => {
      mockVerifyPrivySession.mockResolvedValue(null);
      const { default: handler } = await import('../apps/dashboard/pages/api/payment_links/expire');
      const req = mockReq({ id: 'link-1' }, 'POST', {});
      const res = mockRes();
      await handler(req, res);

      expect(res._status).toBe(401);
    });
  });
});
