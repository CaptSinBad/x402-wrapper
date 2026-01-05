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
            WHERE table_name = 'products';
        `);

        const columns = res.rows.map(r => `${r.column_name} (${r.data_type})`);
        console.log('\nCurrent "products" table columns:', columns);

        const colNames = res.rows.map(r => r.column_name);
        const imagesCol = res.rows.find(r => r.column_name === 'images');
        if (imagesCol) console.log('Images column type:', imagesCol.data_type);

        const missing = [];
        if (!colNames.includes('store_id')) missing.push('store_id');
        if (!colNames.includes('category_id')) missing.push('category_id');

        if (missing.length > 0) {
            console.error('\n❌ CRITICAL: Missing columns in "products" table:', missing);
            console.log('The migration did NOT apply correctly.');
        } else {
            console.log('\n✅ SUCCESS: All required columns are present.');
        }

    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await client.end();
    }
}

checkSchema();
