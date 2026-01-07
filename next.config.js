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
  // Force these packages to be external (not bundled) - Next.js 16+
  serverExternalPackages: ['thread-stream', 'pino', 'pino-pretty', '@walletconnect/logger'],
  // Exclude test files from being traced/bundled
  outputFileTracingExcludes: {
    '*': [
      'node_modules/thread-stream/test/**',
      'node_modules/thread-stream/bench.js',
      'node_modules/thread-stream/LICENSE',
      'node_modules/thread-stream/README.md',
      'node_modules/pino/test/**',
    ],
  },
  // Empty turbopack config to silence Next.js 16 warning
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Client-side: completely exclude pino and thread-stream
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'thread-stream': false,
        'pino': false,
        'pino-pretty': false,
        'pino-elasticsearch': false,
        '@walletconnect/logger': false,
        '@react-native-async-storage/async-storage': false,
      };
    }

    // Server-side: exclude test dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      tap: false,
      desm: false,
      fastbench: false,
      rimraf: false,
    };

    // Exclude test files
    config.module.rules.push({
      test: /node_modules\/(thread-stream|pino)\/.*\.test\.(js|mjs|ts)$/,
      use: 'ignore-loader',
    });

    config.module.rules.push({
      test: /node_modules\/thread-stream\/test\/.*$/,
      use: 'ignore-loader',
    });

    config.module.rules.push({
      test: /node_modules\/thread-stream\/(LICENSE|README\.md|bench\.js|\.yarnrc\.yml)$/,
      use: 'ignore-loader',
    });

    return config;
  },
};
