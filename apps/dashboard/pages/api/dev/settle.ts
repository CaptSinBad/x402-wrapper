import type { NextApiRequest, NextApiResponse } from 'next';

// Dev-only settle simulator. This endpoint inserts a `settlements` row
// (the worker will pick it up) to simulate a facilitator settle webhook.
// It is intentionally gated by `DEV_SETTLE_ENABLED` to avoid accidental use in prod.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (String(process.env.DEV_SETTLE_ENABLED || '').toLowerCase() !== 'true') {
    return res.status(403).json({ error: 'dev_settle_disabled' });
  }

  const body = req.body;
  if (!body) return res.status(400).json({ error: 'missing_body' });

  // Expect at least a payment_attempt_id or an explicit settlement payload
  const attemptId = (body as any)?.payment_attempt_id || null;
  if (!attemptId) return res.status(400).json({ error: 'missing_payment_attempt_id' });

  try {
    // dynamic import so tests can mock the absolute module path
    const db = await import('../../../../lib/dbClient');

    // Insert a queued settlement (worker should process it). insertSettlement
    // is implemented to dedupe on payment_attempt_id via ON CONFLICT.
    const inserted = await db.insertSettlement({ payment_attempt_id: attemptId, facilitator_request: body, facilitator_response: null, status: 'queued' });

    try { await db.insertPaymentLog({ level: 'info', message: 'dev_settle_inserted', meta: { attemptId }, response: body }); } catch (e) { /* noop */ }

    // If caller requested immediate processing, trigger a single worker iteration.
    const processNow = Boolean((body as any)?.processNow === true || String((body as any)?.processNow || '').toLowerCase() === 'true');
    if (processNow) {
      try {
        // scripts/settlementWorker exports doOneIteration in CommonJS; import and call it.
        const worker = await import('../../../../../scripts/settlementWorker');
        if (worker && typeof worker.doOneIteration === 'function') {
          // run but don't await forever; await the iteration so the response reflects processing
          await worker.doOneIteration();
        }
      } catch (werr) {
        console.error('dev/settle worker run error', werr);
      }
    }

    return res.status(202).json({ ok: true, settlement: inserted });
  } catch (err: any) {
    console.error('dev/settle error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
