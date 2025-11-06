/**
 * Minimal Coinbase facilitator client
 * Exposes `verify` and `settle` helpers used by server-side routes.
 *
 * Reads facilitator base URL from `FACILITATOR_URL` or `NEXT_PUBLIC_FACILITATOR_URL`.
 */

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

const FACILITATOR_URL = process.env.FACILITATOR_URL || process.env.NEXT_PUBLIC_FACILITATOR_URL;
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;

let _cdpClient: any | null = null;

async function getCdpClient() {
  if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET) return null;
  if (_cdpClient) return _cdpClient;

  try {
    const mod = await import('@coinbase/x402');

    // library may export createClient or default factory. Try common shapes.
    if (mod.createClient && typeof mod.createClient === 'function') {
      _cdpClient = mod.createClient({ apiKeyId: CDP_API_KEY_ID, apiKeySecret: CDP_API_KEY_SECRET });
      return _cdpClient;
    }

    if (mod.default && typeof mod.default.createClient === 'function') {
      _cdpClient = mod.default.createClient({ apiKeyId: CDP_API_KEY_ID, apiKeySecret: CDP_API_KEY_SECRET });
      return _cdpClient;
    }

    // some packages export a default function that returns a client
    if (typeof mod.default === 'function') {
      _cdpClient = mod.default({ apiKeyId: CDP_API_KEY_ID, apiKeySecret: CDP_API_KEY_SECRET });
      return _cdpClient;
    }

    // last resort: use module as client if it already exposes verify/settle
    if ((mod as any).verify || (mod as any).settle) {
      _cdpClient = mod;
      return _cdpClient;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load @coinbase/x402 client:', err && (err.message || err));
    return null;
  }

  return null;
}

if (!FACILITATOR_URL) {
  // We'll allow runtime to proceed but server routes should check and error if missing.
  // Do not throw here to keep unit tests flexible.
  // console.warn('FACILITATOR_URL is not configured');
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
      // simple backoff
      if (attempt < retries) await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  throw lastErr;
}

export async function verify(req: VerifyRequest): Promise<VerifyResponse> {
  // If Coinbase CDP credentials are present, prefer the CDP client for mainnet flows.
  if (CDP_API_KEY_ID && CDP_API_KEY_SECRET) {
    try {
      const coinbase = await import('@coinbase/x402');
      // The Coinbase client may expose a simple verify API — adapt if their API differs.
      if (coinbase && coinbase.default && typeof coinbase.default.verify === 'function') {
        return await coinbase.default.verify(req as any) as VerifyResponse;
      }
    } catch (err) {
      // If dynamic import fails (package not installed), fallback to HTTP path below.
      // eslint-disable-next-line no-console
      console.warn('Coinbase CDP client not available, falling back to HTTP facilitator');
    }
  }

  if (!FACILITATOR_URL) throw new Error('FACILITATOR_URL not configured');
  const path = `${FACILITATOR_URL.replace(/\/$/, '')}/verify`;
  return await postJSON<VerifyRequest, VerifyResponse>(path, req, { timeoutMs: 8000, retries: 1 });
}

export async function settle(req: SettleRequest): Promise<SettleResponse> {
  if (CDP_API_KEY_ID && CDP_API_KEY_SECRET) {
    try {
      const coinbase = await import('@coinbase/x402');
      if (coinbase && coinbase.default && typeof coinbase.default.settle === 'function') {
        return await coinbase.default.settle(req as any) as SettleResponse;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Coinbase CDP client not available, falling back to HTTP facilitator');
    }
  }

  if (!FACILITATOR_URL) throw new Error('FACILITATOR_URL not configured');
  const path = `${FACILITATOR_URL.replace(/\/$/, '')}/settle`;
  return await postJSON<SettleRequest, SettleResponse>(path, req, { timeoutMs: 20000, retries: 2 });
}
