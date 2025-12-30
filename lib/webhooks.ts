// Webhook delivery system for BinahPay
// Sends event notifications to merchant webhook endpoints

import { query } from './db';
import crypto from 'crypto';

export interface WebhookEvent {
    id: string;
    type: string;
    data: any;
    created: number;
}

export interface WebhookDeliveryResult {
    success: boolean;
    status_code?: number;
    error_message?: string;
    delivered_at?: Date;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateWebhookSignature(payload: string, secret: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
}

/**
 * Deliver webhook to merchant endpoint
 */
async function deliverWebhook(
    url: string,
    event: WebhookEvent,
    secret: string
): Promise<WebhookDeliveryResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify(event);

    // Create signature with timestamp
    const signedPayload = `${timestamp}.${payload}`;
    const signature = generateWebhookSignature(signedPayload, secret);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-BinahPay-Signature': `t=${timestamp},v1=${signature}`,
                'X-BinahPay-Event-Type': event.type,
                'X-BinahPay-Event-ID': event.id,
                'User-Agent': 'BinahPay-Webhook/1.0',
            },
            body: payload,
            signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (response.ok) {
            return {
                success: true,
                status_code: response.status,
                delivered_at: new Date(),
            };
        } else {
            const errorBody = await response.text().catch(() => 'Unknown error');
            return {
                success: false,
                status_code: response.status,
                error_message: `HTTP ${response.status}: ${errorBody.substring(0, 200)}`,
            };
        }
    } catch (error: any) {
        return {
            success: false,
            error_message: error.message || 'Network error',
        };
    }
}

/**
 * Create and deliver a webhook event
 */
export async function sendWebhook(params: {
    project_id: string;
    event_type: string;
    data: any;
}): Promise<void> {
    const { project_id, event_type, data } = params;

    try {
        // Get project's webhook configuration
        const projectResult = await query(
            `SELECT webhook_secret FROM projects WHERE id = $1`,
            [project_id]
        );

        if (projectResult.rows.length === 0) {
            console.error('[webhooks] Project not found:', project_id);
            return;
        }

        const webhookSecret = projectResult.rows[0].webhook_secret;

        // Get webhook subscriptions for this project and event type
        const subscriptionsResult = await query(
            `SELECT id, url, events 
             FROM webhook_subscriptions 
             WHERE user_id = (SELECT user_id FROM projects WHERE id = $1)
             AND enabled = true
             AND $2 = ANY(events)`,
            [project_id, event_type]
        );

        if (subscriptionsResult.rows.length === 0) {
            console.log('[webhooks] No subscriptions for event:', event_type);
            return;
        }

        // Create webhook event record
        const eventId = `evt_${crypto.randomBytes(12).toString('base64url')}`;
        const event: WebhookEvent = {
            id: eventId,
            type: event_type,
            data,
            created: Math.floor(Date.now() / 1000),
        };

        await query(
            `INSERT INTO webhook_events (id, type, data, created_at)
             VALUES ($1, $2, $3, to_timestamp($4))`,
            [event.id, event.type, JSON.stringify(event.data), event.created]
        );

        // Deliver to all subscribed endpoints
        for (const subscription of subscriptionsResult.rows) {
            await deliverWebhookToSubscription(subscription, event, webhookSecret);
        }
    } catch (error) {
        console.error('[webhooks] Error sending webhook:', error);
    }
}

/**
 * Deliver webhook to a specific subscription with retry logic
 */
async function deliverWebhookToSubscription(
    subscription: any,
    event: WebhookEvent,
    secret: string
): Promise<void> {
    const maxRetries = 3;
    const retryDelays = [1000, 5000, 30000]; // 1s, 5s, 30s

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Record delivery attempt
        const deliveryId = `whdl_${crypto.randomBytes(12).toString('base64url')}`;

        await query(
            `INSERT INTO webhook_deliveries (
                id, subscription_id, event_id, attempt, status, created_at
            ) VALUES ($1, $2, $3, $4, 'pending', NOW())`,
            [deliveryId, subscription.id, event.id, attempt + 1]
        );

        // Attempt delivery
        const result = await deliverWebhook(subscription.url, event, secret);

        // Update delivery record
        await query(
            `UPDATE webhook_deliveries 
             SET status = $1, 
             response_code = $2, 
             response_body = $3, 
             delivered_at = $4
             WHERE id = $5`,
            [
                result.success ? 'succeeded' : 'failed',
                result.status_code || null,
                result.error_message ? result.error_message.substring(0, 1000) : null,
                result.delivered_at || null,
                deliveryId,
            ]
        );

        if (result.success) {
            console.log(`[webhooks] Delivered ${event.type} to ${subscription.url}`);
            return;
        }

        // Retry logic
        if (attempt < maxRetries - 1) {
            console.log(`[webhooks] Delivery failed, retrying in ${retryDelays[attempt]}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        } else {
            console.error(`[webhooks] All delivery attempts failed for ${event.type}`);
        }
    }
}

/**
 * Trigger checkout session completed webhook
 */
export async function sendCheckoutSessionCompletedWebhook(params: {
    project_id: string;
    session_id: string;
    customer_email?: string;
    amount_total: number;
    currency: string;
    metadata?: any;
    transaction_hash: string;
}): Promise<void> {
    await sendWebhook({
        project_id: params.project_id,
        event_type: 'checkout.session.completed',
        data: {
            object: 'checkout.session',
            id: params.session_id,
            customer_email: params.customer_email,
            amount_total: params.amount_total,
            currency: params.currency,
            payment_status: 'paid',
            metadata: params.metadata || {},
            transaction_hash: params.transaction_hash,
            completed_at: new Date().toISOString(),
        },
    });
}

/**
 * Trigger payment succeeded webhook
 */
export async function sendPaymentSucceededWebhook(params: {
    project_id: string;
    amount: number;
    currency: string;
    customer_wallet: string;
    transaction_hash: string;
    metadata?: any;
}): Promise<void> {
    await sendWebhook({
        project_id: params.project_id,
        event_type: 'payment.succeeded',
        data: {
            object: 'payment',
            amount: params.amount,
            currency: params.currency,
            customer_wallet: params.customer_wallet,
            transaction_hash: params.transaction_hash,
            metadata: params.metadata || {},
            status: 'succeeded',
            created_at: new Date().toISOString(),
        },
    });
}
