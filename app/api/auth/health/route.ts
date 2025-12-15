import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

// Use a separate pool for health check to ensure isolation
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    // Try to mimic the production session.ts config first (no explicit SSL object, relying on query string)
});

export async function GET() {
    const start = Date.now();
    try {
        console.log('[Health] Request received');
        console.log('[Health] DATABASE_URL exists:', !!process.env.DATABASE_URL);

        // Attempt connection
        const client = await pool.connect();
        console.log('[Health] Connected acquired');

        const res = await client.query('SELECT NOW() as now, current_version() as version');
        client.release();

        const duration = Date.now() - start;

        return NextResponse.json({
            status: 'healthy',
            time: res.rows[0].now,
            version: res.rows[0].version,
            latency: `${duration}ms`,
            driver: 'pg'
        });
    } catch (error: any) {
        console.error('[Health] Failed:', error);
        return NextResponse.json({
            status: 'unhealthy',
            error: error.message,
            code: error.code,
            name: error.name,
            masked_url: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@') : 'MISSING',
            duration: `${Date.now() - start}ms`
        }, { status: 500 });
    }
}
