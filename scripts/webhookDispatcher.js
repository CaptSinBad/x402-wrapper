#!/usr/bin/env node

/**
 * Webhook Dispatcher Worker
 * Background job that processes pending webhook deliveries
 * 
 * Usage:
 *   node scripts/webhookDispatcher.js
 * 
 * Environment variables:
 *   - WEBHOOK_DISPATCHER_ENABLED: Set to "true" to enable (default: false)
 *   - WEBHOOK_BATCH_SIZE: Number of deliveries to process per batch (default: 10)
 *   - WEBHOOK_POLL_INTERVAL_MS: Poll interval in milliseconds (default: 30000)
 *   - DATABASE_URL: Postgres connection string
 * 
 * This worker:
 * 1. Polls the database for pending webhook deliveries
 * 2. Sends HTTP POST requests to registered webhook URLs
 * 3. Signs payloads with HMAC-SHA256 using the subscription secret
 * 4. Implements exponential backoff for retries
 * 5. Tracks delivery attempts and final status
 */

import { processPendingDeliveries } from '../apps/lib/webhookDispatcher.js';
import { getDbClient } from '../apps/lib/dbClient.js';

const ENABLED = process.env.WEBHOOK_DISPATCHER_ENABLED === 'true';
const BATCH_SIZE = parseInt(process.env.WEBHOOK_BATCH_SIZE || '10', 10);
const POLL_INTERVAL_MS = parseInt(process.env.WEBHOOK_POLL_INTERVAL_MS || '30000', 10);

// Worker statistics
const stats = {
  startTime: new Date(),
  cyclesRun: 0,
  totalProcessed: 0,
  totalSucceeded: 0,
  totalFailed: 0,
  lastError: null,
  lastPollTime: null,
};

async function runCycle() {
  try {
    const db = getDbClient();
    stats.lastPollTime = new Date();
    
    const result = await processPendingDeliveries(db, BATCH_SIZE);
    stats.cyclesRun++;
    stats.totalProcessed += result.processed;
    stats.totalSucceeded += result.succeeded;
    stats.totalFailed += result.failed;

    if (result.processed > 0) {
      console.log(
        `[${new Date().toISOString()}] Webhook cycle ${stats.cyclesRun}: ` +
        `processed=${result.processed}, succeeded=${result.succeeded}, failed=${result.failed}`
      );
    }
  } catch (error) {
    stats.lastError = error;
    console.error(
      `[${new Date().toISOString()}] Error in webhook dispatcher cycle:`,
      error?.message || error
    );
  }
}

async function start() {
  if (!ENABLED) {
    console.log('Webhook dispatcher is disabled. Set WEBHOOK_DISPATCHER_ENABLED=true to enable.');
    process.exit(0);
  }

  console.log(`[${new Date().toISOString()}] Webhook Dispatcher starting...`);
  console.log(`  Batch size: ${BATCH_SIZE}`);
  console.log(`  Poll interval: ${POLL_INTERVAL_MS}ms`);

  // Run initial cycle immediately
  await runCycle();

  // Then run periodically
  const interval = setInterval(runCycle, POLL_INTERVAL_MS);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log(`\n[${new Date().toISOString()}] SIGTERM received, shutting down...`);
    clearInterval(interval);
    
    const uptime = new Date().getTime() - stats.startTime.getTime();
    console.log(`Stats:`);
    console.log(`  Uptime: ${uptime}ms`);
    console.log(`  Cycles run: ${stats.cyclesRun}`);
    console.log(`  Total processed: ${stats.totalProcessed}`);
    console.log(`  Total succeeded: ${stats.totalSucceeded}`);
    console.log(`  Total failed: ${stats.totalFailed}`);
    
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log(`\n[${new Date().toISOString()}] SIGINT received, shutting down...`);
    clearInterval(interval);
    process.exit(0);
  });
}

start().catch((error) => {
  console.error('Fatal error in webhook dispatcher:', error);
  process.exit(1);
});
