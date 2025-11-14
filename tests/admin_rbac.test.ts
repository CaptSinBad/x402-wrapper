import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * RBAC Test Suite for Admin Endpoints
 *
 * This suite validates that all admin endpoints:
 * 1. Require Privy authentication (return 401 without valid token)
 * 2. Properly validate seller ownership where applicable
 * 3. Return 403 for unauthorized access attempts
 * 4. Work correctly for authorized sellers
 *
 * How to integrate with real Privy in tests:
 * - Set PRIVY_APP_ID and PRIVY_APP_SECRET env vars with test credentials
 * - Replace mockVerifyPrivySession with actual verifyPrivySession import
 * - Get test tokens from Privy dashboard and pass in Authorization header
 */

// Mock verifyPrivySession at module level (before importing handlers)
const mockVerifyPrivySession = vi.fn();
vi.mock('/workspaces/xSynesis/apps/lib/verifyPrivySession', () => ({
  verifyPrivySession: mockVerifyPrivySession,
}));

// Mock dbClient functions
const mockListPaymentLinksBySeller = vi.fn();
const mockGetPaymentLinkById = vi.fn();
const mockUpdatePaymentLink = vi.fn();
const mockExpirePaymentLink = vi.fn();
const mockGetSellerEndpointById = vi.fn();
const mockCreateActivationCode = vi.fn();
const mockListPayouts = vi.fn();
const mockListSettlements = vi.fn();
const mockUpdateSettlementToQueued = vi.fn();

vi.doMock('/workspaces/xSynesis/apps/lib/dbClient', () => ({
  listPaymentLinksBySeller: mockListPaymentLinksBySeller,
  getPaymentLinkById: mockGetPaymentLinkById,
  updatePaymentLink: mockUpdatePaymentLink,
  expirePaymentLink: mockExpirePaymentLink,
  getSellerEndpointById: mockGetSellerEndpointById,
  createActivationCode: mockCreateActivationCode,
  listPayouts: mockListPayouts,
  listSettlements: mockListSettlements,
  updateSettlementToQueued: mockUpdateSettlementToQueued,
}));

describe('Admin RBAC: Payment Links', () => {
  beforeEach(() => {
    mockVerifyPrivySession.mockReset();
    mockListPaymentLinksBySeller.mockReset();
    mockGetPaymentLinkById.mockReset();
    mockUpdatePaymentLink.mockReset();
    mockExpirePaymentLink.mockReset();
  });

  it('GET /api/payment_links/list returns 401 without auth token', async () => {
    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/payment_links/list'
    );

    const req = {
      method: 'GET',
      headers: {},
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(401);
    expect(responseData).toHaveProperty('error');
  });

  it('GET /api/payment_links/list returns seller\'s links when authenticated', async () => {
    mockVerifyPrivySession.mockResolvedValue({
      wallet: { address: '0xseller1' },
      sub: 'privy-user-1',
    });
    mockListPaymentLinksBySeller.mockResolvedValue([
      {
        id: 'link-1',
        token: 'abc123',
        seller_id: '0xseller1',
        price_cents: 10000,
      },
    ]);

    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/payment_links/list'
    );

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(200);
    expect(responseData).toHaveProperty('links');
    expect(Array.isArray(responseData.links)).toBe(true);
  });

  it('POST /api/payment_links/update returns 403 when seller tries to update another\'s link', async () => {
    mockVerifyPrivySession.mockResolvedValue({
      wallet: { address: '0xattacker' },
      sub: 'privy-user-attacker',
    });
    mockGetPaymentLinkById.mockResolvedValue({
      id: 'link-1',
      seller_id: '0xseller1',
      price_cents: 10000,
    });

    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/payment_links/update'
    );

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer attacker-token' },
      body: { id: 'link-1', price_cents: 20000 },
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(403);
    expect(responseData).toHaveProperty('error');
  });

  it('POST /api/payment_links/update allows owner to update their link', async () => {
    mockVerifyPrivySession.mockResolvedValue({
      wallet: { address: '0xseller1' },
      sub: 'privy-user-1',
    });
    mockGetPaymentLinkById.mockResolvedValue({
      id: 'link-1',
      seller_id: '0xseller1',
      price_cents: 10000,
    });
    mockUpdatePaymentLink.mockResolvedValue({
      id: 'link-1',
      seller_id: '0xseller1',
      price_cents: 20000,
    });

    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/payment_links/update'
    );

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer seller-token' },
      body: { id: 'link-1', price_cents: 20000 },
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(200);
    expect(responseData).toHaveProperty('link');
  });

  it('POST /api/payment_links/expire allows owner to expire their link', async () => {
    mockVerifyPrivySession.mockResolvedValue({
      wallet: { address: '0xseller1' },
      sub: 'privy-user-1',
    });
    mockGetPaymentLinkById.mockResolvedValue({
      id: 'link-1',
      seller_id: '0xseller1',
    });
    mockExpirePaymentLink.mockResolvedValue({
      id: 'link-1',
      expires_at: new Date().toISOString(),
    });

    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/payment_links/expire'
    );

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer seller-token' },
      body: { id: 'link-1' },
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(200);
    expect(responseData).toHaveProperty('link');
  });
});

