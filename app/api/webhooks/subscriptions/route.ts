import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/webhooks/subscriptions
 * List all webhook subscriptions for authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        const result = await pgPool.query(
            `SELECT id, url, events, enabled, created_at
             FROM webhook_subscriptions
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [user.id]
        );

        return NextResponse.json({
            subscriptions: result.rows,
        });
    } catch (error: any) {
        console.error('[webhooks/subscriptions] Error:', error);

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

/**
 * POST /api/webhooks/subscriptions
 * Create a new webhook subscription
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const { url, events } = await req.json();

        if (!url || !events || !Array.isArray(events)) {
            return NextResponse.json(
                { error: 'invalid_request', message: 'url and events are required' },
                { status: 400 }
            );
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { error: 'invalid_url', message: 'Invalid webhook URL' },
                { status: 400 }
            );
        }

        // Validate events
        const validEvents = ['checkout.session.completed', 'payment.succeeded', 'payment.failed'];
        const invalidEvents = events.filter((e: string) => !validEvents.includes(e));

        if (invalidEvents.length > 0) {
            return NextResponse.json(
                { error: 'invalid_events', message: `Invalid events: ${invalidEvents.join(', ')}` },
                { status: 400 }
            );
        }

        const result = await pgPool.query(
            `INSERT INTO webhook_subscriptions (user_id, url, events, enabled, created_at)
             VALUES ($1, $2, $3, true, NOW())
             RETURNING *`,
            [user.id, url, events]
        );

        return NextResponse.json({
            subscription: result.rows[0],
        }, { status: 201 });
    } catch (error: any) {
        console.error('[webhooks/subscriptions] Error:', error);

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
