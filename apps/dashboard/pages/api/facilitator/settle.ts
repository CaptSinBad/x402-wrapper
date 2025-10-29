import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '../../../../lib/supabaseServer';
import { settle as facilitatorSettle } from '../../../../../core/facilitator';
import { FacilitatorSettleRequest } from '../../../../lib/validators';

const FACILITATOR_BASE = process.env.FACILITATOR_URL || process.env.NEXT_PUBLIC_FACILITATOR_URL || 'https://facilitator.cdp.coinbase.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Missing body' });

    const parsed = FacilitatorSettleRequest.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body', details: parsed.error.format() });
    }

    const json = await facilitatorSettle(parsed.data as any);

    // Log settlement attempt
    try {
      await supabaseServer.from('payment_logs').insert([
        {
          endpoint_id: body?.paymentRequirements?.endpoint_id ?? null,
          payer_address: (json as any)?.payer ?? null,
          tx_hash: (json as any)?.txHash ?? null,
          amount: body?.paymentRequirements?.maxAmountRequired ?? null,
          asset: body?.paymentRequirements?.asset ?? null,
          network: body?.paymentRequirements?.network ?? null,
          success: (json as any)?.success === true,
          response: json,
        },
      ]);
    } catch (logErr) {
      console.error('failed to write settle log', logErr);
    }

    return res.status(200).json(json);
  } catch (err) {
    console.error('facilitator settle error', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}
