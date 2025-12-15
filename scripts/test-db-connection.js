require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function testConnection() {
    console.log('--- Database Connection Test ---');

    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL is missing from .env.local');
        process.exit(1);
    }

    // Mask the password for safety when logging
    const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
    console.log(`Testing connection to: ${maskedUrl}`);

    try {
        const start = Date.now();
        console.log('Attempting to query using Neon HTTP driver...');

        const sql = neon(process.env.DATABASE_URL);
        const result = await sql('SELECT NOW() as now, current_version() as version');

        const duration = Date.now() - start;
        console.log('✅ Connection Sucessful!');
        console.log(`Latency: ${duration}ms`);
        console.log(`Server Time: ${result[0].now}`);
        console.log(`Version: ${result[0].version}`);
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Connection Failed!');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
        process.exit(1);
    }
}

testConnection();
