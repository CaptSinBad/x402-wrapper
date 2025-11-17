import type { NextApiRequest, NextApiResponse } from 'next';
import requirePayment from '../../../lib/paymentMiddleware';

/**
 * Protected API resource endpoint for demo/testing purposes.
 * 
 * This endpoint requires payment via x402 protocol.
 * If accessed without payment, returns HTTP 402 with payment requirements.
 * If accessed with valid payment proof, returns the protected resource.
 */

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // At this point, payment middleware has already validated the payment
  // (if required) and attached verification result to request.paymentVerify
  
  const paymentVerify = (req as any).paymentVerify;
  
  return res.status(200).json({
    protected: true,
    message: 'Access to protected resource granted',
    verified_payer: paymentVerify?.payer || null,
    resource_data: {
      title: 'Premium Content',
      description: 'This is a protected resource that required payment to access',
      timestamp: new Date().toISOString(),
    },
  });
}

export default requirePayment(handler as any);
