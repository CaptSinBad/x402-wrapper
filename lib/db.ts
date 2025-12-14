import { Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

// Use the Pool from @neondatabase/serverless
// This is a drop-in replacement for pg.Pool but designed for serverless environments (Vercel)
// It handles WebSockets/HTTP connections automatically.
export const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    // ssl is automatically handled by the driver for neon hosts
});
