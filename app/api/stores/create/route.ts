import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/session';
import crypto from 'crypto';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Generate a unique slug from store name
 */
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * POST /api/stores/create
 * Create a new store for the authenticated user
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await req.json();

        const { store_name, description, logo_url, banner_url, theme_color } = body;

        // Validate required fields
        if (!store_name || store_name.trim().length === 0) {
            return NextResponse.json(
                { error: 'store_name is required' },
                { status: 400 }
            );
        }

        // Generate slug from name
        let baseSlug = generateSlug(store_name);
        let slug = baseSlug;
        let attempt = 0;

        // Ensure unique slug
        while (attempt < 10) {
            const existing = await pgPool.query(
                'SELECT id FROM stores WHERE store_slug = $1',
                [slug]
            );

            if (existing.rows.length === 0) {
                break; // Slug is unique
            }

            // Try with random suffix
            attempt++;
            const randomSuffix = crypto.randomBytes(2).toString('hex');
            slug = `${baseSlug}-${randomSuffix}`;
        }

        if (attempt >= 10) {
            return NextResponse.json(
                { error: 'failed to generate unique slug, please try a different name' },
                { status: 500 }
            );
        }

        // Create store
        const result = await pgPool.query(
            `INSERT INTO stores (
                user_id, store_name, store_slug, description, 
                logo_url, banner_url, theme_color
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                user.id,
                store_name.trim(),
                slug,
                description?.trim() || null,
                logo_url || null,
                banner_url || null,
                theme_color || '#2B5FA5'
            ]
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
        console.error('[stores/create] Error:', error);

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
