import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';

async function handler(req: NextApiRequest & { sellerWallet?: string }, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
  const db = await import('../../../../lib/dbClient');
  const sellerId = (req.sellerWallet || null);
  if (!sellerId) return res.status(400).json({ error: 'missing_seller' });
  const rows = await db.listPayouts(sellerId);
    return res.status(200).json({ ok: true, data: rows });
  } catch (err: any) {
    console.error('list payouts error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export default requireSellerAuth(handler as any) as any;
