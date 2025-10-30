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
  const connectionString = process.env.DATABASE_URL || `postgres://${process.env.PG_USER || 'postgres'}:${process.env.PG_PASSWORD || 'postgres'}@${process.env.PG_HOST || 'localhost'}:${process.env.PG_PORT || 5432}/${process.env.PG_DATABASE || process.env.PG_DB || 'x402db'}`;
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
  const query = `INSERT INTO settlements(payment_attempt_id, facilitator_request, facilitator_response, status, attempts, last_error, next_retry_at, locked_by, locked_at, created_at, updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`;
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

async function listSettlements(limit = 100) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('settlements').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  }
  const res = await pgPool!.query('SELECT * FROM settlements ORDER BY created_at DESC LIMIT $1', [limit]);
  return res.rows;
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

export { insertSellerEndpoint, insertSettlement, getSellerEndpointByUrl, listSettlements, updateSettlementToQueued, insertPaymentLog };
