import type { NextApiRequest, NextApiResponse } from 'next';
import { getSellerEndpointByUrl, getSellerEndpointById, insertPaymentAttempt, insertPaymentLog } from '../../../lib/dbClient';
import { PaymentRequirementsSchema } from '../../../lib/validators';
import { loadFacilitatorConfig } from '../../../../core/facilitator/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const { endpoint_id, endpoint_url, client_ip } = body;

    let endpoint: any = null;
    if (endpoint_id) endpoint = await getSellerEndpointById(endpoint_id);
    else if (endpoint_url) endpoint = await getSellerEndpointByUrl(endpoint_url);

    if (!endpoint) return res.status(404).json({ error: 'endpoint_not_found' });

    // Build paymentRequirements according to x402 expected shape
    const facilitatorCfg = loadFacilitatorConfig();
    const facilitatorBase = endpoint.facilitator_url || process.env.FACILITATOR_URL || facilitatorCfg.baseUrl;

    const payToVal = (endpoint.metadata && endpoint.metadata.payTo) || process.env.SELLER_ADDRESS;

    const paymentRequirements = {
      x402Version: 1,
      scheme: endpoint.scheme || 'exact',
      network: endpoint.network || process.env.NETWORK || 'unknown',
      maxAmountRequired: String(endpoint.price ?? '0'),
      resource: endpoint.endpoint_url,
      description: (endpoint.metadata && endpoint.metadata.description) || `Payment to access ${endpoint.endpoint_url}`,
      mimeType: 'application/json',
      payTo: payToVal || undefined,
      maxTimeoutSeconds: Number(process.env.PAYMENT_MAX_TIMEOUT || 60),
      asset: endpoint.currency || 'USDC',
      extra: endpoint.metadata || {},
      endpoint_id: endpoint.id,
      facilitatorUrl: facilitatorBase,
    };

    // validate shape
    const parsed = PaymentRequirementsSchema.safeParse(paymentRequirements);
    if (!parsed.success) {
      console.error('Invalid paymentRequirements built', parsed.error.format());
      return res.status(500).json({ error: 'invalid_payment_requirements' });
    }

  // create a payment_attempt record (pending) for audit/tracking
  const attempt = await insertPaymentAttempt({ seller_endpoint_id: endpoint.id, payment_payload: null, verifier_response: null, status: 'pending', client_ip: client_ip || (req.headers['x-forwarded-for'] || req.socket.remoteAddress), user_agent: req.headers['user-agent'] || null });

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
