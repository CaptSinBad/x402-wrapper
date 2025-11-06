import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyPrivySession } from '../../../lib/verifyPrivySession';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: 'Server misconfiguration' });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Authenticate seller via Privy token (cookie or Authorization header)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token: string | undefined;
  if (authHeader && typeof authHeader === 'string') token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) token = req.cookies['privy-id-token'] || req.cookies['privy_id_token'];
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const user = await verifyPrivySession(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  const sellerWallet = (user as any)?.wallet?.address;
  if (!sellerWallet) return res.status(400).json({ error: 'User has no wallet address' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { start_date, end_date, item_id, limit = '100', offset = '0', export: exportFmt } = req.query as any;

  // select sales rows. We now snapshot item_title at write-time, prefer it here for faster queries.
  let query = supabase.from('sales').select('*').eq('seller_id', sellerWallet).order('created_at', { ascending: false });
    if (item_id) query = query.eq('item_id', item_id);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);
    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data, error } = await query;
    if (error) {
      console.error('sales fetch error', error);
      return res.status(500).json({ error: error.message || 'DB fetch failed' });
    }

    // Rows already include `item_title` (snapshot) when the settlement worker persisted sales.
    const rows = (data || []).map((r: any) => ({ ...r, item_title: r.item_title ?? null }));

    if (exportFmt === 'csv') {
      // Build CSV
      const headers = ['id','item_id','item_title','reservation_id','payment_attempt_id','settlement_id','qty','amount_cents','currency','purchaser_address','created_at'];
      const csv = [headers.join(',')].concat(rows.map((r: any) => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sales_${sellerWallet}_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    return res.status(200).json({ data: rows });
  } catch (err: any) {
    console.error('sales handler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