describe('Admin RBAC: Activation Codes', () => {
  beforeEach(() => {
    mockVerifyPrivySession.mockReset();
    mockGetSellerEndpointById.mockReset();
    mockCreateActivationCode.mockReset();
  });

  it('POST /api/activation_codes/generate returns 401 without auth token', async () => {
    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/activation_codes/generate'
    );

    const req = {
      method: 'POST',
      headers: {},
      body: { seller_endpoint_id: 'endpoint-1' },
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(401);
    expect(responseData).toHaveProperty('error');
  });

  it('POST /api/activation_codes/generate returns 403 when seller tries to generate for another\'s endpoint', async () => {
    mockVerifyPrivySession.mockResolvedValue({
      wallet: { address: '0xattacker' },
      sub: 'privy-user-attacker',
    });
    mockGetSellerEndpointById.mockResolvedValue({
      id: 'endpoint-1',
      seller_wallet: '0xseller1',
    });

    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/activation_codes/generate'
    );

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer attacker-token' },
      body: { seller_endpoint_id: 'endpoint-1' },
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(403);
    expect(responseData).toHaveProperty('error');
  });

  it('POST /api/activation_codes/generate allows owner to generate code', async () => {
    mockVerifyPrivySession.mockResolvedValue({
      wallet: { address: '0xseller1' },
      sub: 'privy-user-1',
    });
    mockGetSellerEndpointById.mockResolvedValue({
      id: 'endpoint-1',
      seller_wallet: '0xseller1',
    });
    mockCreateActivationCode.mockResolvedValue({
      code: 'ABC123',
      seller_endpoint_id: 'endpoint-1',
    });

    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/activation_codes/generate'
    );

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer seller-token' },
      body: { seller_endpoint_id: 'endpoint-1' },
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(201);
    expect(responseData).toHaveProperty('activationCode');
  });
});

describe('Admin RBAC: Payouts', () => {
  beforeEach(() => {
    mockVerifyPrivySession.mockReset();
    mockListPayouts.mockReset();
  });

  it('GET /api/payouts/list returns 401 without auth token', async () => {
    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/payouts/list'
    );

    const req = {
      method: 'GET',
      headers: {},
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(401);
    expect(responseData).toHaveProperty('error');
  });

  it('GET /api/payouts/list returns seller\'s payouts when authenticated', async () => {
    mockVerifyPrivySession.mockResolvedValue({
      wallet: { address: '0xseller1' },
      sub: 'privy-user-1',
    });
    mockListPayouts.mockResolvedValue([
      {
        id: 'payout-1',
        seller_id: '0xseller1',
        amount_cents: 50000,
      },
    ]);

    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/payouts/list'
    );

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer seller-token' },
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(200);
    expect(responseData).toHaveProperty('data');
    expect(Array.isArray(responseData.data)).toBe(true);
  });
});

describe('Admin RBAC: Settlements', () => {
  beforeEach(() => {
    mockVerifyPrivySession.mockReset();
    mockListSettlements.mockReset();
    mockUpdateSettlementToQueued.mockReset();
  });

  it('GET /api/admin/settlements returns 401 without auth token', async () => {
    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/admin/settlements'
    );

    const req = {
      method: 'GET',
      headers: {},
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(401);
    expect(responseData).toHaveProperty('error');
  });

  it('GET /api/admin/settlements lists settlements for authenticated user', async () => {
    mockVerifyPrivySession.mockResolvedValue({
      wallet: { address: '0xseller1' },
      sub: 'privy-user-1',
    });
    mockListSettlements.mockResolvedValue([
      {
        id: 'settlement-1',
        status: 'confirmed',
        tx_hash: '0xabc123',
      },
    ]);

    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/admin/settlements'
    );

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer seller-token' },
      query: {},
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(200);
    expect(responseData).toHaveProperty('data');
    expect(Array.isArray(responseData.data)).toBe(true);
  });

  it('POST /api/admin/settlements allows retry for authenticated user', async () => {
    mockVerifyPrivySession.mockResolvedValue({
      wallet: { address: '0xseller1' },
      sub: 'privy-user-1',
    });
    mockUpdateSettlementToQueued.mockResolvedValue({
      id: 'settlement-1',
      status: 'queued',
    });

    const { default: handler } = await import(
      '/workspaces/xSynesis/apps/dashboard/pages/api/admin/settlements'
    );

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer seller-token' },
      body: { action: 'retry', id: 'settlement-1' },
    } as any;
    let responseStatus = 0;
    let responseData: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    } as any;

    await handler(req, res);
    expect(responseStatus).toBe(200);
    expect(responseData).toHaveProperty('success', true);
  });
});
