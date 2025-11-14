import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';

async function handler(req: NextApiRequest & { sellerWallet?: string }, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.body || {};
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

    const expired = await db.expirePaymentLink(id);
    return res.status(200).json({ ok: true, link: expired });
  } catch (err: any) {
    console.error('expire payment link error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export default requireSellerAuth(handler as any) as any;
