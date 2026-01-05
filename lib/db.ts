import { neon } from '@neondatabase/serverless';

/**
 * Serverless HTTP-based database client (no connection pooling)
 * This prevents timeouts on Vercel
 */

export interface QueryResultRow {
    [column: string]: any;
}

export interface QueryResult<R extends QueryResultRow = any> {
    rows: R[];
    command: string;
    rowCount: number | null;
    oid: number;
    fields: any[];
}

/**
 * Execute a database query using Neon's HTTP driver
 * This is stateless and won't hang on serverless
 */
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
    }

    const sql = neon(connectionString);

    try {
        // Neon driver requires using .query() for parameterized queries
        const rows = await sql.query(text, params || []) as T[];

        return {
            rows,
            command: 'SELECT',
            rowCount: rows.length,
            oid: 0,
            fields: []
        };
    } catch (error: any) {
        console.error('[DB] Query error:', error.message);
        throw error;
    }
}

/**
 * No cleanup needed with HTTP driver
 */
export async function closePool(): Promise<void> {
    // No-op - HTTP driver is stateless
}
