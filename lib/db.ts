import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

const sql = neon(process.env.DATABASE_URL);

// Wrapper to make neon HTTP driver look like pg.Pool
export const db = {
    query: async (text: string, params?: any[]) => {
        // Log query text for debug
        // console.log('[DB HTTP] Query:', text);
        try {
            // neon http driver returns array of rows directly
            const res = await sql(text, params ?? []);
            return { rows: res };
        } catch (error) {
            console.error('[DB HTTP] Error:', error);
            throw error;
        }
    }
};
