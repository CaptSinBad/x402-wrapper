import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { updatePaymentAttemptStatus, insertSettlement, insertPaymentLog, getPaymentAttemptById, confirmReservation, releaseReservation } from '../../../../lib/dbClient';
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

    // Try verify shape
    const v = FacilitatorVerifyRequest.safeParse(body);
    if (v.success) {
      const endpointId = (body?.paymentRequirements as any)?.endpoint_id;
      const attemptId = (body?.paymentRequirements as any)?.attempt_id || null;

      // Update payment attempt record with verifier response
      try {
        if (attemptId) await updatePaymentAttemptStatus(attemptId, { verifier_response: body, status: (body as any)?.isValid ? 'verified' : 'failed' });
      } catch (e) { /* noop */ }

      try {
        await insertPaymentLog({ level: 'info', message: 'facilitator_verify_callback', meta: { endpointId, attemptId }, response: body });
      } catch (e) { /* noop */ }

      return res.status(200).json({ ok: true });
    }

    const s = FacilitatorSettleRequest.safeParse(body);
    if (s.success) {
      // Try to correlate with a payment_attempt and process reservations
      const attemptId = (body?.paymentRequirements as any)?.attempt_id || null;
      // determine success flag if present in facilitator payload
      const successFlag = (body as any)?.isValid === true || (body as any)?.success === true || (body as any)?.status === 'confirmed' || (body as any)?.status === 'settled';

      try {
        // enqueue settlement for worker to process; attach attemptId when known
        await insertSettlement({ payment_attempt_id: attemptId || null, facilitator_request: body, facilitator_response: null, status: 'queued' });
      } catch (e) {
        console.error('failed to enqueue settlement from webhook', e);
      }

      // If we have a correlated payment attempt, update it and confirm/release reservations
      if (attemptId) {
        try {
          // update payment attempt status to verified/settled
          await updatePaymentAttemptStatus(attemptId, { verifier_response: body, status: successFlag ? 'verified' : 'failed' });
        } catch (e) { /* noop */ }

        try {
          const attempt = await getPaymentAttemptById(attemptId);
          const reservations = attempt?.payment_payload?.reservations || attempt?.payment_payload?.reservation_ids || null;
          if (Array.isArray(reservations) && reservations.length > 0) {
            for (const rid of reservations) {
              try {
                if (successFlag) {
                  await confirmReservation(rid);
                } else {
                  await releaseReservation(rid);
                }
              } catch (err) {
                // log and continue
                console.error('reservation confirm/release error', rid, err);
              }
            }
          }
        } catch (e) {
          console.error('failed to process reservations for attempt', attemptId, e);
        }
      }

      try {
        await insertPaymentLog({ level: 'info', message: 'facilitator_settle_callback', meta: { attemptId: attemptId || null }, response: body });
      } catch (e) { /* noop */ }

      return res.status(200).json({ ok: true });
    }

    // If payload does not strictly match expected schemas but contains
    // known keys, accept for compatibility (useful for varied facilitator shapes).
    if (body && (body.paymentPayload || body.paymentRequirements)) {
      try {
        await insertPaymentLog({ level: 'warn', message: 'facilitator_callback_shape_mismatch', meta: {}, response: body });
      } catch (e) { /* noop */ }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unrecognized_payload' });
  } catch (err: any) {
    console.error('facilitator webhook error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
