import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

/**
 * Get or create the singleton database Pool
 * 
 * Uses connection pooling with proper SSL config for Neon
 * Throws error if DATABASE_URL is not configured
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

        pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false,
            },
            // Connection pool settings
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000, // Close idle clients after 30s
            connectionTimeoutMillis: 10000, // Timeout after 10s if can't connect
        });

        // Log pool errors
        pool.on('error', (err) => {
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
export async function query<T = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const pool = getDbPool();
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
