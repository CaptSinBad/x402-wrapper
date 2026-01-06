const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env
function loadDotEnv(file) {
    if (!fs.existsSync(file)) return;
    console.log('Loading env from', file);
    const content = fs.readFileSync(file, 'utf8');
    content.split(/\n/).forEach(line => {
        const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
        if (m) {
            if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
        }
    });
}

loadDotEnv(path.resolve(process.cwd(), '.env.postgres'));
loadDotEnv(path.resolve(process.cwd(), '.env'));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Error: DATABASE_URL not found in .env');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        await client.connect();
        console.log('Connected to database at:', new URL(connectionString).host);

        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'projects';
        `);

        const columns = res.rows.map(r => `${r.column_name} (${r.data_type})`);
        console.log('\nCurrent "projects" table columns:', columns);

        const colNames = res.rows.map(r => r.column_name);

        const missing = [];
        // Check for columns used in the payment link creation
        const required = ['x402_tenant_id', 'x402_network', 'id', 'public_key'];

        required.forEach(req => {
            if (!colNames.includes(req)) missing.push(req);
        });

        if (missing.length > 0) {
            console.error('\n❌ CRITICAL: Missing columns in "projects" table:', missing);
            console.log('The migration did NOT apply correctly.');
        } else {
            console.log('\n✅ SUCCESS: All required columns are present in projects table.');
        }

    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await client.end();
    }
}

checkSchema();
