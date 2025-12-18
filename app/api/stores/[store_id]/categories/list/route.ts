import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/session';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/stores/[store_id]/categories/list
 * List all categories for a store
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ store_id: string }> }
) {
    try {
        const user = await requireAuth();
        const params = await context.params;
        const storeId = params.store_id;

        // Verify store ownership
        const storeCheck = await pgPool.query(
            'SELECT id FROM stores WHERE id = $1 AND user_id = $2',
            [storeId, user.id]
        );

        if (storeCheck.rows.length === 0) {
            return NextResponse.json(
                { error: 'store_not_found or unauthorized' },
                { status: 404 }
            );
        }

        // Fetch categories with product counts
        const result = await pgPool.query(
            `SELECT 
                c.*,
                COUNT(p.id) as product_count
             FROM categories c
             LEFT JOIN products p ON p.category_id = c.id AND p.active = true
             WHERE c.store_id = $1
             GROUP BY c.id
             ORDER BY c.display_order ASC, c.created_at DESC`,
            [storeId]
        );

        const categories = result.rows.map((cat: any) => ({
            id: cat.id,
            store_id: cat.store_id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            display_order: cat.display_order,
            active: cat.active,
            product_count: parseInt(cat.product_count),
            created_at: cat.created_at,
            updated_at: cat.updated_at
        }));

        return NextResponse.json({
            categories,
            total: categories.length
        });
    } catch (error: any) {
        console.error('[categories/list] Error:', error);

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
