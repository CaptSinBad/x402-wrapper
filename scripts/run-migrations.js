#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  content.split(/\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2] || '';
      // strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

// Try to load .env.postgres if present (untracked local file)
loadDotEnv(path.resolve(process.cwd(), '.env.postgres'));
// Fallback to .env or env vars already present

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRESQL_URL || (() => {
  // construct from POSTGRES_* vars if available
  const user = process.env.POSTGRES_USER || 'postgres';
  const pass = process.env.POSTGRES_PASSWORD || '';
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const db = process.env.POSTGRES_DB || 'x402';
  if (pass === '') return null;
  return `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
})();

if (!databaseUrl) {
  console.error('ERROR: No DATABASE_URL or POSTGRES_* env vars found. Create .env.postgres or export DATABASE_URL.');
  process.exit(1);
}

async function run() {
  console.log('Using DATABASE_URL:', databaseUrl.replace(/:(.*)@/, ':<REDACTED>@'));
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const migrationsDir = path.resolve(process.cwd(), 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    console.log('Found migrations:', files);
    for (const f of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
      console.log('\n--- Running', f);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Applied', f);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to apply', f, err.message);
        throw err;
      }
    }
    console.log('\nMigrations complete.');
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error('Migration run failed:', err);
  process.exit(1);
});
