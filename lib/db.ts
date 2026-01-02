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
        // Execute query with 10 second timeout
        const rows = await Promise.race([
            sql(text as any, params || []) as Promise<T[]>,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Query timeout after 10s')), 10000)
            )
        ]);

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
