import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/session';
import crypto from 'crypto';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/checkout/sessions/create
 * Create a new checkout session
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await req.json();

        const { line_items, mode, success_url, cancel_url, customer_email, metadata } = body;

        // Validate required fields
        if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
            return NextResponse.json(
                { error: 'line_items is required and must be a non-empty array' },
                { status: 400 }
            );
        }

        if (!mode || !['payment', 'subscription'].includes(mode)) {
            return NextResponse.json(
                { error: 'mode must be either "payment" or "subscription"' },
                { status: 400 }
            );
        }

        // Fetch products and validate line items
        const productIds = line_items.map(item => item.product_id);
        const productsResult = await pgPool.query(
            `SELECT * FROM products WHERE id = ANY($1) AND seller_id = $2 AND active = true`,
            [productIds, user.id]
        );

        if (productsResult.rows.length !== productIds.length) {
            return NextResponse.json(
                { error: 'one or more products not found or inactive' },
                { status: 400 }
            );
        }

        const productMap = new Map(productsResult.rows.map(p => [p.id, p]));

        // Calculate total and build enriched line items
        let totalCents = 0;
        const enrichedLineItems = line_items.map(item => {
            const product = productMap.get(item.product_id);
            if (!product) {
                throw new Error(`Product ${item.product_id} not found`);
            }

            const quantity = item.quantity || 1;
            if (quantity < 1) {
                throw new Error('quantity must be at least 1');
            }

            const itemTotal = product.price_cents * quantity;
            totalCents += itemTotal;

            return {
                product_id: product.id,
                name: product.name,
                description: product.description,
                price_cents: product.price_cents,
                quantity,
                total_cents: itemTotal,
                images: product.images
            };
        });

        // Generate unique session ID
        const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;

        // Set expiration (default: 24 hours)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Insert checkout session
        const result = await pgPool.query(
            `INSERT INTO checkout_sessions (
                session_id, seller_id, customer_email, line_items, 
                total_cents, currency, mode, success_url, cancel_url, 
                metadata, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                sessionId,
                user.id,
                customer_email || null,
                JSON.stringify(enrichedLineItems),
                totalCents,
                'USDC', // Default currency
                mode,
                success_url || null,
                cancel_url || null,
                JSON.stringify(metadata || {}),
                expiresAt
            ]
        );

        const session = result.rows[0];
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        return NextResponse.json({
            id: session.session_id,
            url: `${baseUrl}/checkout/${session.session_id}`,
            expires_at: session.expires_at,
            total_cents: session.total_cents,
            total: (session.total_cents / 100).toFixed(2),
            currency: session.currency,
            line_items: enrichedLineItems
        });
    } catch (error: any) {
        console.error('[checkout/sessions/create] Error:', error);

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
