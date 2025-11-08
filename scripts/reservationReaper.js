#!/usr/bin/env node
/**
 * reservationReaper.js
 *
 * Small utility to find expired reservations (status='reserved' and expires_at <= now)
 * and release them using the DB helper `releaseReservation` so stock is restored.
 *
 * Usage:
 *   node scripts/reservationReaper.js      # runs once
 *   RUN_ONCE=false node scripts/reservationReaper.js  # default behavior is run-once
 */

const { Client: PgClient } = require('pg');
const { createClient } = require('@supabase/supabase-js');

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

const RUN_ONCE = String(process.env.RUN_ONCE || 'true').toLowerCase() === 'true';
const POLL_INTERVAL_MS = Number(process.env.REAPER_POLL_MS || 60 * 1000);

async function findExpiredReservations() {
  if (USE_LOCAL_PG) {
    const res = await pgClient.query("SELECT id FROM item_reservations WHERE status = 'reserved' AND expires_at <= NOW() ORDER BY expires_at ASC LIMIT 100");
    return res.rows.map(r => r.id);
  }
  const { data, error } = await supabase.from('item_reservations').select('id').eq('status', 'reserved').lte('expires_at', new Date().toISOString()).order('expires_at', { ascending: true }).limit(100);
  if (error) throw error;
  return (data || []).map(d => d.id);
}

async function releaseReservationById(id) {
  if (USE_LOCAL_PG) {
    // call into releaseReservation logic: we replicate minimal steps here to avoid importing TS helper
    try {
      await pgClient.query('BEGIN');
      const res = await pgClient.query('SELECT * FROM item_reservations WHERE id = $1 FOR UPDATE', [id]);
      if (res.rowCount === 0) { await pgClient.query('ROLLBACK'); return null; }
      const reservation = res.rows[0];
      if (reservation.status !== 'reserved') { await pgClient.query('COMMIT'); return reservation; }
      await pgClient.query('UPDATE store_items SET stock = stock + $2, updated_at = NOW() WHERE id = $1', [reservation.item_id, reservation.qty_reserved]);
      const upd = await pgClient.query("UPDATE item_reservations SET status='released', updated_at=NOW() WHERE id=$1 RETURNING *", [id]);
      await pgClient.query('COMMIT');
      return upd.rows[0];
    } catch (err) {
      await pgClient.query('ROLLBACK');
      throw err;
    }
  }
  // Supabase path
  const { data: rData } = await supabase.from('item_reservations').select('*').eq('id', id).limit(1);
  const reservation = (rData && rData.length) ? rData[0] : null;
  if (!reservation) return null;
  if (reservation.status !== 'reserved') return reservation;
  const { data: itemData } = await supabase.from('store_items').select('*').eq('id', reservation.item_id).limit(1);
  const item = (itemData && itemData.length) ? itemData[0] : null;
  if (item) {
    await supabase.from('store_items').update({ stock: (item.stock || 0) + (reservation.qty_reserved || 1), updated_at: new Date().toISOString() }).eq('id', item.id);
  }
  const { data: updatedRes } = await supabase.from('item_reservations').update({ status: 'released', updated_at: new Date().toISOString() }).eq('id', id).select();
  return (updatedRes && updatedRes.length) ? updatedRes[0] : null;
}

async function doOneIteration() {
  try {
    const expired = await findExpiredReservations();
    if (!expired || expired.length === 0) {
      console.log('No expired reservations found');
      return;
    }
    console.log(`Found ${expired.length} expired reservations`);
    for (const id of expired) {
      try {
        const r = await releaseReservationById(id);
        console.log('Released reservation', id);
      } catch (err) {
        console.error('Failed to release reservation', id, err);
      }
    }
  } catch (err) {
    console.error('reaper error', err);
  }
}

async function main() {
  if (RUN_ONCE) {
    await doOneIteration();
    if (pgClient) {
      try { await pgClient.end(); } catch (e) {}
    }
    process.exit(0);
  }
  while (true) {
    await doOneIteration();
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

if (require.main === module) {
  main().catch(err => { console.error('reaper failed', err); process.exit(1); });
}

module.exports = { doOneIteration };
