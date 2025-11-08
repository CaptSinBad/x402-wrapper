import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const FORCE_PG = String(process.env.USE_LOCAL_PG || process.env.FORCE_PG || 'false').toLowerCase() === 'true';
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY) && !FORCE_PG;

let supabase: any = null;
let pgPool: Pool | null = null;

if (USE_SUPABASE) {
  supabase = createSupabaseClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } });
} else {
  const connectionString = process.env.DATABASE_URL || `postgres://${process.env.PG_USER || 'postgres'}:${process.env.PG_PASSWORD || 'postgres'}@${process.env.PG_HOST || 'localhost'}:${process.env.PG_PORT || 5432}/${process.env.PG_DATABASE || process.env.PG_DB || 'x402'}`;
  pgPool = new Pool({ connectionString });
}

async function insertSellerEndpoint(record: any) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('seller_endpoints').insert([record]).select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  const query = `INSERT INTO seller_endpoints(seller_wallet, endpoint_url, price, currency, scheme, network, facilitator_url, metadata, created_at, updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *`;
  const values = [record.seller_wallet, record.endpoint_url, record.price, record.currency, record.scheme, record.network, record.facilitator_url, record.metadata || {}];
  const res = await pgPool!.query(query, values);
  return res.rows[0];
}

async function insertSettlement(record: any) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('settlements').insert([record]).select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  // Use ON CONFLICT on payment_attempt_id to avoid enqueueing duplicate
  // settlements for the same payment attempt. This requires a unique index
  // on payment_attempt_id (created by migrations/005_settlements_payment_attempt_unique.sql).
  const query = `INSERT INTO settlements(payment_attempt_id, facilitator_request, facilitator_response, status, attempts, last_error, next_retry_at, locked_by, locked_at, created_at, updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
    ON CONFLICT (payment_attempt_id) DO UPDATE SET updated_at=NOW() RETURNING *`;
  const values = [record.payment_attempt_id || null, record.facilitator_request || null, record.facilitator_response || null, record.status || 'queued', record.attempts || 0, record.last_error || null, record.next_retry_at || null, record.locked_by || null, record.locked_at || null];
  const res = await pgPool!.query(query, values);
  return res.rows[0];
}

async function getSellerEndpointByUrl(resourcePath: string) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('seller_endpoints').select('*').eq('endpoint_url', resourcePath).limit(1);
    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  }
  const res = await pgPool!.query('SELECT * FROM seller_endpoints WHERE endpoint_url = $1 LIMIT 1', [resourcePath]);
  return res.rows[0] ?? null;
}

async function getSellerEndpointById(id: string) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('seller_endpoints').select('*').eq('id', id).limit(1);
    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  }
  const res = await pgPool!.query('SELECT * FROM seller_endpoints WHERE id = $1 LIMIT 1', [id]);
  return res.rows[0] ?? null;
}

async function insertPaymentAttempt(record: any) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('payment_attempts').insert([record]).select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  const query = `INSERT INTO payment_attempts(seller_endpoint_id, payment_payload, verifier_response, status, client_ip, user_agent, created_at)
    VALUES($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`;
  const values = [record.seller_endpoint_id || null, record.payment_payload || null, record.verifier_response || null, record.status || 'pending', record.client_ip || null, record.user_agent || null];
  const res = await pgPool!.query(query, values);
  return res.rows[0];
}

async function getPaymentAttemptById(id: string) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('payment_attempts').select('*').eq('id', id).limit(1);
    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  }
  const res = await pgPool!.query('SELECT * FROM payment_attempts WHERE id = $1 LIMIT 1', [id]);
  return res.rows[0] ?? null;
}

async function updatePaymentAttemptStatus(id: string, updates: any) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('payment_attempts').update(updates).eq('id', id).select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  const keys = Object.keys(updates || {});
  if (keys.length === 0) return null;
  const sets = keys.map((k, i) => `${k}=$${i+2}`).join(', ');
  const values = [id, ...keys.map(k => updates[k])];
  const res = await pgPool!.query(`UPDATE payment_attempts SET ${sets}, updated_at=NOW() WHERE id=$1 RETURNING *`, values);
  return res.rows[0];
}

