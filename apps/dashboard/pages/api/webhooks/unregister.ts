import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';

type SuccessResponse = {
  message: string;
};

type ErrorResponse = {
  error: string;
  code: string;
};

/**
 * POST /api/webhooks/unregister
 * Unregister (delete) a webhook subscription
 * 
 * Request body:
 * {
 *   webhook_subscription_id: string;  // ID of webhook to delete
 * }
 * 
 * Response:
 * {
 *   message: "Webhook unregistered successfully"
 * }
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // Get seller ID from requireSellerAuth middleware
    const sellerWallet = (req as any).sellerWallet as string | undefined;
    if (!sellerWallet) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    const { webhook_subscription_id } = req.body;

    if (!webhook_subscription_id || typeof webhook_subscription_id !== 'string') {
      return res.status(400).json({
        error: 'webhook_subscription_id is required',
        code: 'MISSING_ID',
      });
    }

    const db = await import('../../../../lib/dbClient');

    // Verify the webhook belongs to this seller
    const subscription = await db.getWebhookSubscription(webhook_subscription_id);
    if (!subscription) {
      return res.status(404).json({
        error: 'Webhook subscription not found',
        code: 'NOT_FOUND',
      });
    }

    if (subscription.seller_id !== sellerWallet) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'FORBIDDEN',
      });
    }

    // Delete the subscription
    await db.deleteWebhookSubscription(webhook_subscription_id);

    return res.status(200).json({
      message: 'Webhook unregistered successfully',
    });
  } catch (error: any) {
    console.error('Error unregistering webhook:', error);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

export default requireSellerAuth(handler as any) as any;
