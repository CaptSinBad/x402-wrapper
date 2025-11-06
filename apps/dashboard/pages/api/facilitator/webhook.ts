import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { updatePaymentAttemptStatus, insertSettlement, insertPaymentLog } from '../../../../lib/dbClient';
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
      // Enqueue settlement for worker to process
      try {
        await insertSettlement({ payment_attempt_id: null, facilitator_request: body, facilitator_response: null, status: 'queued' });
      } catch (e) {
        console.error('failed to enqueue settlement from webhook', e);
      }

      try {
        await insertPaymentLog({ level: 'info', message: 'facilitator_settle_callback', meta: {}, response: body });
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
