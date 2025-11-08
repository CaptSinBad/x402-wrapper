// pages/api/seller/endpoints.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { insertSellerEndpoint } from '../../../../lib/dbClient';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';

// This endpoint now requires a server-validated Privy token. It enforces that the
// seller_wallet stored for an endpoint matches the authenticated user's wallet.

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    const { endpoint_url, price, currency, scheme, network, facilitator_url, metadata } = body;

    // Basic validations
    if (!endpoint_url || price == null) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    // sellerWallet attached by middleware
    const sellerWallet = (req as any).sellerWallet;
    if (!sellerWallet) return res.status(400).json({ error: 'User has no wallet address' });

    // Force seller_wallet to be the authenticated user's wallet to prevent spoofing
    const insertRecord = {
      seller_wallet: sellerWallet,
      endpoint_url,
      price,
      currency: currency || 'USDC',
      scheme: scheme || 'exact',
      network: network || 'base-mainnet',
      facilitator_url: facilitator_url || process.env.NEXT_PUBLIC_FACILITATOR_URL,
      metadata: metadata || {},
    };

    const created = await insertSellerEndpoint(insertRecord);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('endpoint create error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export default requireSellerAuth(handler);
