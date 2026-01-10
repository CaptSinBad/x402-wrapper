import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/stores/my-store
 * Get the current user's store
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        const result = await pgPool.query(
            `SELECT * FROM stores WHERE user_id = $1 LIMIT 1`,
            [user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'no_store_found' },
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
        console.error('[stores/my-store] Error:', error);

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
