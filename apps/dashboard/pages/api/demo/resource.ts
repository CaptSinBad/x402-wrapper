import type { NextApiRequest, NextApiResponse } from 'next';

// Simple demo resource that returns 402 with payment requirements when no X-PAYMENT header
// If X-PAYMENT header present and decodable JSON, treat as valid and return the protected resource.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const resourcePath = '/api/demo/resource';

  const xPaymentHeader = req.headers['x-payment'] as string | undefined;
  if (!xPaymentHeader) {
    const paymentRequirements = {
      x402Version: 1,
      accepts: [
        {
          scheme: 'exact',
          network: 'base',
          maxAmountRequired: '1000000',
          resource: resourcePath,
          description: 'Demo protected resource',
          mimeType: 'application/json',
          payTo: '0xDEMO0000000000000000000000000000000000',
          facilitatorUrl: '/api/facilitator/verify',
          asset: 'USDC',
          extra: {},
        },
      ],
    };

    return res.status(402).json(paymentRequirements);
  }

  // Try to decode header
  try {
    const decoded = Buffer.from(xPaymentHeader, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    // Basic shape check
    if (parsed && parsed.payload && parsed.payload.signature) {
      return res.status(200).json({ success: true, message: 'Demo payment accepted', parsed });
    }
    return res.status(402).json({ error: 'invalid_payment' });
  } catch (err) {
    return res.status(400).json({ error: 'invalid_header', detail: String(err) });
  }
}
