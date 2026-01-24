import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/checkout/sessions/[session_id]
 * Get checkout session details including seller's wallet address
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ session_id: string }> }
) {
    try {
        const params = await context.params;
        const sessionId = params.session_id;

        // Join with users table to get seller's wallet address
        const result = await pgPool.query(
            `SELECT cs.*, u.wallet_address as seller_wallet_address
             FROM checkout_sessions cs
             LEFT JOIN users u ON cs.seller_id = u.id
             WHERE cs.session_id = $1`,
            [sessionId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'session_not_found' },
                { status: 404 }
            );
        }

        const session = result.rows[0];

        // Check if expired
        if (new Date(session.expires_at) < new Date()) {
            // Update status if not already expired
            if (session.status !== 'expired') {
                await pgPool.query(
                    `UPDATE checkout_sessions SET status = 'expired' WHERE session_id = $1`,
                    [sessionId]
                );
            }

            return NextResponse.json(
                { error: 'session_expired' },
                { status: 410 }
            );
        }

        // Check if already completed
        if (session.status === 'complete') {
            return NextResponse.json(
                { error: 'session_already_completed' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            id: session.session_id,
            status: session.status,
            payment_status: session.payment_status,
            line_items: session.line_items,
            total_cents: session.total_cents,
            total: (session.total_cents / 100).toFixed(2),
            currency: session.currency,
            network: session.network,
            mode: session.mode,
            customer_email: session.customer_email,
            success_url: session.success_url,
            cancel_url: session.cancel_url,
            expires_at: session.expires_at,
            created_at: session.created_at,
            // Include seller's wallet address for payment
            seller_wallet_address: session.seller_wallet_address
        });
    } catch (error: any) {
        console.error('[checkout/sessions/[session_id]] Error:', error);

        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}
