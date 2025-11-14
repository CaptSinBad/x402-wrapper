import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';

// Body: { id: string, status?: string, tx_hash?: string, processed_at?: string, metadata?: any }
async function handler(req: NextApiRequest & { sellerWallet?: string }, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const id = body.id || null;
  if (!id) return res.status(400).json({ error: 'missing_id' });

  try {
    const db = await import('../../../../lib/dbClient');
    const sellerId = (req.sellerWallet || null);
    if (!sellerId) return res.status(400).json({ error: 'missing_seller' });

    const existing = await db.getPayoutById(id);
    if (!existing) return res.status(404).json({ error: 'not_found' });
    if (String(existing.seller_id).toLowerCase() !== String(sellerId).toLowerCase()) return res.status(403).json({ error: 'forbidden' });

    const updates: any = {};
    if (body.status) updates.status = body.status;
    if (body.tx_hash) updates.tx_hash = body.tx_hash;
    if (body.processed_at) updates.processed_at = body.processed_at;
    if (body.metadata) updates.metadata = body.metadata;

    // If marking completed and processed_at not provided, set now
    if (updates.status === 'completed' && !updates.processed_at) updates.processed_at = new Date().toISOString();

    const updated = await db.updatePayout(id, updates as any);
    return res.status(200).json({ ok: true, payout: updated });
  } catch (err: any) {
    console.error('update payout error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export default requireSellerAuth(handler as any) as any;
