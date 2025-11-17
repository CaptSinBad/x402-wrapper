// @vitest-environment node
import { beforeAll, afterAll, test, expect } from 'vitest';
import { Client as PgClient } from 'pg';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Force Postgres usage for local integration runs (ignore Supabase envs if present)
process.env.USE_LOCAL_PG = process.env.USE_LOCAL_PG || 'true';
import http from 'http';
import { spawnSync } from 'child_process';
import net from 'net';

// Integration test for the settlement worker. This test assumes a Postgres
// instance is reachable at TEST_DATABASE_URL or the default
// postgres://postgres:postgres@localhost:5432/x402db

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/x402db';

const USE_SUPABASE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) && String(process.env.USE_LOCAL_PG || process.env.FORCE_PG || 'false').toLowerCase() !== 'true';

let pg: PgClient;
let supabase: any;
let server: http.Server;
let serverPort: number;

beforeAll(async () => {
  if (USE_SUPABASE) {
    supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  } else {
    pg = new PgClient({ connectionString: TEST_DATABASE_URL });
    await pg.connect();
  }
});

afterAll(async () => {
  if (pg) await pg.end();
  if (server) server.close();
});

const shouldRunIntegration = process.env.RUN_WORKER_INTEGRATION === 'true';

(shouldRunIntegration ? test : test.skip)('worker processes a queued settlement (RUN_ONCE)', async () => {
  // Start a stub facilitator server
  const responses: any[] = [];
  server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/settle') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        responses.push(JSON.parse(body || '{}'));
        const resp = { success: true, transaction: 'tx-integration-123' };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(resp));
      });
      return;
    }
    res.statusCode = 404;
    res.end('not found');
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      // @ts-ignore
      serverPort = (server.address() as any).port;
      resolve();
    });
  });

  // Insert a queued settlement
  // Generate a UUID locally to avoid relying on pgcrypto being installed in the DB
  const id = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : require('crypto').randomUUID();
  const facilitatorRequest = {
    paymentRequirements: { maxAmountRequired: '100', asset: 'USDC', network: 'testnet', endpoint_id: null },
  };

  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('settlements').insert([
      { id, facilitator_request: facilitatorRequest, status: 'queued', attempts: 0 },
    ]).select();
    if (error) {
      console.error('supabase insert error', error);
      throw error;
    }
  } else {
    await pg.query(
      `INSERT INTO settlements(id, facilitator_request, status, attempts, created_at, updated_at) VALUES($1, $2, 'queued', 0, NOW(), NOW())`,
      [id, facilitatorRequest]
    );
  }

  // Configure process.env so the worker module (when required) uses our test DB and facilitator
  const env = Object.assign({}, process.env, {
    RUN_ONCE: 'true',
    USE_LOCAL_PG: 'true',
    FACILITATOR_URL: `http://127.0.0.1:${serverPort}`,
    PG_HOST: process.env.PG_HOST || process.env.POSTGRES_HOST || 'localhost',
    PG_USER: process.env.PG_USER || process.env.POSTGRES_USER || 'postgres',
    PG_PASSWORD: process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
    PG_DATABASE: process.env.PG_DATABASE || process.env.POSTGRES_DB || 'x402db',
    PG_PORT: process.env.PG_PORT || process.env.POSTGRES_PORT || '5432',
  });
  Object.assign(process.env, env);

  // If using Supabase, ensure the env is set so the worker constructs a Supabase client
  if (USE_SUPABASE) {
    process.env.FACILITATOR_URL = `http://127.0.0.1:${serverPort}`;
    process.env.USE_LOCAL_PG = 'false';
  }

  // If not using Supabase, verify the Postgres host:port is reachable before running heavy tests
  if (!USE_SUPABASE) {
    const pgHost = env.PG_HOST || 'localhost';
    const pgPort = Number(env.PG_PORT || 5432);
    const reachable = await new Promise<boolean>((resolve) => {
      const s = new net.Socket();
      const onError = () => {
        s.destroy();
        resolve(false);
      };
      s.setTimeout(1000);
      s.once('error', onError);
      s.once('timeout', onError);
      s.connect(pgPort, pgHost, () => {
        s.end();
        resolve(true);
      });
    });

    if (!reachable) {
      console.warn(`Skipping integration run: Postgres ${pgHost}:${pgPort} not reachable`);
      expect(true).toBe(true);
      return;
    }
  }

  // Require the worker module and call a single iteration synchronously. The worker exports doOneIteration for tests.
  const workerModule = require('../scripts/settlementWorker.js');
  await workerModule.doOneIteration();

  // Verify settlement was updated
  if (USE_SUPABASE) {
    const { data, error } = await supabase.from('settlements').select('status, facilitator_response, tx_hash').eq('id', id).limit(1).single();
    if (error) {
      console.error('supabase select error', error);
      throw error;
    }
    const row = data;
    expect(row.status).toBe('confirmed');
    expect(row.tx_hash).toBe('tx-integration-123');
    expect(row.facilitator_response).toBeTruthy();
  } else {
    const res = await pg.query('SELECT status, facilitator_response, tx_hash FROM settlements WHERE id = $1', [id]);
    expect(res.rowCount).toBe(1);
    const row = res.rows[0];
    expect(row.status).toBe('confirmed');
    expect(row.tx_hash).toBe('tx-integration-123');
    expect(row.facilitator_response).toBeTruthy();
  }

  // Verify facilitator received the request
  expect(responses.length).toBeGreaterThan(0);
});

