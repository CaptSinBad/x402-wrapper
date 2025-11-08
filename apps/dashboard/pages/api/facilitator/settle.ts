import type { NextApiRequest, NextApiResponse } from 'next';
import { insertSettlement, insertPaymentLog, getOpenSettlementByPaymentAttempt } from '../../../../lib/dbClient';
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

    // Enqueue settlement record for background worker to process. This avoids
    // doing on-request external network calls and provides retries/observability.
    try {
      // Deduplicate: if the parsed data includes a payment attempt id and
      // there is already an open settlement for that attempt, avoid enqueueing again.
      const attemptId = (parsed.data as any)?.paymentRequirements?.attempt_id || null;
      let shouldInsert = true;
      if (attemptId) {
        try {
          const existing = await getOpenSettlementByPaymentAttempt(attemptId);
          if (existing) {
            shouldInsert = false;
          }
        } catch (e) {
          console.error('failed to check existing settlement for attempt', attemptId, e);
        }
      }

      if (!shouldInsert) {
        try { await insertPaymentLog({ level: 'info', message: 'facilitator_settle_callback_duplicate', meta: { attemptId }, response: parsed.data }); } catch (e) { /* noop */ }
        return res.status(200).json({ success: true, queued: false, message: 'duplicate' });
      }

      const created = await insertSettlement({
        payment_attempt_id: null,
        facilitator_request: parsed.data,
        facilitator_response: null,
        status: 'queued',
        attempts: 0,
      });
      return res.status(202).json({ success: true, queued: true, settlement: created });
    } catch (dbErr) {
      console.error('failed to enqueue settlement', dbErr);
      return res.status(500).json({ success: false, error: 'enqueue_failed' });
    }
  } catch (err) {
    console.error('facilitator settle error', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}
