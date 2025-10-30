// pages/api/seller/endpoints.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { insertSellerEndpoint } from '../../../../lib/dbClient';
import { verifyPrivySession } from '../../../../lib/verifyPrivySession';

// This endpoint now requires a server-validated Privy token. It enforces that the
// seller_wallet stored for an endpoint matches the authenticated user's wallet.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Extract token from Authorization header or common cookie names
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token: string | undefined;
  if (authHeader && typeof authHeader === 'string') token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) token = req.cookies['privy-id-token'] || req.cookies['privy_id_token'];
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  // Verify token server-side
  const user = await verifyPrivySession(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  try {
    const body = req.body;
    const { endpoint_url, price, currency, scheme, network, facilitator_url, metadata } = body;

    // Basic validations
    if (!endpoint_url || price == null) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    const sellerWallet = (user as any)?.wallet?.address;
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
