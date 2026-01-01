import { Pool } from 'pg';

/**
 * Interface representing a database row
 */
export interface QueryResultRow {
    [column: string]: any;
}

/**
 * Interface mimicking the pg QueryResult for compatibility
 */
export interface QueryResult<R extends QueryResultRow = any> {
    rows: R[];
    command: string;
    rowCount: number | null;
    oid: number;
    fields: any[];
}

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
    const dbPool = getPool();
    const result = await dbPool.query(text, params);

    return {
        rows: result.rows as T[],
        command: result.command || 'SELECT',
        rowCount: result.rowCount,
        oid: result.oid || 0,
        fields: result.fields || []
    };
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
