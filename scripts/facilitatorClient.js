// CommonJS facilitator client wrapper for the settlement worker.
// Prefers Coinbase CDP when CDP_API_KEY_ID and CDP_API_KEY_SECRET are present.
const fetch = global.fetch || require('node-fetch');

const FACILITATOR_URL = process.env.FACILITATOR_URL || process.env.NEXT_PUBLIC_FACILITATOR_URL;
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;

async function postJSON(path, body, opts = {}) {
  const timeoutMs = opts.timeoutMs || 10000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Facilitator HTTP ${res.status}: ${text}`);
    }
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

async function tryUseCdp(req) {
  if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET) return null;
  try {
    const coinbase = await import('@coinbase/x402');
    // try a few common shapes
    if (coinbase && coinbase.default && typeof coinbase.default.settle === 'function') {
      return await coinbase.default.settle(req);
    }
    if (coinbase && typeof coinbase.settle === 'function') {
      return await coinbase.settle(req);
    }
    if (coinbase && typeof coinbase.default === 'function') {
      const client = coinbase.default({ apiKeyId: CDP_API_KEY_ID, apiKeySecret: CDP_API_KEY_SECRET });
      if (client && typeof client.settle === 'function') return await client.settle(req);
    }
    // fallback: if module exports a createClient
    if (coinbase && typeof coinbase.createClient === 'function') {
      const client = coinbase.createClient({ apiKeyId: CDP_API_KEY_ID, apiKeySecret: CDP_API_KEY_SECRET });
      if (client && typeof client.settle === 'function') return await client.settle(req);
    }
  } catch (err) {
    // console.warn handled by caller
    return null;
  }
  return null;
}

module.exports = {
  async settle(reqBody) {
    // prefer CDP if configured
    if (CDP_API_KEY_ID && CDP_API_KEY_SECRET) {
      try {
        const cdpResp = await tryUseCdp(reqBody);
        if (cdpResp) return cdpResp;
      } catch (e) {
        // continue to HTTP fallback
        console.warn('CDP client error, falling back to HTTP facilitator', e && e.message ? e.message : e);
      }
    }

    if (!FACILITATOR_URL) throw new Error('FACILITATOR_URL not configured and CDP client not available');
    const path = `${FACILITATOR_URL.replace(/\/$/, '')}/settle`;
    return await postJSON(path, reqBody, { timeoutMs: 20000 });
  }
};
