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

        const { name, description, price_cents, currency, images, metadata, store_id } = body;

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

        // If store_id provided, verify ownership
        if (store_id) {
            const storeCheck = await pgPool.query(
                'SELECT id FROM stores WHERE id = $1 AND user_id = $2',
                [store_id, user.id]
            );

            if (storeCheck.rows.length === 0) {
                return NextResponse.json(
                    { error: 'store_not_found or you do not own this store' },
                    { status: 404 }
                );
            }
        }

        const result = await pgPool.query(
            `INSERT INTO products (
                seller_id, name, description, price_cents, currency, images, metadata, store_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                user.id,
                name,
                description || null,
                price_cents,
                currency || 'USDC',
                JSON.stringify(images || []),
                JSON.stringify(metadata || {}),
                store_id || null
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
