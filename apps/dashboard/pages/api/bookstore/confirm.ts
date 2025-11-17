import type { NextApiRequest, NextApiResponse } from 'next';
import { verify } from '../../../../../core/facilitator';

/**
 * Bookstore payment confirmation endpoint
 * Protected by x402 payment middleware
 * Called after wallet signs the payment
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Extract the payment header
    const paymentHeader = req.headers['x-payment'];
    
    if (!paymentHeader) {
      console.error('[bookstore/confirm] Missing X-PAYMENT header');
      return res.status(402).json({
        error: 'payment_required',
        message: 'X-PAYMENT header required',
      });
    }

    // Decode the payment header
    let paymentData;
    try {
      console.log('[bookstore/confirm] Decoding payment header...');
      paymentData = JSON.parse(Buffer.from(paymentHeader as string, 'base64').toString());
      console.log('[bookstore/confirm] Decoded header successfully');
    } catch (err) {
      console.error('[bookstore/confirm] Failed to decode payment header:', err);
      return res.status(400).json({ error: 'invalid_payment_header', details: String(err) });
    }

    const { paymentPayload, paymentRequirements } = paymentData;
    console.log('[bookstore/confirm] Verifying payment with facilitator...');

    // Verify payment with facilitator
    const verifyRes = await verify({
      paymentPayload,
      paymentRequirements,
    });

    console.log('[bookstore/confirm] Verification result:', verifyRes);

    if (!verifyRes.isValid) {
      console.error('[bookstore/confirm] Payment verification failed:', verifyRes.invalidReason);
      return res.status(402).json({
        error: 'payment_verification_failed',
        invalidReason: verifyRes.invalidReason,
      });
    }

    // Payment verified! Return the protected resource (order confirmation)
    const { items, total } = req.body;

    console.log('[bookstore/confirm] Payment verified! Creating order...');
    return res.status(200).json({
      success: true,
      orderId: `ORDER-${Date.now()}`,
      items,
      total,
      message: 'Thank you for your purchase!',
      txHash: verifyRes.txHash,
    });
  } catch (err: any) {
    console.error('[bookstore/confirm] Error:', err);
    return res.status(500).json({
      error: 'internal_error',
      message: err?.message || 'Payment verification failed',
      details: String(err),
    });
  }
}
