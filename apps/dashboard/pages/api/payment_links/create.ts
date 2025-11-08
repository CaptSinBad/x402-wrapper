import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Basic admin guard could be added here; for now assume authenticated in dev
  const body = req.body || {};
  const token = body.token || null;
  if (!token) return res.status(400).json({ error: 'missing_token' });

  try {
    const db = await import('../../../../lib/dbClient');
    const rec = {
      token,
      seller_id: body.seller_id || null,
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
