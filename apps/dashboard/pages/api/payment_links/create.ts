import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';

async function handler(req: NextApiRequest & { sellerWallet?: string }, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const token = body.token || null;
  if (!token) return res.status(400).json({ error: 'missing_token' });

  try {
    const db = await import('../../../../lib/dbClient');
    // enforce that if a seller_id is provided it must match the authenticated seller
    const authSeller = req.sellerWallet || null;
    if (body.seller_id && authSeller && String(body.seller_id).toLowerCase() !== String(authSeller).toLowerCase()) {
      return res.status(403).json({ error: 'seller_id_mismatch' });
    }
    // always set seller_id to the authenticated seller when available
    const sellerId = authSeller || body.seller_id || null;
    const rec = {
      token,
      seller_id: sellerId,
      item_id: body.item_id || null,
      endpoint_id: body.endpoint_id || null,
      price_cents: body.price_cents || null,
      currency: body.currency || null,
      network: body.network || null,
      metadata: body.metadata || null,
      expires_at: body.expires_at || null,
    };
    const created = await db.createPaymentLink(rec);
    return res.status(201).json({ ok: true, link: created });
  } catch (err: any) {
    console.error('create payment link error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export default requireSellerAuth(handler as any) as any;
