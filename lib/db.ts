import { Pool, PoolConfig, QueryResult, QueryResultRow } from '@neondatabase/serverless';

let pool: Pool | null = null;

/**
 * Get or create the singleton database Pool
 * 
 * Uses @neondatabase/serverless for Vercel compatibility
 * This driver uses WebSockets which work correctly in serverless functions
 * where standard TCP connections (pg) often hang or timeout.
 */
export function getDbPool(): Pool {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
            throw new Error(
                'DATABASE_URL environment variable is not set. ' +
                'Please configure your database connection string.'
            );
        }

        // Configure for Neon serverless
        // No need for complex SSL config, the driver handles it
        pool = new Pool({
            connectionString,
            connectionTimeoutMillis: 5000,
            max: 10, // Lower pool size for serverless
        });

        // Log pool errors
        pool.on('error', (err: Error) => {
            console.error('[DB Pool] Unexpected error on idle client', err);
        });
    }

    return pool;
}

/**
 * Execute a query using the connection pool
 * 
 * @param text SQL query string
 * @param params Query parameters
 * @returns Query result
 */
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const pool = getDbPool();
    // Use type casting to ensure compatibility with explicit generic
    return pool.query(text, params) as Promise<QueryResult<T>>;
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
