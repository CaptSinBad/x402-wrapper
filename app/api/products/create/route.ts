import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/session';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/products/create
 * Create a new product
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await req.json();

        const { name, description, price_cents, currency, images, metadata } = body;

        // Validate required fields
        if (!name || !price_cents) {
            return NextResponse.json(
                { error: 'name and price_cents are required' },
                { status: 400 }
            );
        }

        if (price_cents < 0) {
            return NextResponse.json(
                { error: 'price_cents must be non-negative' },
                { status: 400 }
            );
        }

        const result = await pgPool.query(
            `INSERT INTO products (
                seller_id, name, description, price_cents, currency, images, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                user.id,
                name,
                description || null,
                price_cents,
                currency || 'USDC',
                JSON.stringify(images || []),
                JSON.stringify(metadata || {})
            ]
        );

        const product = result.rows[0];

        return NextResponse.json({
            product: {
                id: product.id,
                name: product.name,
                description: product.description,
                price_cents: product.price_cents,
                currency: product.currency,
                images: product.images,
                metadata: product.metadata,
                active: product.active,
                created_at: product.created_at,
                updated_at: product.updated_at
            }
        });
    } catch (error: any) {
        console.error('[products/create] Error:', error);

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
