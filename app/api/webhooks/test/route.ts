import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '../../../../lib/session';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/webhooks/test
 * Test webhook delivery by sending a test event
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const { subscription_id, event_type } = await req.json();

        if (!subscription_id) {
            return NextResponse.json(
                { error: 'subscription_id is required' },
                { status: 400 }
            );
        }

        // Get subscription
        const subResult = await pgPool.query(
            `SELECT * FROM webhook_subscriptions 
             WHERE id = $1 AND user_id = $2`,
            [subscription_id, user.id]
        );

        if (subResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Subscription not found' },
                { status: 404 }
            );
        }

        const subscription = subResult.rows[0];

        // Get project for webhook secret
        const projectResult = await pgPool.query(
            `SELECT id, webhook_secret FROM projects 
             WHERE user_id = $1 LIMIT 1`,
            [user.id]
        );

        if (projectResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'No project found' },
                { status: 404 }
            );
        }

        // Send test webhook
        const { sendWebhook } = await import('@/lib/webhooks');

        const testEventType = event_type || 'checkout.session.completed';
        const testData = {
            object: 'checkout.session',
            id: 'cs_test_12345',
            customer_email: 'test@example.com',
            amount_total: 1000,
            currency: 'USDC',
            payment_status: 'paid',
            metadata: { test: true },
            transaction_hash: '0x1234567890abcdef',
            completed_at: new Date().toISOString(),
        };

        await sendWebhook({
            project_id: projectResult.rows[0].id,
            event_type: testEventType,
            data: testData,
        });

        return NextResponse.json({
            success: true,
            message: 'Test webhook sent successfully',
            endpoint: subscription.url,
            event_type: testEventType,
        });
    } catch (error: any) {
        console.error('[webhooks/test] Error:', error);

        if (error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}
