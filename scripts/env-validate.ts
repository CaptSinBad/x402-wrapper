#!/usr/bin/env node
/**
 * Simple env validator for required environment variables.
 * Exits with non-zero code if any required var is missing.
 * Usage: node scripts/env-validate.ts
 */
function tryLoadDotEnv() {
  try {
    // load dotenv only if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    // ignore
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

const missing: string[] = [];
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
