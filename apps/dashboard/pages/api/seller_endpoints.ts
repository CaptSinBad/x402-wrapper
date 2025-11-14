import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireSellerAuth } from '../../../lib/requireSellerAuth';
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase server env vars');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method === 'POST') {
    // Validate request body with zod
    const parsed = SellerEndpointBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body', details: parsed.error.format() });
    }

    const body = parsed.data;

    try {
      // sellerWallet is attached by requireSellerAuth
      const sellerWallet = (req as any).sellerWallet || null;
      const insertBody = {
        seller_wallet: sellerWallet,
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
    // sellerWallet is attached by requireSellerAuth
    const sellerWallet = (req as any).sellerWallet;
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

export default requireSellerAuth(handler);