async function listSettlements(limit = 100) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('settlements').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  }
  const res = await pgPool!.query('SELECT * FROM settlements ORDER BY created_at DESC LIMIT $1', [limit]);
  return res.rows;
}

async function getOpenSettlementByPaymentAttempt(attemptId: string) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('settlements').select('*').eq('payment_attempt_id', attemptId).in('status', ['queued', 'retry', 'in_progress']).limit(1);
    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  }
  const res = await pgPool!.query("SELECT * FROM settlements WHERE payment_attempt_id = $1 AND status IN ('queued','retry','in_progress') LIMIT 1", [attemptId]);
  return res.rows[0] ?? null;
}

async function updateSettlementToQueued(id: string) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('settlements').update({ status: 'queued', attempts: 0, last_error: null, next_retry_at: null, updated_at: new Date().toISOString() }).eq('id', id).select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  const res = await pgPool!.query(`UPDATE settlements SET status='queued', attempts=0, last_error=NULL, next_retry_at=NULL, updated_at=NOW() WHERE id=$1 RETURNING *`, [id]);
  return res.rows[0];
}

async function insertPaymentLog(log: any) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('payment_logs').insert([log]).select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  const query = `INSERT INTO payment_logs(level, message, meta, endpoint_id, payer_address, tx_hash, amount, asset, network, success, response, created_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) RETURNING *`;
  const values = [log.level || 'info', log.message || null, log.meta || null, log.endpoint_id || null, log.payer_address || null, log.tx_hash || null, log.amount || null, log.asset || null, log.network || null, log.success || null, log.response || null];
  const res = await pgPool!.query(query, values);
  return res.rows[0];
}

export { insertSellerEndpoint, insertSettlement, getSellerEndpointByUrl, getSellerEndpointById, insertPaymentAttempt, getPaymentAttemptById, updatePaymentAttemptStatus, listSettlements, updateSettlementToQueued, insertPaymentLog, getOpenSettlementByPaymentAttempt };

// Activation code helpers
async function createActivationCode(record: any) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('activation_codes').insert([record]).select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  const query = `INSERT INTO activation_codes(code, seller_endpoint_id, buyer_address, amount, currency, valid_from, valid_until, used, used_by, metadata, created_at, updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()) RETURNING *`;
  const values = [record.code, record.seller_endpoint_id || null, record.buyer_address || null, record.amount || null, record.currency || null, record.valid_from || null, record.valid_until || null, record.used || false, record.used_by || null, record.metadata || null];
  const res = await pgPool!.query(query, values);
  return res.rows[0];
}

async function getActivationCodeByCode(code: string) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('activation_codes').select('*').eq('code', code).limit(1);
    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  }
  const res = await pgPool!.query('SELECT * FROM activation_codes WHERE code = $1 LIMIT 1', [code]);
  return res.rows[0] ?? null;
}

async function markActivationCodeUsed(code: string, usedBy?: string) {
  if (USE_SUPABASE) {
    // only mark if not already used
    const { data, error } = await supabase.from('activation_codes').update({ used: true, used_by: usedBy, updated_at: new Date().toISOString() }).eq('code', code).eq('used', false).select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  const res = await pgPool!.query(`UPDATE activation_codes SET used = TRUE, used_by = $2, updated_at = NOW() WHERE code = $1 AND used = FALSE RETURNING *`, [code, usedBy || null]);
  return res.rows[0] ?? null;
}

export { createActivationCode, getActivationCodeByCode, markActivationCodeUsed };

// Store items & reservations helpers
async function createStoreItem(record: any) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('store_items').insert([record]).select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  const query = `INSERT INTO store_items(seller_id, slug, title, description, price_cents, currency, stock, allow_open_amount, created_at, updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *`;
  const values = [record.seller_id, record.slug, record.title, record.description || null, record.price_cents || 0, record.currency || 'USDC', record.stock || 0, record.allow_open_amount || false];
  const res = await pgPool!.query(query, values);
  return res.rows[0];
}

