import type { NextApiRequest, NextApiResponse } from 'next';

// Dev-only settle helper. Gated by DEV_SETTLE_ENABLED=true or NODE_ENV=development.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const enabled = (process.env.DEV_SETTLE_ENABLED === 'true') || (process.env.NODE_ENV === 'development');
  if (!enabled) return res.status(403).json({ error: 'dev_settle_disabled' });

  try {
    const body = req.body || {};
    const attemptId = body?.payment_attempt_id;
    const mode = body?.mode || 'direct'; // 'direct' | 'worker'
    if (!attemptId || typeof attemptId !== 'string') return res.status(400).json({ error: 'missing_payment_attempt_id' });

    // load DB client dynamically (tests rely on this path for mocking)
    const db = await import('../../../../lib/dbClient');

    const attempt = await db.getPaymentAttemptById(attemptId);
    if (!attempt) return res.status(404).json({ error: 'payment_attempt_not_found' });

    if (mode === 'worker') {
      // enqueue a settlement row for the worker to pick up
      const created = await db.insertSettlement({ payment_attempt_id: attemptId, facilitator_request: { dev: true, triggered_by: 'dev-settle' }, status: 'queued' });
      return res.status(200).json({ ok: true, mode: 'worker', settlement: created });
    }

    // default: direct mode — immediately confirm reservations associated with the attempt
    const payload = attempt.payment_payload || {};
    const reservations = payload.reservations || payload.reservation_ids || payload.reservations_ids || null;
    if (!Array.isArray(reservations) || reservations.length === 0) {
      return res.status(400).json({ error: 'no_reservations_found_on_attempt' });
    }

    const results: Array<any> = [];
    for (const rid of reservations) {
      try {
        const sale = await db.confirmReservationAndCreateSale(rid, { payment_attempt_id: attemptId, settlement_id: null, purchaser_address: payload?.purchaser_address || null });
        results.push({ reservation: rid, ok: true, sale: sale || null });
      } catch (err: any) {
        // try to at least mark reservation confirmed if confirm+sale fails
        try { await db.confirmReservation(rid); } catch (e) { /* noop */ }
        results.push({ reservation: rid, ok: false, error: err?.message || String(err) });
      }
    }

    return res.status(200).json({ ok: true, mode: 'direct', attemptId, results });
  } catch (err: any) {
    console.error('dev-settle error', err);
    return res.status(500).json({ error: 'server_error', detail: err?.message || String(err) });
  }
}
