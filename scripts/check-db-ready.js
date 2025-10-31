#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  content.split(/\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2] || '';
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

loadDotEnv(path.resolve(process.cwd(), '.env.postgres'));

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || (() => {
  const user = process.env.POSTGRES_USER || 'postgres';
  const pass = process.env.POSTGRES_PASSWORD || '';
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const db = process.env.POSTGRES_DB || 'x402';
  if (pass === '') return null;
  return `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
})();

if (!databaseUrl) {
  console.error('No DATABASE_URL or POSTGRES_* env vars found.');
  process.exit(2);
}

(async () => {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const res = await client.query('SELECT 1');
    if (res && res.rowCount === 1) {
      console.log('DB ready');
      process.exit(0);
    }
    console.error('Unexpected DB response');
    process.exit(3);
  } catch (err) {
    console.error('DB check failed:', err.message);
    process.exit(1);
  } finally {
    try { await client.end(); } catch(e) {}
  }
})();
