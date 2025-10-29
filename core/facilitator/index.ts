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
  if (!FACILITATOR_URL) throw new Error('FACILITATOR_URL not configured');
  const path = `${FACILITATOR_URL.replace(/\/$/, '')}/verify`;
  return await postJSON<VerifyRequest, VerifyResponse>(path, req, { timeoutMs: 8000, retries: 1 });
}

export async function settle(req: SettleRequest): Promise<SettleResponse> {
  if (!FACILITATOR_URL) throw new Error('FACILITATOR_URL not configured');
  const path = `${FACILITATOR_URL.replace(/\/$/, '')}/settle`;
  return await postJSON<SettleRequest, SettleResponse>(path, req, { timeoutMs: 20000, retries: 2 });
}
