import { Pool, QueryResultRow } from 'pg';
import type { QueryResult } from 'pg';

/**
 * Simple database connection pool (no auth dependencies)
 */
let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        pool = new Pool({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        pool.on('error', (err) => {
            console.error('[DB Pool] Unexpected error:', err);
        });
    }

    return pool;
}

/**
 * Execute a database query
 */
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const pool = getPool();
    return pool.query<T>(text, params);
}

/**
 * Close the database pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
