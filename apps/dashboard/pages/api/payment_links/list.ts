import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';

async function handler(req: NextApiRequest & { sellerWallet?: string }, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = await import('../../../../lib/dbClient');
    const sellerId = req.sellerWallet || null;
    if (!sellerId) return res.status(403).json({ error: 'unauthorized' });

    const links = await db.listPaymentLinksBySeller(sellerId);
    return res.status(200).json({ ok: true, links });
  } catch (err: any) {
    console.error('list payment links error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export default requireSellerAuth(handler as any) as any;
