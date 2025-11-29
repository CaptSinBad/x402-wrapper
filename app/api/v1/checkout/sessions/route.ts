import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireApiAuth, formatApiError } from '../../../../../lib/apiAuth';
import crypto from 'crypto';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/v1/checkout/sessions
 * Create a checkout session for merchants
 * Requires API key authentication
 */
export async function POST(req: NextRequest) {
    try {
        // Authenticate merchant
        const auth = await requireApiAuth(req);

        const body = await req.json();
        const {
            line_items,
            success_url,
            cancel_url,
            customer_email,
            metadata,
            mode = 'payment',
        } = body;

        // Validate request
        if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request_error',
                    code: 'invalid_line_items',
                    message: 'line_items is required and must be a non-empty array',
                }
            }, { status: 400 });
        }

        // Validate all products belong to this merchant
        const productIds = line_items.map(item => item.product_id);
        const productsResult = await pgPool.query(
            `SELECT id, price_cents, currency, active FROM products 
             WHERE id = ANY($1) AND seller_id = $2`,
            [productIds, auth.user.id]
        );

        if (productsResult.rows.length !== productIds.length) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request_error',
                    code: 'invalid_product_id',
                    message: 'One or more product IDs are invalid or do not belong to your account',
                }
            }, { status: 400 });
        }

        // Check all products are active
        const inactiveProducts = productsResult.rows.filter((p: any) => !p.active);
        if (inactiveProducts.length > 0) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request_error',
                    code: 'inactive_product',
                    message: 'One or more products are inactive',
                }
            }, { status: 400 });
        }

        // Build product map for pricing
        const productMap = new Map(productsResult.rows.map((p: any) => [p.id, p]));

        // Calculate line items with pricing
        const enrichedLineItems = line_items.map(item => {
            const product = productMap.get(item.product_id) as any;
            if (!product) {
                throw new Error(`Product ${item.product_id} not found`);
            }

            const quantity = item.quantity || 1;
            const total_cents = product.price_cents * quantity;

            return {
                product_id: item.product_id,
                quantity,
                price_cents: product.price_cents,
                total_cents,
                currency: product.currency,
            };
        });

        // Calculate total
        const total_cents = enrichedLineItems.reduce((sum, item) => sum + item.total_cents, 0);
        const currency = productsResult.rows[0].currency; // Use first product's currency

        // Generate session ID
        const session_id = `cs_${crypto.randomBytes(16).toString('base64url')}`;

        // Set expiration (1 hour from now)
        const expires_at = new Date(Date.now() + 60 * 60 * 1000);

        // Create checkout session
        const result = await pgPool.query(
            `INSERT INTO checkout_sessions (
                session_id,
                seller_id,
                line_items,
                total_cents,
                currency,
                mode,
                success_url,
                cancel_url,
                customer_email,
                metadata,
                payment_status,
                status,
                expires_at,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unpaid', 'open', $11, NOW(), NOW())
            RETURNING *`,
            [
                session_id,
                auth.user.id,
                JSON.stringify(enrichedLineItems),
                total_cents,
                currency,
                mode,
                success_url || null,
                cancel_url || null,
                customer_email || null,
                metadata ? JSON.stringify(metadata) : null,
                expires_at,
            ]
        );

        const session = result.rows[0];

        // Format public response
        return NextResponse.json({
            id: session.session_id,
            object: 'checkout.session',
            amount_total: total_cents,
            currency: currency,
            customer_email: session.customer_email,
            expires_at: session.expires_at,
            metadata: session.metadata ? JSON.parse(session.metadata) : {},
            mode: session.mode,
            payment_status: session.payment_status,
            status: session.status,
            success_url: session.success_url,
            cancel_url: session.cancel_url,
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/${session.session_id}`,
            created: session.created_at,
        }, { status: 201 });

    } catch (error: any) {
        console.error('[v1/checkout/sessions] Error:', error);

        const { error: formattedError, status } = formatApiError(error);
        return NextResponse.json(formattedError, { status });
    }
}