(shouldRunIntegration ? test : test.skip)('worker claim semantics prevent concurrent processing (RUN_ONCE)', async () => {
  // This test verifies that when two workers try to claim the same settlement simultaneously,
  // only one succeeds due to the UPDATE WHERE status condition
  
  // Create a settlement row
  let settlementId = '';
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('settlements')
      .insert([{
        payment_attempt_id: `concurrency-test-${Date.now()}`,
        facilitator_request: { test: 'data' },
        status: 'queued',
        attempts: 0,
      }])
      .select();
    if (error) throw error;
    settlementId = data[0].id;
  } else {
    const res = await pg.query(
      `INSERT INTO settlements(payment_attempt_id, facilitator_request, status, attempts, created_at, updated_at)
       VALUES($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [`concurrency-test-${Date.now()}`, JSON.stringify({ test: 'data' }), 'queued', 0]
    );
    settlementId = res.rows[0].id;
  }

  // Simulate two workers attempting to claim the same settlement
  const claimAttempts = async () => {
    const workerId1 = `worker-1-${Date.now()}`;
    const workerId2 = `worker-2-${Date.now()}`;

    let claim1Success = false;
    let claim2Success = false;

    if (USE_SUPABASE) {
      // First worker claims
      const claimResp1 = await supabase
        .from('settlements')
        .update({ status: 'in_progress', locked_by: workerId1, locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .match({ id: settlementId, status: 'queued' })
        .select();
      claim1Success = claimResp1.data && claimResp1.data.length > 0;

      // Second worker attempts to claim (should fail)
      const claimResp2 = await supabase
        .from('settlements')
        .update({ status: 'in_progress', locked_by: workerId2, locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .match({ id: settlementId, status: 'queued' })
        .select();
      claim2Success = claimResp2.data && claimResp2.data.length > 0;
    } else {
      // First worker claims
      const res1 = await pg.query(
        `UPDATE settlements SET status='in_progress', locked_by=$1, locked_at=NOW(), updated_at=NOW() 
         WHERE id=$2 AND status=$3 RETURNING *`,
        [workerId1, settlementId, 'queued']
      );
      claim1Success = res1.rowCount > 0;

      // Second worker attempts to claim (should fail because status is now 'in_progress')
      const res2 = await pg.query(
        `UPDATE settlements SET status='in_progress', locked_by=$1, locked_at=NOW(), updated_at=NOW() 
         WHERE id=$2 AND status=$3 RETURNING *`,
        [workerId2, settlementId, 'queued']
      );
      claim2Success = res2.rowCount > 0;
    }

    return { claim1Success, claim2Success };
  };

  const { claim1Success, claim2Success } = await claimAttempts();
  
  // Verify exactly one worker claimed the settlement
  expect(claim1Success).toBe(true);
  expect(claim2Success).toBe(false);
});

