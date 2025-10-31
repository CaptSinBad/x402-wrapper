import { NextResponse } from 'next/server';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

function loadLocalEnv() {
  try {
    const p = path.resolve(process.cwd(), '.env.postgres');
    if (!fs.existsSync(p)) return;
    const content = fs.readFileSync(p, 'utf8');
    content.split(/\n/).forEach(line => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2];
      }
    });
  } catch (err) {
    // ignore
  }
}

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || ((): string | null => {
  const user = process.env.POSTGRES_USER || 'postgres';
  const pass = process.env.POSTGRES_PASSWORD || '';
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const db = process.env.POSTGRES_DB || 'x402';
  if (!pass) return null;
  return `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
})();

export async function GET() {
  const body: any = { ok: true, db: 'unknown' };
  if (!databaseUrl) {
    body.ok = false;
    body.db = 'no_database_url';
    return NextResponse.json(body, { status: 503 });
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query('SELECT 1');
    body.db = 'ok';
    return NextResponse.json(body);
  } catch (err: any) {
    body.ok = false;
    body.db = 'error';
    body.error = err?.message ?? String(err);
    return NextResponse.json(body, { status: 502 });
  } finally {
    try { await client.end(); } catch (e) {}
  }
}
