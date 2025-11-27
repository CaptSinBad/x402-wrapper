#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
    const databaseUrl = process.env.DATABASE_URL;
    console.log('Using DATABASE_URL:', databaseUrl.replace(/:(.*)@/, ':<REDACTED>@'));

    const client = new Client({ connectionString: databaseUrl });

    try {
        await client.connect();
        console.log('Connected to database');

        const migrationsDir = path.resolve(process.cwd(), 'db', 'migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        console.log('Found migrations:', files);

        for (const file of files) {
            console.log(`Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await client.query(sql);
            console.log(`✓ ${file} completed`);
        }

        console.log('\n✅ All migrations completed successfully!');
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        throw err;
    } finally {
        await client.end();
    }
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
