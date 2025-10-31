import type { NextApiRequest, NextApiResponse } from 'next';
import { updatePaymentAttemptStatus, insertSettlement, insertPaymentLog } from '../../../../lib/dbClient';
import { FacilitatorVerifyRequest, FacilitatorSettleRequest } from '../../../../lib/validators';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Missing body' });

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

    return res.status(400).json({ error: 'unrecognized_payload' });
  } catch (err: any) {
    console.error('facilitator webhook error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
