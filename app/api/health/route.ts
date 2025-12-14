import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    const start = Date.now();
    try {
        // 1. Check basic connection
        console.log('[Health] Request received');

        // 2. Test DB Query
        console.log('[Health] Querying DB...');
        const result = await db.query('SELECT NOW() as now');
        console.log('[Health] Query success');

        const duration = Date.now() - start;

        return NextResponse.json({
            status: 'healthy',
            timestamp: result.rows[0].now,
            latency: `${duration}ms`,
            driver: '@neondatabase/serverless',
            env_check: {
                has_url: !!process.env.DATABASE_URL,
                node_env: process.env.NODE_ENV
            }
        });

    } catch (error: any) {
        console.error('[Health] Error:', error);

        // 3. Return detailed error
        return NextResponse.json({
            status: 'unhealthy',
            error: error.message,
            code: error.code,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            duration: `${Date.now() - start}ms`
        }, { status: 500 });
    }
}
