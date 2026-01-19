/**
 * Minimal Coinbase facilitator client
 * Exposes `verify` and `settle` helpers used by server-side routes.
 * Now uses dynamic network-based configuration from ./config.ts
 */

import { loadFacilitatorConfig, urlFor } from './config';

export type PaymentRequirements = {
  x402Version?: number;
  scheme: string;
  network: string;
  maxAmountRequired?: string;
  resource?: string;
  description?: string;
  mimeType?: string | null;
  payTo?: string;
  maxTimeoutSeconds?: number;
  asset?: string;
  extra?: Record<string, any> | null;
  [k: string]: any;
};

export type Authorization = {
  from: string;
  to: string;
  value: string; // atomic units as string
  validAfter: string;
  validBefore: string;
  nonce: string;
};

export type PaymentPayload = {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    authorization: Authorization;
    [k: string]: any;
  };
};

export type VerifyRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

export type VerifyResponse = {
  isValid: boolean;
  invalidReason?: string | null;
  payer?: string | null;
  txHash?: string | null;
  [k: string]: any;
};

export type SettleRequest = VerifyRequest;

export type SettleResponse = {
  success: boolean;
  payer?: string | null;
  transaction?: string | null;
  network?: string | null;
  errorReason?: string | null;
  [k: string]: any;
};

const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;

let _cdpClient: any | null = null;

async function getCdpClient() {
  if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET) return null;
  if (_cdpClient) return _cdpClient;

  try {
    const mod = await import('@coinbase/x402');

    if (mod.createClient && typeof mod.createClient === 'function') {
      _cdpClient = mod.createClient({ apiKeyId: CDP_API_KEY_ID, apiKeySecret: CDP_API_KEY_SECRET });
      return _cdpClient;
    }

    if (mod.default && typeof mod.default.createClient === 'function') {
      _cdpClient = mod.default.createClient({ apiKeyId: CDP_API_KEY_ID, apiKeySecret: CDP_API_KEY_SECRET });
      return _cdpClient;
    }

    if (typeof mod.default === 'function') {
      _cdpClient = mod.default({ apiKeyId: CDP_API_KEY_ID, apiKeySecret: CDP_API_KEY_SECRET });
      return _cdpClient;
    }

    if ((mod as any).verify || (mod as any).settle) {
      _cdpClient = mod;
      return _cdpClient;
    }
  } catch (err) {
    console.warn('Failed to load @coinbase/x402 client:', err && (((err as any).message) || err));
    return null;
  }

  return null;
}

async function postJSON<TReq, TRes>(path: string, body: TReq, opts?: { timeoutMs?: number; retries?: number; }): Promise<TRes> {
  const timeoutMs = opts?.timeoutMs ?? 10000;
  const retries = opts?.retries ?? 1;

  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(id);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Facilitator returned ${res.status}: ${text}`);
      }

      const json = (await res.json()) as TRes;
      return json;
    } catch (err) {
      lastErr = err;
      clearTimeout(id);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  throw lastErr;
}

async function postJSONWithHeaders<TReq, TRes>(
  path: string,
  body: TReq,
  headers: Record<string, string>,
  opts?: { timeoutMs?: number; retries?: number; }
): Promise<TRes> {
  const timeoutMs = opts?.timeoutMs ?? 10000;
  const retries = opts?.retries ?? 1;

  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(id);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Facilitator returned ${res.status}: ${text}`);
      }

      const json = (await res.json()) as TRes;
      return json;
    } catch (err) {
      lastErr = err;
      clearTimeout(id);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  throw lastErr;
}

export async function verify(req: VerifyRequest): Promise<VerifyResponse> {
  const network = req.paymentPayload.network;
  const config = loadFacilitatorConfig(network);

  // Use CDP if configured for this network (mainnet)
  const useCdpApi = config.name.includes("CDP");

  if (useCdpApi && CDP_API_KEY_ID && CDP_API_KEY_SECRET) {
    console.log('[facilitator/verify] Using Coinbase CDP API');
  } else {
    console.log(`[facilitator/verify] Using facilitator: ${config.baseUrl} (${config.name})`);
  }

  // Determine final path
  let finalPath = urlFor(config, 'verify');

  // CDP API override - use the CDP platform URL if CDP keys are present and network is mainnet
  if (useCdpApi && CDP_API_KEY_ID && CDP_API_KEY_SECRET) {
    finalPath = 'https://api.cdp.coinbase.com/platform/v2/x402/facilitator/verify';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (useCdpApi && CDP_API_KEY_ID && CDP_API_KEY_SECRET) {
    headers['CB-ACCESS-KEY'] = CDP_API_KEY_ID;
    headers['CB-ACCESS-SECRET'] = CDP_API_KEY_SECRET;
  }

  console.log('[facilitator/verify] Sending request to:', finalPath);

  return await postJSONWithHeaders<VerifyRequest, VerifyResponse>(finalPath, req, headers, { timeoutMs: 30000, retries: 2 });
}

export async function settle(req: SettleRequest): Promise<SettleResponse> {
  const network = req.paymentPayload.network;
  const config = loadFacilitatorConfig(network);
  const useCdpApi = config.name.includes("CDP");

  if (useCdpApi && CDP_API_KEY_ID && CDP_API_KEY_SECRET) {
    try {
      const coinbase = await import('@coinbase/x402');
      if (coinbase && coinbase.default && typeof coinbase.default.settle === 'function') {
        return await coinbase.default.settle(req as any) as SettleResponse;
      }
    } catch (err) {
      console.warn('Coinbase CDP client not available, falling back to HTTP facilitator');
    }
  }

  const path = urlFor(config, 'settle');
  console.log(`[facilitator/settle] Sending request to: ${path}`);
  return await postJSON<SettleRequest, SettleResponse>(path, req, { timeoutMs: 20000, retries: 2 });
}
