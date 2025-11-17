import type { NextApiRequest, NextApiResponse } from 'next';
import { getSellerEndpointByUrl, getSellerEndpointById, insertPaymentAttempt, insertPaymentLog, getStoreItemById, reserveItem, releaseReservation } from '../../../lib/dbClient';
import { PaymentRequirementsSchema } from '../../../lib/validators';
import { loadFacilitatorConfig } from '../../../../core/facilitator/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const { endpoint_id, endpoint_url, client_ip } = body;

    // Validate that at least one identifier is provided
    if (!endpoint_id && !endpoint_url) {
      return res.status(400).json({ error: 'missing_endpoint_identifier', detail: 'Provide either endpoint_id or endpoint_url' });
    }

    let endpoint: any = null;
    if (endpoint_id) endpoint = await getSellerEndpointById(endpoint_id);
    else if (endpoint_url) endpoint = await getSellerEndpointByUrl(endpoint_url);

    if (!endpoint) return res.status(404).json({ error: 'endpoint_not_found' });

    // Validate endpoint has required fields
    if (!endpoint.price && (!Array.isArray(body.items) || body.items.length === 0)) {
      return res.status(400).json({ error: 'invalid_endpoint', detail: 'Endpoint has no price and no items provided' });
    }

    // Build paymentRequirements according to x402 expected shape
    const facilitatorCfg = loadFacilitatorConfig();
    const facilitatorBase = endpoint.facilitator_url || process.env.FACILITATOR_URL || facilitatorCfg.baseUrl;

    const payToVal = (endpoint.metadata && endpoint.metadata.payTo) || process.env.SELLER_ADDRESS;

    let totalAmount = endpoint.price ?? 0;
    const items = body.items || [];

    // If buyer provided items (cart), compute total and attempt to reserve stock
    const reservations: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      totalAmount = 0;
      try {
        for (const it of items) {
          const item = await getStoreItemById(it.item_id);
          if (!item) return res.status(404).json({ error: 'item_not_found' });
          const qty = Number(it.qty || 1);
          if (item.stock < qty) return res.status(409).json({ error: 'insufficient_stock', item_id: item.id });
          const reservation = await reserveItem({ item_id: item.id, seller_id: item.seller_id, qty, ttlSeconds: Number(process.env.RESERVATION_TTL || 900) });
          reservations.push(reservation);
          totalAmount += (Number(item.price_cents || item.price || 0) * qty);
        }
      } catch (err: any) {
        // release any reservations we successfully created
        for (const r of reservations) {
          try { await releaseReservation(r.id); } catch (e) { /* ignore */ }
        }
        console.error('reservation_error', err);
        return res.status(500).json({ error: 'reservation_failed' });
      }
    }

    const paymentRequirements = {
      x402Version: 1,
      scheme: endpoint.scheme || 'exact',
      network: endpoint.network || process.env.NETWORK || 'unknown',
  // maxAmountRequired expressed in atomic units as string
  maxAmountRequired: String(totalAmount ?? endpoint.price ?? '0'),
      resource: endpoint.endpoint_url,
      description: (endpoint.metadata && endpoint.metadata.description) || `Payment to access ${endpoint.endpoint_url}`,
      mimeType: 'application/json',
      payTo: payToVal || undefined,
      maxTimeoutSeconds: Number(process.env.PAYMENT_MAX_TIMEOUT || 60),
      asset: endpoint.currency || 'USDC',
      extra: endpoint.metadata || {},
      // pricing metadata to support per-request, one-time, and subscription models
      pricing: {
        pricing_type: endpoint.pricing_type || 'per_request',
        billing_interval: endpoint.billing_interval || null,
        billing_amount: endpoint.billing_amount != null ? String(endpoint.billing_amount) : null,
      },
      endpoint_id: endpoint.id,
      facilitatorUrl: facilitatorBase,
    };

    // attach items/reservations metadata if present
    if (reservations.length > 0) {
      (paymentRequirements as any).items = items;
      (paymentRequirements as any).reservations = reservations.map(r => ({ id: r.id, item_id: r.item_id, qty_reserved: r.qty_reserved, expires_at: r.expires_at }));
    }

    // validate shape
    const parsed = PaymentRequirementsSchema.safeParse(paymentRequirements);
    if (!parsed.success) {
      console.error('Invalid paymentRequirements built', parsed.error.format());
      return res.status(500).json({ error: 'invalid_payment_requirements' });
    }

  // create a payment_attempt record (pending) for audit/tracking
  const attemptPayload: any = { items: body.items || null, reservations: reservations.length ? reservations.map(r => r.id) : null };
  const attempt = await insertPaymentAttempt({ seller_endpoint_id: endpoint.id, payment_payload: attemptPayload, verifier_response: null, status: 'pending', client_ip: client_ip || (req.headers['x-forwarded-for'] || req.socket.remoteAddress), user_agent: req.headers['user-agent'] || null });

  // attach attempt id to returned requirements so webhooks/clients can correlate
  (parsed.data as any).attempt_id = attempt.id;

    // log
    try {
      await insertPaymentLog({ level: 'info', message: 'created_payment_attempt', meta: { endpoint_id: endpoint.id, attempt_id: attempt.id }, endpoint_id: endpoint.id });
    } catch (e) {
      // non-fatal
    }

    return res.status(201).json({ paymentRequirements: parsed.data, paymentAttempt: attempt });
  } catch (err: any) {
    console.error('create_payment_session error', err);
    // During tests provide the error detail to help debugging
  if (process.env.VITEST || process.env.NODE_ENV === 'test') return res.status(500).json({ error: 'server_error', detail: String(err && (err.stack || err.message || err)) });
    return res.status(500).json({ error: 'server_error' });
  }
}
