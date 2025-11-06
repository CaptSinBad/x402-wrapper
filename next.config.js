// Load local .env.server (if present) into process.env during Next.js build.
// This avoids needing to rename env files for local development or CI.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  const dotenvPath = path.resolve(process.cwd(), '.env.server');
  if (fs.existsSync(dotenvPath)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv');
    const parsed = dotenv.parse(fs.readFileSync(dotenvPath));
    for (const k of Object.keys(parsed)) {
      if (!process.env[k]) process.env[k] = parsed[k];
    }
  }
} catch (err) {
  // ignore
}

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
};
