import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
// We'll dynamically import the DB client inside the handler so test suites
// can reliably mock the module path. See tests that mock the absolute
// filesystem path to `apps/lib/dbClient`.
import { FacilitatorVerifyRequest, FacilitatorSettleRequest } from '../../../../lib/validators';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Missing body' });

    // Webhook HMAC verification
    const secret = process.env.FACILITATOR_WEBHOOK_SECRET;
    if (!secret) {
      console.error('FACILITATOR_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'webhook_not_configured' });
    }

    // Accept common header names (case-insensitive)
    const sigHeader = (req.headers['x-hub-signature'] || req.headers['x-hub-signature-256'] || req.headers['x-signature'] || req.headers['x-facilitator-signature']) as string | undefined;
    if (!sigHeader) {
      return res.status(401).json({ error: 'missing_signature' });
    }

    // Compute HMAC over the serialized body. Many providers sign the raw request body; we use JSON.stringify(req.body)
    const raw = JSON.stringify(body);
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');

    // Header may include a prefix like `sha256=`. Normalize and compare in constant time.
    const headerVal = sigHeader.toString();
    const provided = headerVal.startsWith('sha256=') ? headerVal.split('=')[1] : headerVal;
    const providedBuffer = Buffer.from(provided, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const match = providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    if (!match) {
      return res.status(401).json({ error: 'invalid_signature' });
    }

  // Load DB client dynamically to make mocking in tests reliable.
  const db = await import('../../../../lib/dbClient');

  // Heuristic: prefer treating the callback as a settlement when it has an
    // explicit settlement indicator. This helps disambiguate payloads that
    // otherwise satisfy the same shape as a verify callback.
    const successFlagHeuristic = (body as any)?.isValid === true || (body as any)?.success === true || (body as any)?.status === 'confirmed' || (body as any)?.status === 'settled';
    const looksLikeSettle = successFlagHeuristic || Boolean((body as any)?.paymentRequirements && (body as any)?.paymentRequirements?.attempt_id);

  

    if (looksLikeSettle) {
      const s = FacilitatorSettleRequest.safeParse(body);
      if (s.success) {
        // Try to correlate with a payment_attempt and process reservations
        const attemptId = (body?.paymentRequirements as any)?.attempt_id || null;

  // determine success flag if present in facilitator payload
  const successFlag = (body as any)?.isValid === true || (body as any)?.success === true || (body as any)?.status === 'confirmed' || (body as any)?.status === 'settled';
  

        try {
          // enqueue settlement for worker to process; attach attemptId when known
          // avoid enqueueing duplicate settlements for the same payment_attempt (idempotency)
          let shouldInsert = true;
          if (attemptId) {
            try {
              const existing = await db.getOpenSettlementByPaymentAttempt(attemptId);
              if (existing) {
                shouldInsert = false;
              }
            } catch (e) {
              // if the check fails, fall back to inserting to avoid losing the event
              console.error('failed to check existing settlement for attempt', attemptId, e);
            }
          }
          if (shouldInsert) {
            await db.insertSettlement({ payment_attempt_id: attemptId || null, facilitator_request: body, facilitator_response: null, status: 'queued' });
          } else {
            try { await db.insertPaymentLog({ level: 'info', message: 'facilitator_settle_callback_duplicate', meta: { attemptId }, response: body }); } catch (e) { /* noop */ }
          }
        } catch (e) {
          console.error('failed to enqueue settlement from webhook', e);
        }

        // If we have a correlated payment attempt, update it and confirm/release reservations
        if (attemptId) {
            try {
              try { await db.updatePaymentAttemptStatus(attemptId, { verifier_response: body, status: successFlag ? 'verified' : 'failed' }); } catch (e) { /* noop */ }

            const attempt = await db.getPaymentAttemptById(attemptId);
            const reservations = attempt?.payment_payload?.reservations || attempt?.payment_payload?.reservation_ids || null;
            if (Array.isArray(reservations) && reservations.length > 0) {
              for (const rid of reservations) {
                try {
                  if (successFlag) {
                    try {
                      await db.confirmReservationAndCreateSale(rid, { payment_attempt_id: attemptId, settlement_id: null, purchaser_address: (body as any)?.payer || null });
                    } catch (innerErr) {
                      console.error('confirmReservationAndCreateSale error', rid, innerErr);
                      try { await db.confirmReservation(rid); } catch (e) { /* noop */ }
                    }
                  } else {
                    await db.releaseReservation(rid);
                  }
                } catch (err) {
                  console.error('reservation confirm/release error', rid, err);
                }
              }
            }
          } catch (e) {
            console.error('failed to process reservations for attempt', attemptId, e);
          }
        }

        try {
          await db.insertPaymentLog({ level: 'info', message: 'facilitator_settle_callback', meta: { attemptId: attemptId || null }, response: body });
        } catch (e) { /* noop */ }

        return res.status(200).json({ ok: true });
      }
      // If not matching settle schema, fall through to verify handling below.
    }

    // Try verify shape (fallback)
    const v = FacilitatorVerifyRequest.safeParse(body);
    
    if (v.success) {
      const endpointId = (body?.paymentRequirements as any)?.endpoint_id;
      const attemptId = (body?.paymentRequirements as any)?.attempt_id || null;

      // Update payment attempt record with verifier response
      try {
        if (attemptId) await db.updatePaymentAttemptStatus(attemptId, { verifier_response: body, status: (body as any)?.isValid ? 'verified' : 'failed' });
      } catch (e) { /* noop */ }

      try {
        await db.insertPaymentLog({ level: 'info', message: 'facilitator_verify_callback', meta: { endpointId, attemptId }, response: body });
      } catch (e) { /* noop */ }

      return res.status(200).json({ ok: true });
    }

    // If payload does not strictly match expected schemas but contains
    // known keys, accept for compatibility (useful for varied facilitator shapes).
    if (body && (body.paymentPayload || body.paymentRequirements)) {
      try {
        await db.insertPaymentLog({ level: 'warn', message: 'facilitator_callback_shape_mismatch', meta: {}, response: body });
      } catch (e) { /* noop */ }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unrecognized_payload' });
  } catch (err: any) {
    console.error('facilitator webhook error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
