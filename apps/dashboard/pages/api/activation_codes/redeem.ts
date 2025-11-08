import type { NextApiRequest, NextApiResponse } from 'next';
import { getActivationCodeByCode, markActivationCodeUsed, insertPaymentLog } from '../../../../lib/dbClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const { code, buyer_address } = body;
    if (!code) return res.status(400).json({ error: 'missing_code' });

    const row = await getActivationCodeByCode(code);
    if (!row) return res.status(404).json({ error: 'code_not_found' });
    if (row.used) return res.status(409).json({ error: 'code_already_used' });

    // Check validity window
    const now = new Date();
    if (row.valid_from && new Date(row.valid_from) > now) return res.status(400).json({ error: 'code_not_yet_valid' });
    if (row.valid_until && new Date(row.valid_until) < now) return res.status(400).json({ error: 'code_expired' });

    const used = await markActivationCodeUsed(code, buyer_address || null);
    if (!used) return res.status(409).json({ error: 'code_already_used' });

    try {
      await insertPaymentLog({ level: 'info', message: 'activation_code_redeemed', meta: { code, endpoint_id: row.seller_endpoint_id }, endpoint_id: row.seller_endpoint_id, payer_address: buyer_address || null, success: true });
    } catch (e) {
      // non-fatal
    }

    return res.status(200).json({ success: true, activationCode: used });
  } catch (err) {
    console.error('redeem activation code error', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
}
