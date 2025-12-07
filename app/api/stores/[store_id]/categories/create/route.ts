import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/session';
import crypto from 'crypto';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Generate URL-friendly slug from category name
 */
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * POST /api/stores/[store_id]/categories/create
 * Create a new category for a store
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ store_id: string }> }
) {
    try {
        const user = await requireAuth();
        const params = await context.params;
        const storeId = params.store_id;
        const body = await req.json();

        const { name, description, display_order } = body;

        // Validate
        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'name is required' },
                { status: 400 }
            );
        }

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

        // Generate unique slug
        let baseSlug = generateSlug(name);
        let slug = baseSlug;
        let attempt = 0;

        while (attempt < 10) {
            const existing = await pgPool.query(
                'SELECT id FROM categories WHERE store_id = $1 AND slug = $2',
                [storeId, slug]
            );

            if (existing.rows.length === 0) {
                break;
            }

            attempt++;
            const randomSuffix = crypto.randomBytes(2).toString('hex');
            slug = `${baseSlug}-${randomSuffix}`;
        }

        if (attempt >= 10) {
            return NextResponse.json(
                { error: 'failed to generate unique slug' },
                { status: 500 }
            );
        }

        // Create category
        const result = await pgPool.query(
            `INSERT INTO categories (
                store_id, name, slug, description, display_order
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                storeId,
                name.trim(),
                slug,
                description?.trim() || null,
                display_order || 0
            ]
        );

        const category = result.rows[0];

        return NextResponse.json({
            category: {
                id: category.id,
                store_id: category.store_id,
                name: category.name,
                slug: category.slug,
                description: category.description,
                display_order: category.display_order,
                active: category.active,
                created_at: category.created_at,
                updated_at: category.updated_at
            }
        });
    } catch (error: any) {
        console.error('[categories/create] Error:', error);

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
