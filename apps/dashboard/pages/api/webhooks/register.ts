import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSellerAuth } from '../../../../lib/requireSellerAuth';
import crypto from 'crypto';

type ErrorResponse = {
  error: string;
  code: string;
};

type SuccessResponse = {
  webhook_subscription_id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
};

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

    const { url, events, active = true } = req.body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required', code: 'MISSING_URL' });
    }

    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'https:') {
        return res.status(400).json({ 
          error: 'Webhook URL must use HTTPS', 
          code: 'INVALID_PROTOCOL' 
        });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Invalid URL format', code: 'INVALID_URL' });
    }

    // Validate events array if provided
    let eventList: string[] | null = null;
    const VALID_EVENTS = [
      'payment.attempt_created',
      'payment.completed',
      'settlement.confirmed',
      'settlement.failed',
      'payout.created',
      'payout.completed',
      'payout.failed',
      'link.expired',
      'reservation.created',
      'reservation.released',
      'reservation.claimed',
    ];

    if (Array.isArray(events)) {
      // Verify all events are valid
      const invalidEvents = events.filter((e) => !VALID_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          error: `Invalid event types: ${invalidEvents.join(', ')}`,
          code: 'INVALID_EVENTS',
        });
      }
      eventList = events;
    }

    // Generate HMAC secret for webhook signing
    const secret = crypto.randomBytes(32).toString('hex');

    const db = await import('../../../../lib/dbClient');
    const subscription = await db.createWebhookSubscription({
      seller_id: sellerWallet,
      url,
      events: eventList, // Null means subscribe to all events
      active,
      secret,
      metadata: {
        user_agent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      },
    });

    return res.status(201).json({
      webhook_subscription_id: subscription.id,
      url: subscription.url,
      events: subscription.events || VALID_EVENTS,
      secret: subscription.secret,
      active: subscription.active,
    });
  } catch (error: any) {
    console.error('Error registering webhook:', error);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

export default requireSellerAuth(handler as any) as any;
