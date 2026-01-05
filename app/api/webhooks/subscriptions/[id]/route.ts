import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * PATCH /api/webhooks/subscriptions/[id]
 * Update a webhook subscription
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth(req);
        const { id } = await context.params;
        const { enabled } = await req.json();

        const result = await pgPool.query(
            `UPDATE webhook_subscriptions
             SET enabled = $1
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [enabled, id, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'not_found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ subscription: result.rows[0] });
    } catch (error: any) {
        console.error('[webhooks/subscriptions/[id]] Error:', error);

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
 * DELETE /api/webhooks/subscriptions/[id]
 * Delete a webhook subscription
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth(req);
        const { id } = await context.params;

        const result = await pgPool.query(
            `DELETE FROM webhook_subscriptions
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [id, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'not_found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[webhooks/subscriptions/[id]] Error:', error);

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
