#!/usr/bin/env node
/*
Reservation reaper worker
- Finds expired `item_reservations` (status='reserved' and expires_at <= now())
- In Postgres path: locks rows FOR UPDATE SKIP LOCKED in a transaction, increments store_items.stock, and marks reservations 'released'
- In Supabase path: best-effort fetch + updates per-row

#!/usr/bin/env node
/*
Reservation reaper worker
- Finds expired `item_reservations` (status='reserved' and expires_at <= now())
- In Postgres path: locks rows FOR UPDATE SKIP LOCKED in a transaction, increments store_items.stock, and marks reservations 'released'
- In Supabase path: best-effort fetch + updates per-row

Exports: doOneIteration()
*/

const { createClient } = require('@supabase/supabase-js');
const { Client: PgClient } = require('pg');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const USE_LOCAL_PG = (process.env.USE_LOCAL_PG !== undefined)
  ? String(process.env.USE_LOCAL_PG).toLowerCase() === 'true'
  : !(SUPABASE_URL && SUPABASE_SERVICE_KEY);

let supabase = null;
let pgClient = null;

if (USE_LOCAL_PG) {
  const pgHost = process.env.PG_HOST || process.env.POSTGRES_HOST || 'postgres';
  const pgUser = process.env.PG_USER || process.env.POSTGRES_USER || 'postgres';
  const pgPassword = process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres';
  const pgDatabase = process.env.PG_DATABASE || process.env.POSTGRES_DB || 'x402';
  const pgPort = Number(process.env.PG_PORT || process.env.POSTGRES_PORT || 5432);

  pgClient = new PgClient({ host: pgHost, user: pgUser, password: pgPassword, database: pgDatabase, port: pgPort });
  #!/usr/bin/env node
  /* Reservation reaper worker
   * Finds expired `item_reservations` (status='reserved' and expires_at <= now())
   * Postgres path: locks rows FOR UPDATE SKIP LOCKED, increments store_items.stock, marks reservations 'released'
   * Supabase path: best-effort fetch + per-row updates
   */

  const { createClient } = require('@supabase/supabase-js');
  const { Client: PgClient } = require('pg');

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const USE_LOCAL_PG = (process.env.USE_LOCAL_PG !== undefined)
    ? String(process.env.USE_LOCAL_PG).toLowerCase() === 'true'
    : !(SUPABASE_URL && SUPABASE_SERVICE_KEY);

  let supabase = null;
  let pgClient = null;

  if (USE_LOCAL_PG) {
    const pgHost = process.env.PG_HOST || process.env.POSTGRES_HOST || 'postgres';
    const pgUser = process.env.PG_USER || process.env.POSTGRES_USER || 'postgres';
    const pgPassword = process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres';
    const pgDatabase = process.env.PG_DATABASE || process.env.POSTGRES_DB || 'x402';
    const pgPort = Number(process.env.PG_PORT || process.env.POSTGRES_PORT || 5432);

    pgClient = new PgClient({ host: pgHost, user: pgUser, password: pgPassword, database: pgDatabase, port: pgPort });
    pgClient.connect().catch((err) => {
      console.error('Failed to connect to local Postgres', err);
      process.exit(1);
    });
    console.log('Reservation reaper: using local Postgres');
  } else {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase env vars NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
      process.exit(1);
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  }

  const BATCH_SIZE = Number(process.env.REAPER_BATCH_SIZE || 50);

  async function doOneIteration() {
    try {
      if (USE_LOCAL_PG) {
        const client = pgClient;
        await client.query('BEGIN');
        try {
          const selRes = await client.query(
            `SELECT * FROM item_reservations WHERE status = 'reserved' AND expires_at <= NOW() ORDER BY expires_at ASC LIMIT $1 FOR UPDATE SKIP LOCKED`,
            [BATCH_SIZE]
          );
          if (!selRes.rowCount) {
            await client.query('COMMIT');
            return { processed: 0 };
          }

          for (const r of selRes.rows) {
            try {
              await client.query('UPDATE store_items SET stock = stock + $2, updated_at = NOW() WHERE id = $1', [r.item_id, r.qty_reserved || 1]);
              await client.query("UPDATE item_reservations SET status='released', updated_at=NOW() WHERE id=$1", [r.id]);
            } catch (innerErr) {
              console.error('failed to release reservation', r.id, innerErr);
            }
          }

          await client.query('COMMIT');
          return { processed: selRes.rowCount };
        } catch (txErr) {
          await client.query('ROLLBACK');
          console.error('reservation reaper transaction failed', txErr);
          return { processed: 0, error: String(txErr && txErr.message) };
        }
      }

      // Supabase best-effort path
      const cutoff = new Date().toISOString();
      const { data: rows, error } = await supabase.from('item_reservations').select('*').eq('status', 'reserved').lte('expires_at', cutoff).order('expires_at', { ascending: true }).limit(BATCH_SIZE);
      if (error) {
        console.error('failed to fetch reservations from supabase', error);
        return { processed: 0, error: String(error) };
      }
      if (!rows || rows.length === 0) return { processed: 0 };

      let processed = 0;
      for (const r of rows) {
        try {
          const { data: itemRows } = await supabase.from('store_items').select('stock').eq('id', r.item_id).limit(1);
          const item = (itemRows && itemRows.length) ? itemRows[0] : null;
          if (item) {
            await supabase.from('store_items').update({ stock: (item.stock || 0) + (r.qty_reserved || 1), updated_at: new Date().toISOString() }).eq('id', r.item_id);
          }
          await supabase.from('item_reservations').update({ status: 'released', updated_at: new Date().toISOString() }).eq('id', r.id);
          processed += 1;
        } catch (e) {
          console.error('failed to release reservation (supabase)', r.id, e);
        }
      }
      return { processed };
    } catch (err) {
      console.error('reservation reaper error', err);
      return { processed: 0, error: String(err && err.message) };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports.doOneIteration = doOneIteration;
  }

  if (typeof require !== 'undefined' && require.main === module) {
    (async () => {
      const res = await doOneIteration();
      console.log('reservation reaper result', res);
      if (pgClient) {
        try { await pgClient.end(); } catch (e) {}
      }
      process.exit(0);
    })();
  }
                  const { data: itemRows } = await supabase.from('store_items').select('stock').eq('id', r.item_id).limit(1);
