import type { NextApiRequest, NextApiResponse } from 'next';
import { insertPaymentLog } from '../../../../lib/dbClient';
import { verify as facilitatorVerify } from '../../../../../core/facilitator';
import { FacilitatorVerifyRequest } from '../../../../lib/validators';

const FACILITATOR_BASE = process.env.FACILITATOR_URL || process.env.NEXT_PUBLIC_FACILITATOR_URL || 'https://facilitator.cdp.coinbase.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Missing body' });

    const parsed = FacilitatorVerifyRequest.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body', details: parsed.error.format() });
    }

    // Delegate to core facilitator client which handles timeouts/retries
    const json = await facilitatorVerify(parsed.data as any);

    // Log verification attempt into payment_logs (best-effort)
    try {
      await insertPaymentLog({
        endpoint_id: body?.paymentRequirements?.endpoint_id ?? null,
        payer_address: (json as any)?.payer ?? null,
        tx_hash: (json as any)?.txHash ?? null,
        amount: body?.paymentRequirements?.maxAmountRequired ?? null,
        asset: body?.paymentRequirements?.asset ?? null,
        network: body?.paymentRequirements?.network ?? null,
        success: (json as any)?.isValid === true,
        response: json,
      });
    } catch (logErr) {
      console.error('failed to write verify log', logErr);
    }

    return res.status(200).json(json);
  } catch (err) {
    console.error('facilitator verify error', err);
    return res.status(500).json({ isValid: false, invalidReason: 'server_error' });
  }
}
