import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { settleCDPPayment } from '../../../../lib/cdp-facilitator';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/link/pay
 * Process payment for a payment link
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, paymentPayload, paymentRequirements } = body;

        if (!token || !paymentPayload || !paymentRequirements) {
            return NextResponse.json(
                { error: 'missing_required_fields' },
                { status: 400 }
            );
        }

        // Fetch payment link
        const linkResult = await pgPool.query(
            `SELECT * FROM payment_links WHERE token = $1`,
            [token]
        );

        if (linkResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'link_not_found' },
                { status: 404 }
            );
        }

        const link = linkResult.rows[0];

        // Check if link is expired
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'link_expired' },
                { status: 410 }
            );
        }

        // Settle payment via CDP
        console.log('[link/pay] Settling payment for link:', token);

        const settlementResult = await settleCDPPayment({
            paymentPayload,
            paymentRequirements,
            apiKeyName: process.env.CDP_API_KEY_ID!,
            apiKeySecret: process.env.CDP_API_KEY_SECRET!,
            facilitatorUrl: process.env.NEXT_PUBLIC_FACILITATOR_URL || 'https://api.cdp.coinbase.com/platform',
        });

        if (!settlementResult.success) {
            console.error('[link/pay] Settlement failed:', settlementResult.errorReason);
            return NextResponse.json(
                {
                    success: false,
                    error: 'payment_settlement_failed',
                    errorReason: settlementResult.errorReason,
                },
                { status: 402 }
            );
        }

        console.log('[link/pay] Payment settled successfully:', settlementResult.transaction);

        // Create sale record
        const amountCents = link.price_cents;
        const metadata = typeof link.metadata === 'string' ? JSON.parse(link.metadata) : link.metadata;

        await pgPool.query(
            `INSERT INTO sales(seller_id, amount_cents, currency, purchaser_address, metadata, created_at)
       VALUES($1, $2, $3, $4, $5, NOW())`,
            [
                link.seller_id || 'payment-link',
                amountCents,
                'USDC',
                settlementResult.payer,
                JSON.stringify({
                    status: 'completed',
                    transaction_hash: settlementResult.transaction,
                    network: settlementResult.network,
                    payment_link_token: token,
                    product_name: metadata?.productName,
                }),
            ]
        );

        // Get user_id for webhook notification
        const projectResult = await pgPool.query(
            `SELECT user_id FROM projects WHERE id = $1`,
            [link.seller_id]
        );

        // Trigger webhook event for merchant
        if (projectResult.rows.length > 0) {
            const { sendWebhook } = await import('../../../lib/webhooks');
            await sendWebhook({
                project_id: link.seller_id,
                event_type: 'payment.succeeded',
                data: {
                    amount_cents: amountCents,
                    currency: 'USDC',
                    transaction_hash: settlementResult.transaction,
                    network: settlementResult.network,
                    payer: settlementResult.payer,
                    payment_link_token: token,
                    product_name: metadata?.productName,
                }
            });
        }

        return NextResponse.json({
            success: true,
            txHash: settlementResult.transaction,
            network: settlementResult.network,
            payer: settlementResult.payer,
            amount: (amountCents / 100).toFixed(2),
        });
    } catch (error: any) {
        console.error('[link/pay] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'internal_error',
                errorReason: error.message,
            },
            { status: 500 }
        );
    }
}
