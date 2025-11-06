#!/usr/bin/env node
/*
 * Simple env validator for required environment variables.
 * Exits with non-zero code if any required var is missing.
 * Usage: node scripts/env-validate.js
 *
 * This script will attempt to load local .env files (in priority):
 *  - .env.server
 *  - .env.local
 *  - .env
 * so that local development environments which store secrets in those files
 * are accepted without requiring CI secrets. In CI the secrets must still be
 * provided via the environment (GitHub Secrets, etc.).
 */

function tryLoadDotEnv() {
  try {
    const fs = require('fs');
    const path = require('path');
    const dotenv = require('dotenv');
    const candidates = ['.env.server', '.env.local', '.env'];
    for (const f of candidates) {
      const p = path.resolve(process.cwd(), f);
      if (fs.existsSync(p)) {
        const loaded = dotenv.parse(fs.readFileSync(p));
        for (const k of Object.keys(loaded)) {
          if (!process.env[k]) process.env[k] = loaded[k];
        }
      }
    }
  } catch (err) {
    // ignore — dotenv may not be installed in some environments; validation will
    // still run against process.env.
  }
}

tryLoadDotEnv();
const required = [
  'DATABASE_URL',
  'FACILITATOR_URL',
  'NETWORK',
  'NEXT_PUBLIC_PRIVY_APP_ID',
  // Webhook secret required to validate facilitator callbacks
  'FACILITATOR_WEBHOOK_SECRET',
  // Coinbase CDP credentials (required if using CDP/mainnet flows)
  'CDP_API_KEY_ID',
  'CDP_API_KEY_SECRET',
];

const missing = [];
for (const k of required) {
  if (!process.env[k]) missing.push(k);
}

if (missing.length) {
  console.error(`\nMissing required environment variables:\n  - ${missing.join('\n  - ')}\n`);
  console.error('Please copy .env.example to .env.local and fill values, or set CI secrets.');
  process.exit(1);
}

console.log('OK — required environment variables are present');
process.exit(0);
