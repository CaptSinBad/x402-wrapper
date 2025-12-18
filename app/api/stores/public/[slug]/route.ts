import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/stores/public/[slug]
 * Public endpoint to fetch store details and products by slug
 * No authentication required
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ slug: string }> }
) {
    try {
        const params = await context.params;
        const slug = params.slug;

        // Fetch store
        const storeResult = await pgPool.query(
            `SELECT * FROM stores WHERE store_slug = $1 AND active = true`,
            [slug]
        );

        if (storeResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'store_not_found' },
                { status: 404 }
            );
        }

        const store = storeResult.rows[0];

        // Fetch products for this store
        const productsResult = await pgPool.query(
            `SELECT 
                id, name, description, price_cents, currency, 
                images, metadata, active, created_at, updated_at
             FROM products 
             WHERE store_id = $1 AND active = true
             ORDER BY created_at DESC`,
            [store.id]
        );

        const products = productsResult.rows.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price_cents: p.price_cents,
            price: (p.price_cents / 100).toFixed(2),
            currency: p.currency,
            images: p.images,
            metadata: p.metadata,
            active: p.active,
            created_at: p.created_at,
            updated_at: p.updated_at
        }));

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        return NextResponse.json({
            store: {
                id: store.id,
                store_name: store.store_name,
                store_slug: store.store_slug,
                description: store.description,
                logo_url: store.logo_url,
                banner_url: store.banner_url,
                theme_color: store.theme_color,
                url: `${baseUrl}/s/${store.store_slug}`
            },
            products,
            product_count: products.length
        });
    } catch (error: any) {
        console.error('[stores/public/[slug]] Error:', error);

        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}
