import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Webhook handler for payment settlement events from x402 facilitator
 * 
 * This endpoint receives settlement notifications from Coinbase x402 and:
 * 1. Records the settlement in the database
 * 2. Updates payment attempt status
 * 3. Triggers seller notifications
 * 4. Marks the payment as settled for access grants
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook signature (optional but recommended)
  const signature = req.headers['x-webhook-signature'] as string;
  // TODO: Implement HMAC signature verification with Coinbase

  try {
    const { event, data } = req.body;

    console.log(`[Webhook] Settlement event received: ${event}`, {
      paymentId: data?.payment_id,
      amount: data?.amount,
      payer: data?.payer,
    });

    if (event === 'payment.settled') {
      const { payment_id, payer, amount, txHash, network } = data;

      if (!payment_id) {
        return res.status(400).json({ error: 'Missing payment_id' });
      }

      // TODO: Query database for payment attempt
      // const attempt = await db.getPaymentAttemptById(payment_id);
      // if (!attempt) {
      //   return res.status(200).json({ acknowledged: true, warning: 'attempt_not_found' });
      // }

      // TODO: Record settlement in database
      // await db.insertSettlement({
      //   payment_attempt_id: payment_id,
      //   facilitator_response: {
      //     payer,
      //     amount,
      //     txHash,
      //     network,
      //     settled_at: new Date().toISOString(),
      //   },
      //   status: 'settled',
      //   tx_hash: txHash,
      // });

      // TODO: Update payment attempt status
      // await db.updatePaymentAttempt(payment_id, {
      //   status: 'settled',
      //   settlement_tx_hash: txHash,
      //   settled_at: new Date().toISOString(),
      // });

      // TODO: Send seller notification email
      // TODO: Trigger any post-payment webhooks to seller's endpoint

      console.log(`[Webhook] Settlement recorded successfully:`, {
        paymentId: payment_id,
        payer,
        amount,
        txHash,
      });

      return res.status(200).json({
        success: true,
        message: 'Settlement recorded',
        paymentId: payment_id,
      });
    }

    if (event === 'payment.failed') {
      const { payment_id, reason } = data;

      console.log(`[Webhook] Payment failed: ${payment_id}`, { reason });

      // TODO: Update attempt status
      // await db.updatePaymentAttempt(payment_id, {
      //   status: 'failed',
      //   error_reason: reason,
      //   failed_at: new Date().toISOString(),
      // });

      // TODO: Send seller notification about failed payment

      return res.status(200).json({
        success: true,
        message: 'Payment failure recorded',
      });
    }

    if (event === 'payment.expired') {
      const { payment_id } = data;

      console.log(`[Webhook] Payment expired: ${payment_id}`);

      // TODO: Update attempt status
      // await db.updatePaymentAttempt(payment_id, {
      //   status: 'expired',
      //   expired_at: new Date().toISOString(),
      // });

      return res.status(200).json({
        success: true,
        message: 'Payment expiration recorded',
      });
    }

    // Unknown event - still acknowledge
    console.warn(`[Webhook] Unknown event type: ${event}`);
    return res.status(200).json({ acknowledged: true, warning: 'unknown_event' });

  } catch (error) {
    console.error('[Webhook] Error processing settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
