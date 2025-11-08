import type { NextApiRequest, NextApiResponse } from 'next';
import { listSettlements, updateSettlementToQueued } from '../../../../lib/dbClient';
import { requireAuth } from '../../../../lib/requireSellerAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // list recent settlements
      const limit = Number(req.query.limit || 100);
      const data = await listSettlements(limit);
      return res.status(200).json({ data });
    }

    if (req.method === 'POST') {
      // actions: retry
      const { action, id } = req.body || {};
      if (!action || !id) return res.status(400).json({ error: 'missing_action_or_id' });

      if (action === 'retry') {
        const data = await updateSettlementToQueued(id);
        return res.status(200).json({ success: true, data });
      }

      return res.status(400).json({ error: 'unknown_action' });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err: any) {
    console.error('admin/settlements error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export default requireAuth(handler);
