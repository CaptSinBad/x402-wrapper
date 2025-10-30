import type { NextApiRequest, NextApiResponse } from 'next';
import requirePayment from '../../../../../lib/paymentMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // At this point the payment middleware has validated payment and attached verify result
  // (if needed) on the request. We simply return the protected payload.
  return res.status(200).json({ protected: true, message: 'This is a paid resource' });
}

export default requirePayment(handler as any);
