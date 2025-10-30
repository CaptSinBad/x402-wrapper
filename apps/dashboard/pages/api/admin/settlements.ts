import type { NextApiRequest, NextApiResponse } from 'next';
import { listSettlements, updateSettlementToQueued } from '../../../../lib/dbClient';
import { verifyPrivySession } from '../../../../lib/verifyPrivySession';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require auth for admin actions
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token: string | undefined;
  if (authHeader && typeof authHeader === 'string') token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) token = req.cookies['privy-id-token'] || req.cookies['privy_id_token'];
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const user = await verifyPrivySession(token as string);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

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
