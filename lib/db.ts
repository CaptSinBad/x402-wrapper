import { neon, neonConfig } from '@neondatabase/serverless';

// Configure neon to use fetch (default, but explicit is good)
neonConfig.fetchConnectionCache = true;

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
 * Execute a query using the Neon HTTP driver
 * 
 * This is stateless and serverless-friendly. 
 * It uses a single HTTP request per query.
 * 
 * @param text SQL query string
 * @param params Query parameters
 * @returns Query result compatible with pg structure
 */
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error(
            'DATABASE_URL environment variable is not set. ' +
            'Please configure your database connection string.'
        );
    }

    // Create a new SQL client for this request (lightweight)
    const sql = neon(connectionString);

    try {
        // Execute query
        // neon() returns standard array of objects key-value pairs
        // We wrap it to match the existing 'pg' QueryResult structure
        // Cast text to any because TypeScript definition might be expecting TemplateStringsArray only
        const rows = await sql(text as any, params || []) as T[];

        return {
            rows,
            command: 'SELECT', // Approximation
            rowCount: rows.length,
            oid: 0,
            fields: []
        };
    } catch (error) {
        console.error('[DB] Query failed:', error);
        throw error;
    }
}

/**
 * No-op: HTTP driver doesn't need closing
 */
export async function closePool(): Promise<void> {
    // No-op for HTTP driver
}
