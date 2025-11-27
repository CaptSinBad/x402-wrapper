import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/session';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/products/[id]
 * Get a single product
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const user = await requireAuth();

        const result = await pgPool.query(
            `SELECT * FROM products WHERE id = $1 AND seller_id = $2`,
            [params.id, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'product_not_found' },
                { status: 404 }
            );
        }

        const product = result.rows[0];

        return NextResponse.json({
            product: {
                id: product.id,
                name: product.name,
                description: product.description,
                price_cents: product.price_cents,
                price: (product.price_cents / 100).toFixed(2),
                currency: product.currency,
                images: product.images,
                metadata: product.metadata,
                active: product.active,
                created_at: product.created_at,
                updated_at: product.updated_at
            }
        });
    } catch (error: any) {
        console.error('[products/[id]] GET Error:', error);

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
 * PATCH /api/products/[id]
 * Update a product
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const user = await requireAuth();
        const body = await req.json();

        const { name, description, price_cents, currency, images, metadata, active } = body;

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (price_cents !== undefined) {
            if (price_cents < 0) {
                return NextResponse.json(
                    { error: 'price_cents must be non-negative' },
                    { status: 400 }
                );
            }
            updates.push(`price_cents = $${paramIndex++}`);
            values.push(price_cents);
        }
        if (currency !== undefined) {
            updates.push(`currency = $${paramIndex++}`);
            values.push(currency);
        }
        if (images !== undefined) {
            updates.push(`images = $${paramIndex++}`);
            values.push(JSON.stringify(images));
        }
        if (metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(metadata));
        }
        if (active !== undefined) {
            updates.push(`active = $${paramIndex++}`);
            values.push(active);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: 'no_updates_provided' },
                { status: 400 }
            );
        }

        values.push(params.id, user.id);

        const result = await pgPool.query(
            `UPDATE products 
             SET ${updates.join(', ')} 
             WHERE id = $${paramIndex} AND seller_id = $${paramIndex + 1}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'product_not_found' },
                { status: 404 }
            );
        }

        const product = result.rows[0];

        return NextResponse.json({
            product: {
                id: product.id,
                name: product.name,
                description: product.description,
                price_cents: product.price_cents,
                price: (product.price_cents / 100).toFixed(2),
                currency: product.currency,
                images: product.images,
                metadata: product.metadata,
                active: product.active,
                created_at: product.created_at,
                updated_at: product.updated_at
            }
        });
    } catch (error: any) {
        console.error('[products/[id]] PATCH Error:', error);

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
 * DELETE /api/products/[id]
 * Soft delete a product (set active = false)
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const user = await requireAuth();

        const result = await pgPool.query(
            `UPDATE products 
             SET active = false 
             WHERE id = $1 AND seller_id = $2
             RETURNING id`,
            [params.id, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'product_not_found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error: any) {
        console.error('[products/[id]] DELETE Error:', error);

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
