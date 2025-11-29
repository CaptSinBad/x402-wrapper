/**
 * BinahPay Server SDK - Example Usage
 * 
 * This file demonstrates how to use the BinahPay server SDK
 * in a Node.js application.
 */

import BinahPay, { BinahPayError } from './index';

// Initialize the SDK
const binahpay = new BinahPay('pk_test_your_api_key_here');

/**
 * Example 1: Create a checkout session
 */
async function createCheckoutSession() {
    try {
        const session = await binahpay.checkout.sessions.create({
            line_items: [
                {
                    product_id: 'prod_abc123',
                    quantity: 2,
                },
                {
                    product_id: 'prod_def456',
                    quantity: 1,
                },
            ],
            success_url: 'https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://yourdomain.com/cancel',
            customer_email: 'customer@example.com',
            metadata: {
                order_id: 'order_12345',
                customer_name: 'John Doe',
                custom_field: 'any value',
            },
        });

        console.log('Checkout session created!');
        console.log('Session ID:', session.id);
        console.log('Payment URL:', session.url);
        console.log('Total amount:', session.amount_total / 100, session.currency);

        return session;
    } catch (error) {
        if (error instanceof BinahPayError) {
            console.error('BinahPay API Error:', error.message);
            console.error('Error code:', error.code);
            console.error('Status code:', error.statusCode);
        } else {
            console.error('Unexpected error:', error);
        }
    }
}

/**
 * Example 2: Retrieve a checkout session
 */
async function getCheckoutSession(sessionId: string) {
    try {
        const session = await binahpay.checkout.sessions.retrieve(sessionId);

        console.log('Session details:');
        console.log('- Status:', session.status);
        console.log('- Payment status:', session.payment_status);
        console.log('- Customer email:', session.customer_email);
        console.log('- Metadata:', session.metadata);

        return session;
    } catch (error) {
        if (error instanceof BinahPayError) {
            console.error('Failed to retrieve session:', error.message);
        }
    }
}

/**
 * Example 3: Verify webhook signature
 */
function handleWebhook(payload: string, signature: string, secret: string) {
    try {
        const event = binahpay.webhooks.constructEvent(payload, signature, secret);

        console.log('Webhook event received:');
        console.log('- Event type:', event.type);
        console.log('- Event data:', event.data);

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed':
                console.log('Payment completed for session:', event.data.id);
                console.log('Transaction hash:', event.data.transaction_hash);
                // Fulfill the order here
                break;

            case 'payment.succeeded':
                console.log('Payment succeeded:', event.data.amount, event.data.currency);
                break;

            case 'payment.failed':
                console.log('Payment failed');
                break;

            default:
                console.log('Unhandled event type:', event.type);
        }

        return event;
    } catch (error) {
        if (error instanceof BinahPayError) {
            console.error('Webhook verification failed:', error.message);
            throw error;
        }
    }
}

/**
 * Example 4: Express.js webhook endpoint
 */
function expressWebhookExample() {
    const express = require('express');
    const app = express();

    // Webhook endpoint - must use raw body
    app.post('/webhooks/binahpay',
        express.raw({ type: 'application/json' }),
        async (req: any, res: any) => {
            const sig = req.headers['x-binahpay-signature'];
            const payload = req.body.toString();
            const webhookSecret = process.env.BINAHPAY_WEBHOOK_SECRET!;

            try {
                const event = binahpay.webhooks.constructEvent(payload, sig, webhookSecret);

                // Process the event
                if (event.type === 'checkout.session.completed') {
                    // Fulfill order
                    await fulfillOrder(event.data.metadata.order_id);
                }

                res.json({ received: true });
            } catch (err: any) {
                console.error('Webhook error:', err.message);
                res.status(400).send(`Webhook Error: ${err.message}`);
            }
        }
    );

    app.listen(3000);
}

/**
 * Mock order fulfillment
 */
async function fulfillOrder(orderId: string) {
    console.log(`Fulfilling order: ${orderId}`);
    // Your order fulfillment logic here
}

// Run examples
if (require.main === module) {
    console.log('BinahPay SDK Examples\n');

    // Example 1
    createCheckoutSession().then(session => {
        if (session) {
            // Example 2
            return getCheckoutSession(session.id);
        }
    });

    // Example 3
    const mockPayload = JSON.stringify({
        type: 'checkout.session.completed',
        data: {
            id: 'cs_test_123',
            amount_total: 1000,
            currency: 'USDC',
        },
    });
    const mockSignature = 't=1234567890,v1=abc123';
    const mockSecret = 'whsec_test_secret';

    // This will fail with invalid signature, but demonstrates usage
    try {
        handleWebhook(mockPayload, mockSignature, mockSecret);
    } catch (error) {
        console.log('Expected error for mock webhook (signature invalid)');
    }
}

export {
    createCheckoutSession,
    getCheckoutSession,
    handleWebhook,
    fulfillOrder,
};
