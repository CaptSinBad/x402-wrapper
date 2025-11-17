import crypto from 'crypto';

/**
 * Webhook dispatcher and delivery service
 * Handles:
 * - Triggering webhooks when events occur
 * - Signing webhook payloads with HMAC-SHA256
 * - Retry logic for failed deliveries
 * - Batch processing of pending deliveries
 */

type WebhookPayload = {
  event_type: string;
  seller_id: string;
  resource_type: string;
  resource_id: string;
  payload: Record<string, any>;
  timestamp: string;
};

/**
 * Create HMAC signature for webhook payload
 * @param payload JSON payload to sign
 * @param secret Shared secret for HMAC
 * @returns Hex-encoded HMAC-SHA256 signature
 */
export function signWebhook(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify webhook signature from headers
 * @param payload Raw payload (string)
 * @param signature Signature from X-Webhook-Signature header
 * @param secret Shared secret
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSig = signWebhook(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

/**
 * Trigger a webhook event
 * @param db Database client with webhook functions
 * @param event Event details
 * @returns Promise with number of subscriptions triggered
 */
export async function triggerWebhookEvent(db: any, event: WebhookPayload): Promise<number> {
  try {
    // Create the event record
    const eventRecord = await db.createWebhookEvent({
      event_type: event.event_type,
      seller_id: event.seller_id,
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      payload: event.payload,
    });

    // Find all subscriptions for this event
    const subscriptions = await db.getWebhookSubscriptionsForEvent(
      event.seller_id,
      event.event_type
    );

    if (!subscriptions || subscriptions.length === 0) {
      return 0;
    }

    // Create delivery record for each subscription
    let deliveryCount = 0;
    for (const subscription of subscriptions) {
      try {
        await db.createWebhookDelivery({
          webhook_subscription_id: subscription.id,
          webhook_event_id: eventRecord.id,
          status: 'pending',
        });
        deliveryCount++;
      } catch (err) {
        console.error(`Failed to create delivery for subscription ${subscription.id}:`, err);
      }
    }

    return deliveryCount;
  } catch (err) {
    console.error('Failed to trigger webhook event:', err);
    throw err;
  }
}

/**
 * Process a single webhook delivery
 * @param db Database client
 * @param delivery Webhook delivery record
 * @param subscription Webhook subscription record
 * @param event Webhook event record
 */
export async function processWebhookDelivery(
  db: any,
  delivery: any,
  subscription: any,
  event: any
): Promise<void> {
  const payload: WebhookPayload = {
    event_type: event.event_type,
    seller_id: event.seller_id,
    resource_type: event.resource_type,
    resource_id: event.resource_id,
    payload: typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
    timestamp: event.created_at,
  };

  const payloadString = JSON.stringify(payload);
  const signature = signWebhook(payloadString, subscription.secret);

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event.event_type,
          'X-Webhook-Timestamp': event.created_at,
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();

      if (response.ok) {
        // Success - mark as delivered
        await db.updateWebhookDelivery(delivery.id, {
          status: 'success',
          response_status_code: response.status,
          response_body: responseBody,
          delivered_at: new Date().toISOString(),
          attempt_count: delivery.attempt_count + 1,
        });
        
        // Update subscription's last_delivered_at
        await db.updateWebhookSubscription(subscription.id, {
          last_delivered_at: new Date().toISOString(),
        });
      } else {
        // Failed - schedule retry if attempts remaining
        const attempts = (delivery.attempt_count || 0) + 1;
        if (attempts < (delivery.max_attempts || 5)) {
          const backoffSeconds = Math.pow(2, attempts) * 60; // Exponential backoff: 2m, 4m, 8m, 16m
          const nextRetry = new Date(Date.now() + backoffSeconds * 1000);
          await db.updateWebhookDelivery(delivery.id, {
            status: 'retry',
            response_status_code: response.status,
            response_body: responseBody,
            error_message: `HTTP ${response.status}`,
            attempt_count: attempts,
            next_retry_at: nextRetry,
          });
        } else {
          // Max attempts exceeded - mark as failed
          await db.updateWebhookDelivery(delivery.id, {
            status: 'failed',
            response_status_code: response.status,
            response_body: responseBody,
            error_message: `Failed after ${attempts} attempts`,
            attempt_count: attempts,
          });
        }
      }
    } catch (fetchError: any) {
      // Network or timeout error - schedule retry
      const attempts = (delivery.attempt_count || 0) + 1;
      if (attempts < (delivery.max_attempts || 5)) {
        const backoffSeconds = Math.pow(2, attempts) * 60;
        const nextRetry = new Date(Date.now() + backoffSeconds * 1000);
        await db.updateWebhookDelivery(delivery.id, {
          status: 'retry',
          error_message: fetchError.message || String(fetchError),
          attempt_count: attempts,
          next_retry_at: nextRetry,
        });
      } else {
        await db.updateWebhookDelivery(delivery.id, {
          status: 'failed',
          error_message: `Network error: ${fetchError.message}`,
          attempt_count: attempts,
        });
      }
    }
  } catch (error: any) {
    console.error('Unexpected error processing webhook delivery:', error);
  }
}

/**
 * Process all pending webhook deliveries
 * Run this as a background job (e.g., every 30 seconds)
 */
export async function processPendingDeliveries(
  db: any,
  batchSize = 10
): Promise<{ processed: number; succeeded: number; failed: number }> {
  try {
    const deliveries = await db.getWebhookDeliveriesPending(batchSize);

    if (!deliveries || deliveries.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      try {
        const subscription = await db.getWebhookSubscription(
          delivery.webhook_subscription_id
        );
        const eventRes = await (db.USE_SUPABASE || !db.pgPool
          ? db.supabase.from('webhook_events').select('*').eq('id', delivery.webhook_event_id).limit(1)
          : db.pgPool.query('SELECT * FROM webhook_events WHERE id = $1 LIMIT 1', [delivery.webhook_event_id]));

        const event = db.USE_SUPABASE ? (eventRes.data?.[0] ?? null) : (eventRes.rows?.[0] ?? null);

        if (subscription && event) {
          await processWebhookDelivery(db, delivery, subscription, event);
          succeeded++;
        } else {
          // Mark as failed if subscription or event not found
          await db.updateWebhookDelivery(delivery.id, {
            status: 'failed',
            error_message: 'Subscription or event not found',
          });
          failed++;
        }
      } catch (err) {
        console.error(`Error processing delivery ${delivery.id}:`, err);
        failed++;
      }
    }

    return { processed: deliveries.length, succeeded, failed };
  } catch (err) {
    console.error('Error processing pending deliveries:', err);
    return { processed: 0, succeeded: 0, failed: 0 };
  }
}

export default {
  signWebhook,
  verifyWebhookSignature,
  triggerWebhookEvent,
  processWebhookDelivery,
  processPendingDeliveries,
};
