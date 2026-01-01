// Webhook delivery system for BinahPay
// Sends event notifications to merchant webhook endpoints

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
 * Now uses environment variables instead of database
 */
export async function sendWebhook(params: {
    project_id: string;
    event_type: string;
    data: any;
}): Promise<void> {
    const { event_type, data } = params;

    try {
        // Get webhook configuration from environment variables
        const webhookSecret = process.env.WEBHOOK_SECRET || 'default-secret';
        const webhookUrls = process.env.WEBHOOK_URLS?.split(',').map(u => u.trim()) || [];

        if (webhookUrls.length === 0) {
            console.log('[webhooks] No webhook URLs configured');
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

        // Deliver to all configured endpoints
        for (const url of webhookUrls) {
            await deliverWebhookToSubscription(url, event, webhookSecret);
        }
    } catch (error) {
        console.error('[webhooks] Error sending webhook:', error);
    }
}

/**
 * Deliver webhook to a specific URL with retry logic
 */
async function deliverWebhookToSubscription(
    url: string,
    event: WebhookEvent,
    secret: string
): Promise<void> {
    const maxRetries = 3;
    const retryDelays = [1000, 5000, 30000]; // 1s, 5s, 30s

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Attempt delivery
        const result = await deliverWebhook(url, event, secret);

        if (result.success) {
            console.log(`[webhooks] Delivered ${event.type} to ${url}`);
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
