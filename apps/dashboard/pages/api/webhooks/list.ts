import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';

type WebhookSubscription = {
  webhook_subscription_id: string;
  url: string;
  events: string[] | null;
  active: boolean;
  created_at: string;
  last_delivered_at: string | null;
};

type ErrorResponse = {
  error: string;
  code: string;
};

/**
 * GET /api/webhooks/list
 * List all webhook subscriptions for the authenticated seller
 * 
 * Query parameters:
 * - active: boolean (optional) - Filter to only active/inactive webhooks
 * 
 * Response:
 * [
 *   {
 *     webhook_subscription_id: string;
 *     url: string;
 *     events: string[] | null;    // null means subscribed to all events
 *     active: boolean;
 *     created_at: string;
 *     last_delivered_at: string | null;
 *   },
 *   ...
 * ]
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookSubscription[] | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // Get seller ID from requireSellerAuth middleware
    const sellerWallet = (req as any).sellerWallet as string | undefined;
    if (!sellerWallet) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    const db = await import('../../../../lib/dbClient');
    const subscriptions = await db.listWebhookSubscriptions(sellerWallet);

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json([]);
    }

    // Parse events array if it's a string (from Postgres)
    const formatted = subscriptions.map((sub: any) => ({
      webhook_subscription_id: sub.id,
      url: sub.url,
      events: typeof sub.events === 'string' ? JSON.parse(sub.events) : sub.events,
      active: sub.active,
      created_at: sub.created_at,
      last_delivered_at: sub.last_delivered_at,
    }));

    // Optional: filter by active status
    const { active } = req.query;
    if (typeof active === 'string') {
      const filterActive = active.toLowerCase() === 'true';
      return res.status(200).json(
        formatted.filter((s: WebhookSubscription) => s.active === filterActive)
      );
    }

    return res.status(200).json(formatted);
  } catch (error: any) {
    console.error('Error listing webhooks:', error);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

export default requireSellerAuth(handler as any) as any;
