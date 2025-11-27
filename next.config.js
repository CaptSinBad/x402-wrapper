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
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  experimental: {
    optimizePackageImports: ['@privy-io/react-auth', '@privy-io/server-auth'],
  },
  turbopack: {
    resolveAlias: {
      // Prevent importing test files from pino/thread-stream
    },
  },
  webpack: (config, { isServer }) => {
    // Exclude test files from node_modules to prevent build failures
    config.watchOptions = {
      ignored: ['**/node_modules/**', '**/.next/**'],
    };

    // Alias tap to false to avoid resolution errors in thread-stream tests
    config.resolve.alias = {
      ...config.resolve.alias,
      tap: false,
      'pino-elasticsearch': false,
      'pino-pretty': false,
    };

    // Ignore test files from problematic packages
    config.module.rules.push({
      test: /node_modules\/(thread-stream|pino)\/.*\.test\.js$/,
      use: 'ignore-loader',
    });

    // Also ignore the test directory in thread-stream
    config.module.rules.push({
      test: /node_modules\/thread-stream\/test\/.*$/,
      use: 'ignore-loader',
    });

    // Ignore pino test directory
    config.module.rules.push({
      test: /node_modules\/pino\/test\/.*$/,
      use: 'ignore-loader',
    });

    return config;
  },
};
