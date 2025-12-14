import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

// Create a SQL query executor
const sql = neon(process.env.DATABASE_URL);

/**
 * Wrapper for database queries to provide a consistent interface.
 * This simplifies the migration from pg.Pool style (result.rows) to neon style (array).
 */
export const db = {
    query: async (text: string, params?: any[]) => {
        // Console log for debugging latency
        const start = Date.now();
        try {
            const result = await sql(text, params);
            const duration = Date.now() - start;
            if (duration > 1000) {
                console.warn(`[Slow Query] ${duration}ms: ${text.slice(0, 50)}...`);
            }
            // neon returns rows directly, so we map it to match pg result structure
            // to minimize refactoring churn in session.ts and auth routes.
            return { rows: result };
        } catch (error) {
            console.error('[DB Error]', error);
            throw error;
        }
    }
};
