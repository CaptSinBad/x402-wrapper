import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';

async function handler(req: NextApiRequest & { sellerWallet?: string }, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const amount_cents = Number(body.amount_cents || 0);
  const method = String(body.method || '').toLowerCase();
  const currency = body.currency || 'USDC';
  const destination = body.destination || null;
  if (!amount_cents || amount_cents <= 0) return res.status(400).json({ error: 'invalid_amount' });
  if (!method) return res.status(400).json({ error: 'missing_method' });

  try {
  const db = await import('../../../../lib/dbClient');
  const sellerId = (req.sellerWallet || null);
  if (!sellerId) return res.status(400).json({ error: 'missing_seller' });
    // include network in metadata (default to environment DEFAULT_NETWORK or Base Sepolia)
    const defaultNetwork = process.env.DEFAULT_NETWORK || process.env.DEFAULT_CHAIN || 'base-sepolia';
    const metadata = Object.assign({}, body.metadata || {});
    if (!metadata.network) metadata.network = body.network || defaultNetwork;

    const rec = {
      seller_id: sellerId,
      amount_cents,
      currency,
      method,
      destination,
      status: 'requested',
      requested_at: new Date().toISOString(),
      metadata,
    };
    const created = await db.createPayout(rec as any);

    // Emit payout.created event
    try {
      const webhookDispatcher = await import('../../../../../apps/lib/webhookDispatcher');
      await webhookDispatcher.triggerWebhookEvent(db, {
        event_type: 'payout.created',
        seller_id: sellerId,
        resource_type: 'payout',
        resource_id: created.id,
        payload: {
          payout_id: created.id,
          amount_cents,
          currency,
          destination,
          method,
          status: 'requested',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (webhookErr) {
      // Log but don't fail payout creation on webhook errors
      console.error('failed to emit payout webhook event', webhookErr);
    }

    return res.status(201).json({ ok: true, payout: created });
  } catch (err: any) {
    console.error('create payout error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export default requireSellerAuth(handler as any) as any;

