// pages/api/resource/[...slug].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSellerEndpointByUrl } from '../../../../lib/dbClient';

const FACILITATOR_PROXY = process.env.NEXT_PUBLIC_FACILITATOR_URL
  ? '/api/facilitator/verify'
  : '/api/facilitator/verify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = (req.query.slug as string[]) || [];
  const resourcePath = '/' + slug.join('/');

  // Look up a registered endpoint for this resource
  const endpoint = await getSellerEndpointByUrl(resourcePath);
  if (!endpoint) return res.status(404).json({ error: 'not_found' });

  // If payment header missing -> return 402 + PaymentRequirements
  const xPaymentHeader = req.headers['x-payment'] as string | undefined;
  if (!xPaymentHeader) {
    // Ensure atomic units for USDC on Base (6 decimals)
    const amountAtomic = String(Math.round(Number(endpoint.price) * 1_000_000));
    const paymentRequirements = {
      x402Version: 1,
      accepts: [
        {
          scheme: endpoint.scheme,
          network: endpoint.network,
          maxAmountRequired: amountAtomic,
          resource: resourcePath,
          description: endpoint.metadata?.description || `Access ${resourcePath}`,
          mimeType: endpoint.metadata?.mimeType || 'application/json',
          payTo: endpoint.seller_wallet,
          facilitatorUrl: endpoint.facilitator_url || process.env.NEXT_PUBLIC_FACILITATOR_URL,
          asset: endpoint.metadata?.asset || null,
          extra: endpoint.metadata?.extra || {},
        },
      ],
    };
    return res.status(402).json(paymentRequirements);
  }

  // verify with our server-side facilitator proxy
  try {
    const verifyResp = await fetch(`${process.env.NEXT_PUBLIC_SITE_ORIGIN || ''}${FACILITATOR_PROXY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 1,
        paymentHeader: xPaymentHeader,
        paymentRequirements: {
          scheme: endpoint.scheme,
          network: endpoint.network,
          payTo: endpoint.seller_wallet,
          resource: resourcePath,
          maxAmountRequired: String(Math.round(Number(endpoint.price) * 1_000_000)),
          asset: endpoint.metadata?.asset || null,
          extra: {},
          endpoint_id: endpoint.id,
        },
      }),
    });

    const verifyJson = await verifyResp.json();
    if (!verifyJson.isValid) {
      return res.status(402).json({ error: 'invalid_payment', reason: verifyJson.invalidReason || null, detail: verifyJson });
    }

    // Payment valid -> optionally trigger settlement via /api/facilitator/settle
    // We call settle server-side so facilitator has authority to submit tx to chain.
    // Post-settlement is optional if facilitator auto-settles. We'll attempt to settle and log result.
    try {
      const settleResp = await fetch('/api/facilitator/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x402Version: 1,
          paymentHeader: xPaymentHeader,
          paymentRequirements: {
            scheme: endpoint.scheme,
            network: endpoint.network,
            payTo: endpoint.seller_wallet,
            resource: resourcePath,
            maxAmountRequired: String(Math.round(Number(endpoint.price) * 1_000_000)),
            asset: endpoint.metadata?.asset || null,
            endpoint_id: endpoint.id,
          },
        }),
      });

      const settleJson = await settleResp.json();
      // We don't fail the request if settlement is delayed; return resource immediately.
      console.info('settle result', settleJson);
    } catch (settleErr) {
      console.error('settle call failed', settleErr);
    }

    // Return the actual resource. For demo: return JSON; replace with real resource payload.
    return res.status(200).json({
      success: true,
      message: `Payment verified for ${resourcePath}`,
      meta: {
        seller: endpoint.seller_wallet,
        endpoint_id: endpoint.id,
      },
    });
  } catch (err) {
    console.error('verify error', err);
    return res.status(500).json({ error: 'verify_failed' });
  }
}
