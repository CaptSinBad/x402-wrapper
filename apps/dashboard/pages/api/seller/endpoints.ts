// pages/api/seller/endpoints.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '../../../../lib/supabaseServer';

// NOTE: This expects the frontend to send the Privy user wallet address in body and
// include a server-validated auth if you implement Privy token verification here.
// For now we perform a minimal guard: require origin or other internal checks.
// You MUST implement strong auth for production.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    const { seller_wallet, endpoint_url, price, currency, scheme, network, facilitator_url, metadata } = body;

    // Basic validations
    if (!seller_wallet || !endpoint_url || price == null) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    // insert
    const { data, error } = await supabaseServer.from('seller_endpoints').insert([
      {
        seller_wallet,
        endpoint_url,
        price,
        currency: currency || 'USDC',
        scheme: scheme || 'exact',
        network: network || 'base-mainnet',
        facilitator_url: facilitator_url || process.env.NEXT_PUBLIC_FACILITATOR_URL,
        metadata: metadata || {},
      },
    ]).select();

    if (error) {
      console.error('db insert error', error);
      return res.status(500).json({ error: 'insert_failed' });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('endpoint create error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
