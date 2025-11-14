import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';

async function handler(req: NextApiRequest & { sellerWallet?: string }, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, ...updates } = req.body || {};
  if (!id) return res.status(400).json({ error: 'missing_id' });

  try {
    const db = await import('../../../../lib/dbClient');
    const sellerId = req.sellerWallet || null;
    if (!sellerId) return res.status(403).json({ error: 'unauthorized' });

    // Verify seller owns this link
    const link = await db.getPaymentLinkById(id);
    if (!link) return res.status(404).json({ error: 'not_found' });
    if (String(link.seller_id).toLowerCase() !== String(sellerId).toLowerCase()) {
      return res.status(403).json({ error: 'unauthorized' });
    }

    // Allow updates to metadata, price_cents, currency, expires_at; prevent seller_id changes
    const allowed = ['metadata', 'price_cents', 'currency', 'expires_at'];
    const safeUpdates: any = {};
    for (const key of allowed) {
      if (key in updates) safeUpdates[key] = updates[key];
    }

    const updated = await db.updatePaymentLink(id, safeUpdates);
    return res.status(200).json({ ok: true, link: updated });
  } catch (err: any) {
    console.error('update payment link error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export default requireSellerAuth(handler as any) as any;
