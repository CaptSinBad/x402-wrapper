import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '../../../../../lib/session';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/dashboard/developers/projects
 * Get user's projects with API keys
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        const result = await pgPool.query(
            `SELECT 
        id, 
        name, 
        environment, 
        public_key, 
        webhook_secret,
        x402_tenant_id,
        x402_network,
        created_at
       FROM projects 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
            [user.id]
        );

        return NextResponse.json({
            projects: result.rows,
        });
    } catch (error: any) {
        console.error('[dashboard/developers/projects] Error:', error);

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
