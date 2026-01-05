import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth, handleAuthError } from '@/lib/auth';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/products/list
 * List all products for authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const { searchParams } = new URL(req.url);

        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const active = searchParams.get('active'); // 'true', 'false', or null (all)
        const storeId = searchParams.get('store_id'); // optional filter by store
        const categoryId = searchParams.get('category_id'); // optional filter by category

        let query = `
            SELECT 
                p.*,
                COUNT(DISTINCT o.id) as order_count,
                COALESCE(SUM(o.total_cents), 0) as total_revenue_cents
            FROM products p
            LEFT JOIN orders o ON o.line_items::jsonb @> jsonb_build_array(jsonb_build_object('product_id', p.id::text))
            WHERE p.seller_id = $1
        `;

        const params: any[] = [user.id];

        if (active !== null) {
            query += ` AND p.active = $${params.length + 1}`;
            params.push(active === 'true');
        }

        if (storeId) {
            query += ` AND p.store_id = $${params.length + 1}`;
            params.push(storeId);
        }

        if (categoryId) {
            query += ` AND p.category_id = $${params.length + 1}`;
            params.push(categoryId);
        }

        query += `
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        params.push(limit, offset);

        const result = await pgPool.query(query, params);

        const products = result.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            price_cents: row.price_cents,
            price: (row.price_cents / 100).toFixed(2),
            currency: row.currency,
            images: row.images,
            metadata: row.metadata,
            active: row.active,
            order_count: parseInt(row.order_count),
            total_revenue: (parseFloat(row.total_revenue_cents) / 100).toFixed(2),
            created_at: row.created_at,
            updated_at: row.updated_at
        }));

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE seller_id = $1';
        const countParams: any[] = [user.id];

        if (active !== null) {
            countQuery += ` AND active = $${countParams.length + 1}`;
            countParams.push(active === 'true');
        }

        if (storeId) {
            countQuery += ` AND store_id = $${countParams.length + 1}`;
            countParams.push(storeId);
        }

        if (categoryId) {
            countQuery += ` AND category_id = $${countParams.length + 1}`;
            countParams.push(categoryId);
        }

        const countResult = await pgPool.query(countQuery, countParams);

        return NextResponse.json({
            products,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit,
                offset,
                has_more: (offset + limit) < parseInt(countResult.rows[0].total)
            }
        });
    } catch (error: any) {
        console.error('[products/list] Error:', error);

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
