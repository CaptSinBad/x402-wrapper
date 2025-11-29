import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verify, settle } from '@/core/facilitator';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/checkout/sessions/[session_id]/pay
 * Process payment for a checkout session
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ session_id: string }> }
) {
    try {
        const params = await context.params;
        const sessionId = params.session_id;
        const body = await req.json();

        // Get X-PAYMENT header
        const xPaymentHeader = req.headers.get('x-payment');
        if (!xPaymentHeader) {
            return NextResponse.json(
                { error: 'missing_x_payment_header' },
                { status: 400 }
            );
        }

        // Fetch session
        const sessionResult = await pgPool.query(
            `SELECT cs.*, u.wallet_address as seller_wallet 
             FROM checkout_sessions cs
             JOIN users u ON u.id = cs.seller_id
             WHERE cs.session_id = $1`,
            [sessionId]
        );

        if (sessionResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'session_not_found' },
                { status: 404 }
            );
        }

        const session = sessionResult.rows[0];

        // Validate session status
        if (session.status === 'complete') {
            return NextResponse.json(
                { error: 'session_already_completed' },
                { status: 400 }
            );
        }

        if (session.status === 'expired' || new Date(session.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'session_expired' },
                { status: 410 }
            );
        }

        // Decode payment
        const paymentData = JSON.parse(Buffer.from(xPaymentHeader, 'base64').toString('utf-8'));

        // Build payment requirements
        // USDC has 6 decimals, so we need to convert cents to atomic units
        // Price in dollars -> cents (÷100) -> atomic units (×1e6)
        // Simplifies to: cents × 10000
        const atomicAmount = (session.total_cents * 10000).toString();

        const paymentRequirements = {
            scheme: 'exact',
            network: session.network,
            maxAmountRequired: atomicAmount,
            resource: `checkout_session_${sessionId}`,
            description: `Checkout payment`,
            mimeType: 'application/json',
            payTo: session.seller_wallet,
            maxTimeoutSeconds: 300,
            asset: session.network === 'base-sepolia'
                ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
                : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet USDC
            extra: {
                name: 'USDC',
                version: '2'
            }
        };


        // Verify payment
        console.log('[checkout/pay] Verifying payment for session:', sessionId);
        const verifyRequest = {
            x402Version: 1,
            paymentPayload: {
                x402Version: 1,
                scheme: paymentData.scheme,
                network: paymentData.network,
                payload: paymentData.payload
            },
            paymentRequirements
        };

        const verifyResponse = await verify(verifyRequest);

        if (!verifyResponse.isValid) {
            console.error('[checkout/pay] Payment verification failed:', verifyResponse.invalidReason);
            return NextResponse.json(
                {
                    error: 'payment_verification_failed',
                    reason: verifyResponse.invalidReason,
                    x402Version: 1,
                    accepts: [paymentRequirements]
                },
                { status: 402 }
            );
        }

        // Settle payment
        console.log('[checkout/pay] Settling payment...');
        const settleRequest = {
            x402Version: 1,
            paymentPayload: {
                x402Version: 1,
                scheme: paymentData.scheme,
                network: paymentData.network,
                payload: paymentData.payload
            },
            paymentRequirements
        };

        const settleResponse = await settle(settleRequest);

        if (!settleResponse.success) {
            console.error('[checkout/pay] Settlement failed');
            return NextResponse.json(
                { error: 'settlement_failed' },
                { status: 500 }
            );
        }

        console.log('[checkout/pay] Payment settled successfully:', settleResponse.txHash);

        // Update session
        await pgPool.query(
            `UPDATE checkout_sessions 
             SET status = 'complete', 
                 payment_status = 'paid',
                 customer_wallet = $1,
                 customer_email = $2,
                 completed_at = NOW()
             WHERE session_id = $3`,
            [verifyResponse.payer, body.customer_email || null, sessionId]
        );

        // Create order
        const orderResult = await pgPool.query(
            `INSERT INTO orders (
                session_id, seller_id, customer_wallet, customer_email,
                line_items, total_cents, currency, transaction_hash, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                sessionId,
                session.seller_id,
                verifyResponse.payer,
                body.customer_email || null,
                session.line_items,
                session.total_cents,
                session.currency,
                settleResponse.txHash,
                'pending'
            ]
        );

        const order = orderResult.rows[0];

        // Get project ID for the seller
        const projectResult = await pgPool.query(
            `SELECT id FROM projects WHERE user_id = $1 LIMIT 1`,
            [session.seller_id]
        );

        // Trigger webhook event (checkout.session.completed)
        if (projectResult.rows.length > 0) {
            const { sendCheckoutSessionCompletedWebhook } = await import('@/lib/webhooks');

            // Fire webhook asynchronously (don't await to avoid delaying response)
            sendCheckoutSessionCompletedWebhook({
                project_id: projectResult.rows[0].id,
                session_id: sessionId,
                customer_email: body.customer_email,
                amount_total: session.total_cents,
                currency: session.currency,
                metadata: session.metadata ? JSON.parse(session.metadata) : {},
                transaction_hash: settleResponse.txHash,
            }).catch(error => {
                console.error('[checkout/pay] Webhook delivery failed:', error);
                // Don't fail the payment if webhook fails
            });
        }

        return NextResponse.json({
            success: true,
            session_id: sessionId,
            order_id: order.id,
            transaction_hash: settleResponse.txHash,
            total: (session.total_cents / 100).toFixed(2),
            currency: session.currency,
            success_url: session.success_url
        });
    } catch (error: any) {
        console.error('[checkout/sessions/[session_id]/pay] Error:', error);
        console.error('[checkout/sessions/[session_id]/pay] Error stack:', error.stack);
        console.error('[checkout/sessions/[session_id]/pay] Error details:', {
            message: error.message,
            name: error.name,
            code: error.code
        });

        return NextResponse.json(
            {
                error: 'internal_error',
                message: error.message,
                details: error.toString()
            },
            { status: 500 }
        );
    }
}
