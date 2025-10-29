import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyPrivySession } from '../../../lib/verifyPrivySession';
import { SellerEndpointBody } from '../../../lib/validators';

type Body = {
  endpointUrl: string;
  price: string | number;
  currency?: string;
  scheme?: string;
  network?: string;
  facilitatorUrl?: string;
  metadata?: Record<string, unknown>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase server env vars');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method === 'POST') {
    // Try to retrieve token from Authorization header or common cookie names
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token: string | undefined;
    if (authHeader && typeof authHeader === 'string') token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) token = req.cookies['privy-id-token'] || req.cookies['privy_id_token'];

    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    // Verify token server-side
    const user = await verifyPrivySession(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });


    // Validate request body with zod
    const parsed = SellerEndpointBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body', details: parsed.error.format() });
    }

    const body = parsed.data;

    try {
      const insertBody = {
        seller_wallet: (user as any)?.wallet?.address || null,
        endpoint_url: body.endpointUrl,
        price: typeof body.price === 'string' ? parseFloat(String(body.price)) : body.price,
        currency: body.currency || 'USDC',
        scheme: body.scheme || 'exact',
        network: body.network || 'base',
        facilitator_url: body.facilitatorUrl || process.env.NEXT_PUBLIC_FACILITATOR_URL,
        metadata: body.metadata || {}
      };

      const { data, error } = await supabase.from('seller_endpoints').insert([insertBody]).select();

      if (error) {
        console.error('Supabase insert error', error);
        return res.status(500).json({ error: error.message || 'DB insert failed' });
      }

      return res.status(201).json({ data });
    } catch (err: any) {
      console.error('seller_endpoints handler error', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'GET') {
    // Return endpoints for authenticated seller
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token: string | undefined;
    if (authHeader && typeof authHeader === 'string') token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) token = req.cookies['privy-id-token'] || req.cookies['privy_id_token'];

    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const user = await verifyPrivySession(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const sellerWallet = (user as any)?.wallet?.address;
    if (!sellerWallet) return res.status(400).json({ error: 'User has no wallet address' });

    try {
      const { data, error } = await supabase.from('seller_endpoints').select('*').eq('seller_wallet', sellerWallet);
      if (error) {
        console.error('Supabase fetch error', error);
        return res.status(500).json({ error: error.message || 'DB fetch failed' });
      }

      return res.status(200).json({ data });
    } catch (err: any) {
      console.error('seller_endpoints GET error', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
