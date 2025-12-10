import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

// Global pool instance to prevent creating multiple connections in serverless environment
let pool: Pool;

declare global {
    var pgPool: Pool | undefined;
}

if (process.env.NODE_ENV === 'production') {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for Neon/Vercel mostly to avoid self-signed cert errors
        },
        connectionTimeoutMillis: 5000, // Fail fast if DB is unreachable
    });
} else {
    // In development, use a global variable so we don't spam connections on hot reload
    if (!global.pgPool) {
        global.pgPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            },
            connectionTimeoutMillis: 5000,
        });
    }
    pool = global.pgPool;
}

export const db = pool;