async function getStoreItemById(id: string) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('store_items').select('*').eq('id', id).limit(1);
    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  }
  const res = await pgPool!.query('SELECT * FROM store_items WHERE id = $1 LIMIT 1', [id]);
  return res.rows[0] ?? null;
}

async function getStoreItemBySlug(slug: string, seller_id?: string) {
  if (USE_SUPABASE) {
    let q = supabase.from('store_items').select('*').eq('slug', slug).limit(1);
    if (seller_id) q = q.eq('seller_id', seller_id);
    const { data, error } = await q;
    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  }
  if (seller_id) {
    const res = await pgPool!.query('SELECT * FROM store_items WHERE slug = $1 AND seller_id = $2 LIMIT 1', [slug, seller_id]);
    return res.rows[0] ?? null;
  }
  const res = await pgPool!.query('SELECT * FROM store_items WHERE slug = $1 LIMIT 1', [slug]);
  return res.rows[0] ?? null;
}

// Payment links helpers
async function createPaymentLink(record: any) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('payment_links').insert([record]).select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  const query = `INSERT INTO payment_links(token, seller_id, item_id, endpoint_id, price_cents, currency, network, metadata, expires_at, created_at, updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`;
  const values = [record.token, record.seller_id || null, record.item_id || null, record.endpoint_id || null, record.price_cents || null, record.currency || null, record.network || null, record.metadata || null, record.expires_at || null];
  const res = await pgPool!.query(query, values);
  return res.rows[0];
}

async function getPaymentLinkByToken(token: string) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('payment_links').select('*').eq('token', token).limit(1);
    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  }
  const res = await pgPool!.query('SELECT * FROM payment_links WHERE token = $1 LIMIT 1', [token]);
  return res.rows[0] ?? null;
}

// Reserve a quantity of an item atomically. Returns reservation record.
async function reserveItem({ item_id, seller_id, qty = 1, ttlSeconds = 900 }: { item_id: string; seller_id?: string; qty?: number; ttlSeconds?: number }) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  if (USE_SUPABASE) {
    // naive supabase implementation: check then update then insert. Not fully atomic but acceptable for small scale.
    const { data: itemData, error: itemErr } = await supabase.from('store_items').select('*').eq('id', item_id).limit(1);
    if (itemErr) throw itemErr;
    const item = (itemData && itemData.length) ? itemData[0] : null;
    if (!item) throw new Error('item_not_found');
    if (item.stock < qty) throw new Error('insufficient_stock');
    const { data: upd, error: updErr } = await supabase.from('store_items').update({ stock: item.stock - qty, updated_at: new Date().toISOString() }).eq('id', item_id).eq('stock', item.stock).select();
    if (updErr) throw updErr;
    if (!upd || upd.length === 0) throw new Error('concurrent_update_failed');
    const reservation = { item_id, seller_id: seller_id || item.seller_id, qty_reserved: qty, status: 'reserved', reserved_at: new Date().toISOString(), expires_at: expiresAt, payment_attempt_id: null };
    const { data: resData, error: resErr } = await supabase.from('item_reservations').insert([reservation]).select();
    if (resErr) throw resErr;
    return resData?.[0] ?? null;
  }

  // Postgres transactional path
  const client = await pgPool!.connect();
  try {
    await client.query('BEGIN');
    const updRes = await client.query('UPDATE store_items SET stock = stock - $2, updated_at = NOW() WHERE id = $1 AND stock >= $2 RETURNING *', [item_id, qty]);
    if (updRes.rowCount === 0) {
      await client.query('ROLLBACK');
      throw new Error('insufficient_stock');
    }
    const insertRes = await client.query(`INSERT INTO item_reservations(item_id, seller_id, reservation_key, qty_reserved, status, reserved_at, expires_at, payment_attempt_id, created_at, updated_at)
      VALUES($1,$2,gen_random_uuid(),$3,'reserved',NOW(),$4,NULL,NOW(),NOW()) RETURNING *`, [item_id, seller_id || updRes.rows[0].seller_id, qty, expiresAt]);
    await client.query('COMMIT');
    return insertRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getReservationById(id: string) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('item_reservations').select('*').eq('id', id).limit(1);
    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  }
  const res = await pgPool!.query('SELECT * FROM item_reservations WHERE id = $1 LIMIT 1', [id]);
  return res.rows[0] ?? null;
}

