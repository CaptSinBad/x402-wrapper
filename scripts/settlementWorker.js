#!/usr/bin/env node
/*
Simple settlement worker.
- Polls `settlements` table for rows with status='queued' or status='retry'
- Calls the configured facilitator /settle endpoint with the stored facilitator_request
- Updates settlements with facilitator_response, status, attempts, last_error, tx_hash if present
- Writes a payment_logs entry for auditing

Run: SUPABASE_SERVICE_KEY and NEXT_PUBLIC_SUPABASE_URL and FACILITATOR_URL must be set.
*/

const { createClient } = require('@supabase/supabase-js');
const { Client: PgClient } = require('pg');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FACILITATOR_URL = process.env.FACILITATOR_URL || process.env.NEXT_PUBLIC_FACILITATOR_URL;

// Default to using local Postgres when Supabase service vars are not provided.
const USE_LOCAL_PG = (process.env.USE_LOCAL_PG !== undefined)
  ? String(process.env.USE_LOCAL_PG).toLowerCase() === 'true'
  : !(SUPABASE_URL && SUPABASE_SERVICE_KEY);

if (!FACILITATOR_URL) {
  console.error('Missing FACILITATOR_URL');
  process.exit(1);
}

let supabase = null;
let pgClient = null;

if (USE_LOCAL_PG) {
  // connect directly to local Postgres docker service
  const pgHost = process.env.PG_HOST || process.env.POSTGRES_HOST || 'postgres';
  const pgUser = process.env.PG_USER || process.env.POSTGRES_USER || 'postgres';
  const pgPassword = process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres';
  const pgDatabase = process.env.PG_DATABASE || process.env.POSTGRES_DB || 'x402db';
  const pgPort = Number(process.env.PG_PORT || process.env.POSTGRES_PORT || 5432);

  pgClient = new PgClient({ host: pgHost, user: pgUser, password: pgPassword, database: pgDatabase, port: pgPort });
  pgClient.connect().catch((err) => {
    console.error('Failed to connect to local Postgres', err);
    process.exit(1);
  });
  console.log('Using direct Postgres client for settlements (local dev)');
} else {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase env vars NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
const MAX_ATTEMPTS = Number(process.env.WORKER_MAX_ATTEMPTS || 5);
const BASE_RETRY_SECONDS = Number(process.env.WORKER_BASE_RETRY_SECONDS || 30);
const LOCK_TIMEOUT_SECONDS = Number(process.env.WORKER_LOCK_TIMEOUT_SECONDS || 60 * 5); // 5 minutes
const RUN_ONCE = String(process.env.RUN_ONCE || 'false').toLowerCase() === 'true';

async function processOne(settlement) {
  const id = settlement.id;
  const reqBody = settlement.facilitator_request;

  try {
    // Attempt to claim this settlement: set locked_by/locked_at and status atomically
    const workerId = `worker-${process.pid}-${Date.now()}`;
    let claimed = null;
    if (USE_LOCAL_PG) {
      const res = await pgClient.query(
        `UPDATE settlements SET status='in_progress', locked_by=$1, locked_at=NOW(), updated_at=NOW() WHERE id=$2 AND status=$3 RETURNING *`,
        [workerId, id, settlement.status]
      );
      if (res.rowCount === 0) return; // not claimed
      claimed = res.rows[0];
    } else {
      const claimResp = await supabase
        .from('settlements')
        .update({ status: 'in_progress', locked_by: workerId, locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .match({ id: id, status: settlement.status })
        .select();

      if (!claimResp || (claimResp.data && claimResp.data.length === 0)) {
        // someone else claimed it or status changed; skip
        return;
      }
      claimed = claimResp.data[0];
    }

    const resp = await fetch(`${FACILITATOR_URL.replace(/\/$/, '')}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });

    const json = await resp.json();

    const success = json?.success === true || json?.isValid === true; // facilitator response shape may vary
    const txHash = json?.transaction || json?.txHash || null;

    if (USE_LOCAL_PG) {
      await pgClient.query(
        `UPDATE settlements SET facilitator_response=$1, status=$2, tx_hash=$3, attempts=COALESCE(attempts,0)+1, locked_by=NULL, locked_at=NULL, updated_at=NOW(), next_retry_at=NULL WHERE id=$4`,
        [JSON.stringify(json), success ? 'confirmed' : 'failed', txHash, id]
      );
    } else {
      await supabase.from('settlements').update({
        facilitator_response: json,
        status: success ? 'confirmed' : 'failed',
        tx_hash: txHash,
        attempts: (settlement.attempts || 0) + 1,
        locked_by: null,
        locked_at: null,
        updated_at: new Date().toISOString(),
        next_retry_at: null,
      }).eq('id', id);
    }

    // write payment log
    try {
      if (USE_LOCAL_PG) {
        await pgClient.query(
          `INSERT INTO payment_logs(level, message, endpoint_id, payer_address, tx_hash, amount, asset, network, success, response, meta, created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
          [
            'info',
            success ? 'settlement_success' : 'settlement_failed',
            reqBody?.paymentRequirements?.endpoint_id ?? null,
            json?.payer ?? null,
            txHash,
            reqBody?.paymentRequirements?.maxAmountRequired ?? null,
            reqBody?.paymentRequirements?.asset ?? null,
            reqBody?.paymentRequirements?.network ?? null,
            success,
            JSON.stringify(json),
            JSON.stringify({ workerRunAt: new Date().toISOString() }),
          ]
        );
      } else {
        await supabase.from('payment_logs').insert([
          {
            level: 'info',
            message: success ? 'settlement_success' : 'settlement_failed',
            endpoint_id: reqBody?.paymentRequirements?.endpoint_id ?? null,
            payer_address: json?.payer ?? null,
            tx_hash: txHash,
            amount: reqBody?.paymentRequirements?.maxAmountRequired ?? null,
            asset: reqBody?.paymentRequirements?.asset ?? null,
            network: reqBody?.paymentRequirements?.network ?? null,
            success: success,
            response: json,
            meta: { workerRunAt: new Date().toISOString() },
          },
        ]);
      }
    } catch (logErr) {
      console.error('failed to write payment_logs', logErr);
    }

  } catch (err) {
    console.error('error processing settlement', id, err);
    const attempts = (settlement.attempts || 0) + 1;
    const shouldRetry = attempts < MAX_ATTEMPTS;
    const backoffSeconds = Math.pow(attempts, 2) * BASE_RETRY_SECONDS;
    const nextRetryAt = shouldRetry ? new Date(Date.now() + backoffSeconds * 1000).toISOString() : null;
    if (USE_LOCAL_PG) {
      await pgClient.query(
        `UPDATE settlements SET attempts=$1, last_error=$2, status=$3, next_retry_at=$4, locked_by=NULL, locked_at=NULL, updated_at=NOW() WHERE id=$5`,
        [attempts, String(err?.message || err), shouldRetry ? 'retry' : 'failed', nextRetryAt, id]
      );
    } else {
      await supabase.from('settlements').update({
        attempts,
        last_error: String(err?.message || err),
        status: shouldRetry ? 'retry' : 'failed',
        next_retry_at: nextRetryAt,
        locked_by: null,
        locked_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    }
  }
}

async function doOneIteration() {
  try {
    // Reclaim stuck in_progress jobs older than LOCK_TIMEOUT_SECONDS
    const reclaimCutoff = new Date(Date.now() - LOCK_TIMEOUT_SECONDS * 1000).toISOString();
    try {
      if (USE_LOCAL_PG) {
        await pgClient.query(
          `UPDATE settlements SET status='retry', locked_by=NULL, locked_at=NULL, updated_at=NOW() WHERE status='in_progress' AND locked_at <= $1`,
          [reclaimCutoff]
        );
      } else {
        await supabase
          .from('settlements')
          .update({ status: 'retry', locked_by: null, locked_at: null, updated_at: new Date().toISOString() })
          .lte('locked_at', reclaimCutoff)
          .eq('status', 'in_progress');
      }
    } catch (reclaimErr) {
      // ignore reclaim errors but log
      console.error('reclaim error', reclaimErr);
    }

    // Find queued or retry settlements eligible for processing
    let rows = null;
    if (USE_LOCAL_PG) {
      const res = await pgClient.query(
        `SELECT * FROM settlements WHERE status IN ('queued','retry') AND (next_retry_at IS NULL OR next_retry_at <= NOW()) ORDER BY created_at ASC LIMIT 10`
      );
      rows = res.rows;
    } else {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .in('status', ['queued', 'retry'])
        .or('next_retry_at.is.null,next_retry_at.lte.now()')
        .order('created_at', { ascending: true })
        .limit(10);
      if (error) {
        console.error('error fetching settlements', error);
      }
      rows = data || [];
    }

    if (rows && rows.length > 0) {
      for (const s of rows) {
        await processOne(s);
      }
    }
  } catch (err) {
    console.error('worker poll error', err);
  }
}

async function pollLoop() {
  if (RUN_ONCE) {
    await doOneIteration();
    if (pgClient) {
      try { await pgClient.end(); } catch (e) {}
    }
    process.exit(0);
  }

  while (true) {
    await doOneIteration();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// Export helpers for tests to be able to call a single iteration without spawning a child process
if (typeof module !== 'undefined' && module.exports) {
  module.exports.doOneIteration = doOneIteration;
  module.exports.processOne = processOne;
}

if (typeof require !== 'undefined' && require.main === module) {
  pollLoop().catch((err) => {
    console.error('worker failed', err);
    process.exit(1);
  });
}
