import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { createActivationCode, getSellerEndpointById } from '../../../../lib/dbClient';
import { verifyPrivySession } from '../../../../lib/verifyPrivySession';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Authenticate seller via Privy token (Authorization header or cookie)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token: string | undefined;
    if (authHeader && typeof authHeader === 'string') token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) token = req.cookies['privy-id-token'] || req.cookies['privy_id_token'];
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const user = await verifyPrivySession(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    const sellerWallet = (user as any)?.wallet?.address;
    if (!sellerWallet) return res.status(400).json({ error: 'User has no wallet address' });

    const body = req.body || {};
    const { seller_endpoint_id, amount, currency, valid_until, metadata } = body;

    if (!seller_endpoint_id) return res.status(400).json({ error: 'missing_seller_endpoint_id' });

    // Ensure seller owns the endpoint
    const endpoint = await getSellerEndpointById(String(seller_endpoint_id));
    if (!endpoint) return res.status(404).json({ error: 'seller_endpoint_not_found' });
    if ((endpoint.seller_wallet || '').toLowerCase() !== String(sellerWallet).toLowerCase()) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const code = (body.code && String(body.code).trim()) || crypto.randomBytes(6).toString('hex');

    const record = {
      code,
      seller_endpoint_id,
      amount: amount ?? null,
      currency: currency ?? null,
      valid_from: new Date().toISOString(),
      valid_until: valid_until || null,
      used: false,
      metadata: metadata || null,
    };

    const created = await createActivationCode(record);
    return res.status(201).json({ activationCode: created });
  } catch (err) {
    console.error('generate activation code error', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
}