// Confirm a reservation (mark confirmed). Should be called after successful settlement. Returns updated reservation.
async function confirmReservation(id: string) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('item_reservations').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'reserved').select();
    if (error) throw error;
    return data?.[0] ?? null;
  }
  const client = await pgPool!.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(`UPDATE item_reservations SET status='confirmed', updated_at=NOW() WHERE id=$1 AND status='reserved' RETURNING *`, [id]);
    await client.query('COMMIT');
    return res.rows[0] ?? null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Release a reservation and restore stock
async function releaseReservation(id: string) {
  if (USE_SUPABASE) {
    const { data: resData, error: resErr } = await supabase.from('item_reservations').select('*').eq('id', id).limit(1);
    if (resErr) throw resErr;
    const reservation = (resData && resData.length) ? resData[0] : null;
    if (!reservation) return null;
    if (reservation.status !== 'reserved') return reservation;
    // restore stock
    const { data: itemData, error: itemErr } = await supabase.from('store_items').select('*').eq('id', reservation.item_id).limit(1);
    if (itemErr) throw itemErr;
    const item = (itemData && itemData.length) ? itemData[0] : null;
    if (!item) return null;
    const { data: upd, error: updErr } = await supabase.from('store_items').update({ stock: item.stock + reservation.qty_reserved, updated_at: new Date().toISOString() }).eq('id', item.id).select();
    if (updErr) throw updErr;
    const { data: updatedRes, error: rErr } = await supabase.from('item_reservations').update({ status: 'released', updated_at: new Date().toISOString() }).eq('id', id).select();
    if (rErr) throw rErr;
    return updatedRes?.[0] ?? null;
  }
  const client = await pgPool!.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query('SELECT * FROM item_reservations WHERE id = $1 FOR UPDATE', [id]);
    if (res.rowCount === 0) { await client.query('ROLLBACK'); return null; }
    const reservation = res.rows[0];
    if (reservation.status !== 'reserved') { await client.query('COMMIT'); return reservation; }
    await client.query('UPDATE store_items SET stock = stock + $2, updated_at = NOW() WHERE id = $1', [reservation.item_id, reservation.qty_reserved]);
    const upd = await client.query("UPDATE item_reservations SET status='released', updated_at=NOW() WHERE id=$1 RETURNING *", [id]);
    await client.query('COMMIT');
    return upd.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Atomically confirm a reservation and insert a sales row for it.
// This ensures the confirm+sale creation happens once (idempotent): the
// function only creates a sale when the reservation's status transitions
// from 'reserved' -> 'confirmed'. Returns the sale row when created, or
// null if the reservation was not in a state to be confirmed.
async function confirmReservationAndCreateSale(reservationId: string, opts?: { payment_attempt_id?: string | null; settlement_id?: string | null; purchaser_address?: string | null }) {
  const payment_attempt_id = opts?.payment_attempt_id || null;
  const settlement_id = opts?.settlement_id || null;
  const purchaser_address = opts?.purchaser_address || null;

  if (USE_SUPABASE) {
    // Supabase: best-effort atomic-ish sequence: select -> update with eq(status,'reserved') -> insert sale
    const { data: rData, error: rErr } = await supabase.from('item_reservations').select('*').eq('id', reservationId).limit(1);
    if (rErr) throw rErr;
    const reservation = (rData && rData.length) ? rData[0] : null;
    if (!reservation || reservation.status !== 'reserved') return null;

    const { data: updRes, error: updErr } = await supabase.from('item_reservations').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', reservationId).eq('status', 'reserved').select();
    if (updErr) throw updErr;
    if (!updRes || updRes.length === 0) return null;

    // fetch item to compute amount/title
    let amountCents = 0;
    let currency = (reservation.currency || 'USDC');
    let itemTitle = null;
    try {
      const { data: itemRows } = await supabase.from('store_items').select('price_cents,currency,title').eq('id', reservation.item_id).limit(1);
      const itemRow = (itemRows && itemRows.length) ? itemRows[0] : null;
      if (itemRow) {
        const price = Number(itemRow.price_cents || 0);
        const qty = Number(reservation.qty_reserved || 1);
        amountCents = price * qty;
        if (itemRow.currency) currency = itemRow.currency;
        itemTitle = itemRow.title || null;
      }
    } catch (e) {
      // ignore and fallback
    }

    const sale = {
      seller_id: reservation.seller_id || null,
      item_id: reservation.item_id || null,
      item_title: itemTitle || null,
      reservation_id: reservation.id,
      payment_attempt_id,
      settlement_id,
      qty: reservation.qty_reserved || 1,
      amount_cents: amountCents,
      currency,
      purchaser_address: purchaser_address || null,
      metadata: { createdBy: 'confirmReservationAndCreateSale' },
    };
    const { data: saleData, error: saleErr } = await supabase.from('sales').insert([sale]).select();
    if (saleErr) throw saleErr;
    return (saleData && saleData.length) ? saleData[0] : null;
  }

  // Postgres transactional path
  const client = await pgPool!.connect();
  try {
    await client.query('BEGIN');
    const rRes = await client.query('SELECT * FROM item_reservations WHERE id = $1 FOR UPDATE', [reservationId]);
    if (rRes.rowCount === 0) { await client.query('ROLLBACK'); return null; }
    const reservation = rRes.rows[0];
    if (reservation.status !== 'reserved') { await client.query('COMMIT'); return null; }

    // mark confirmed
    await client.query("UPDATE item_reservations SET status='confirmed', updated_at=NOW() WHERE id=$1", [reservationId]);

    // determine per-item price and title
    let amountCents = 0;
    let currency = 'USDC';
    let itemTitle = null;
    try {
      const itemRes = await client.query('SELECT price_cents, currency, title FROM store_items WHERE id = $1 LIMIT 1', [reservation.item_id]);
      if (itemRes.rowCount) {
        const itemRow = itemRes.rows[0];
        const price = Number(itemRow.price_cents || 0);
        const qty = Number(reservation.qty_reserved || 1);
        amountCents = price * qty;
        if (itemRow.currency) currency = itemRow.currency;
        itemTitle = itemRow.title || null;
      }
    } catch (e) {
      // ignore and fallback
    }

    const insertRes = await client.query(`INSERT INTO sales(seller_id, item_id, item_title, reservation_id, payment_attempt_id, settlement_id, qty, amount_cents, currency, purchaser_address, metadata, created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) RETURNING *`, [
      reservation.seller_id || null,
      reservation.item_id || null,
      itemTitle,
      reservation.id,
      payment_attempt_id,
      settlement_id,
      reservation.qty_reserved || 1,
      amountCents,
      currency,
      purchaser_address || null,
      JSON.stringify({ createdBy: 'confirmReservationAndCreateSale' }),
    ]);

    await client.query('COMMIT');
    return insertRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { createStoreItem, getStoreItemById, getStoreItemBySlug, reserveItem, getReservationById, confirmReservation, releaseReservation, confirmReservationAndCreateSale, createPaymentLink, getPaymentLinkByToken };

