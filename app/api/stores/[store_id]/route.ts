import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/session';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/stores/[id]
 * Fetch store details by ID
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth();
        const params = await context.params;
        const storeId = params.store_id;

        const result = await pgPool.query(
            `SELECT * FROM stores WHERE id = $1 AND user_id = $2`,
            [storeId, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'store_not_found' },
                { status: 404 }
            );
        }

        const store = result.rows[0];
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
                active: store.active,
                url: `${baseUrl}/s/${store.store_slug}`,
                created_at: store.created_at,
                updated_at: store.updated_at
            }
        });
    } catch (error: any) {
        console.error('[stores/[id]] Error:', error);

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
 * PATCH /api/stores/[id]
 * Update store details
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth();
        const params = await context.params;
        const storeId = params.store_id;
        const body = await req.json();

        // Verify ownership
        const ownership = await pgPool.query(
            `SELECT id FROM stores WHERE id = $1 AND user_id = $2`,
            [storeId, user.id]
        );

        if (ownership.rows.length === 0) {
            return NextResponse.json(
                { error: 'store_not_found' },
                { status: 404 }
            );
        }

        const { store_name, description, logo_url, banner_url, theme_color, active } = body;

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (store_name !== undefined) {
            updates.push(`store_name = $${paramIndex++}`);
            values.push(store_name.trim());
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description?.trim() || null);
        }
        if (logo_url !== undefined) {
            updates.push(`logo_url = $${paramIndex++}`);
            values.push(logo_url || null);
        }
        if (banner_url !== undefined) {
            updates.push(`banner_url = $${paramIndex++}`);
            values.push(banner_url || null);
        }
        if (theme_color !== undefined) {
            updates.push(`theme_color = $${paramIndex++}`);
            values.push(theme_color);
        }
        if (active !== undefined) {
            updates.push(`active = $${paramIndex++}`);
            values.push(active);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: 'no_fields_to_update' },
                { status: 400 }
            );
        }

        updates.push(`updated_at = NOW()`);
        values.push(storeId);

        const result = await pgPool.query(
            `UPDATE stores SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        const store = result.rows[0];
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
                active: store.active,
                url: `${baseUrl}/s/${store.store_slug}`,
                created_at: store.created_at,
                updated_at: store.updated_at
            }
        });
    } catch (error: any) {
        console.error('[stores/[id]] PATCH Error:', error);

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
 * DELETE /api/stores/[id]
 * Soft-delete store (set active = false)
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth();
        const params = await context.params;
        const storeId = params.store_id;

        const result = await pgPool.query(
            `UPDATE stores SET active = false, updated_at = NOW() 
             WHERE id = $1 AND user_id = $2 
             RETURNING id`,
            [storeId, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'store_not_found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            deleted: true,
            id: storeId
        });
    } catch (error: any) {
        console.error('[stores/[id]] DELETE Error:', error);

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
