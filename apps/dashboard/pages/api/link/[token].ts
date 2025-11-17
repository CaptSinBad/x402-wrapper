import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: 'missing_token' });

  try {
    const db = await import('../../../../lib/dbClient');
    const link = await db.getPaymentLinkByToken(String(token));
    if (!link) return res.status(404).json({ error: 'not_found' });

    // Check if link has expired
    if (link.expires_at) {
      const expiresAt = new Date(link.expires_at);
      if (expiresAt <= new Date()) {
        return res.status(410).json({ error: 'link_expired', expires_at: link.expires_at });
      }
    }

    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, link });
    }

    if (req.method === 'POST') {
      // Create a payment attempt for this link. Support a persistent idempotency key
      // provided in the `Idempotency-Key` header. We store idempotency keys in the
      // `idempotency_keys` table and dedupe by (idempotency_key, seller_id).
      const idempotencyKey = String(req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || '').trim();
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const ua = req.headers['user-agent'] || null;

      const sellerId = link.seller_id || null;

      // If the caller provided an idempotency key, try to find an existing mapping
      if (idempotencyKey) {
        const existing = await db.getIdempotencyKey(idempotencyKey, sellerId);
        if (existing && existing.payment_attempt_id) {
          const existingAttempt = await db.getPaymentAttemptById(existing.payment_attempt_id);
          if (existingAttempt) return res.status(200).json({ ok: true, attempt: existingAttempt, idempotency: true });
        }
      }

      const attemptRec: any = {
        seller_endpoint_id: link.endpoint_id || null,
        payment_payload: {
          link_token: link.token,
          item_id: link.item_id || null,
          price_cents: link.price_cents || null,
          currency: link.currency || null,
          network: link.network || null,
          idempotency_key: idempotencyKey || null,
        },
        verifier_response: null,
        status: 'pending',
        client_ip: Array.isArray(ip) ? ip[0] : ip,
        user_agent: ua || null,
      };

      // Create the payment attempt first, then attempt to persist the idempotency mapping.
      // If a concurrent request wins the idempotency insert, we'll fetch the canonical attempt
      // and return that instead.
      const attempt = await db.insertPaymentAttempt(attemptRec);

      if (idempotencyKey) {
        const mapping = await db.createIdempotencyKey({ idempotency_key: idempotencyKey, seller_id: sellerId, payment_attempt_id: attempt.id });
        if (mapping && mapping.payment_attempt_id && mapping.payment_attempt_id !== attempt.id) {
          // Another concurrent request created the canonical attempt. Prefer that one.
          const canonical = await db.getPaymentAttemptById(mapping.payment_attempt_id);
          // Optionally mark the newly created attempt as duplicate/cancelled
          try { await db.updatePaymentAttemptStatus(attempt.id, { status: 'duplicate' }); } catch (e) { /* ignore */ }
          return res.status(200).json({ ok: true, attempt: canonical, idempotency: true });
        }
      }

      return res.status(201).json({ ok: true, attempt });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('link resolver error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
