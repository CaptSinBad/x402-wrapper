/**
 * xSynesis Payment Client SDK (production-ready)
 * Handles x402-compatible payments and signing via Privy wallet provider.
 */

export type PaymentRequirements = {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo?: string;
  maxTimeoutSeconds?: number;
  asset?: string;
  extra?: any;
};

export type CreatePayloadFn = (params: {
  requirement: PaymentRequirements;
  priceAtomic: string;
  walletAddress: string;
  provider?: any;
}) => Promise<{ x402Version: number; scheme: string; network: string; payload: any }>;

/**
 * 🔐 createSignedPaymentHeader
 * Signs a payment intent using a wallet provider (MetaMask, Coinbase Wallet, or Privy).
 * Produces a valid x402 Payment Header payload compatible with Coinbase facilitator.
 * 
 * @param requirement - Payment requirements from server
 * @param priceAtomic - Amount to charge in atomic units
 * @param walletAddress - Wallet address to sign with
 * @param provider - (Optional) Explicit EIP-1193 provider. If not provided, attempts to find injected provider.
 */
export async function createSignedPaymentHeader({
  requirement,
  priceAtomic,
  walletAddress,
  provider: explicitProvider,
}: {
  requirement: PaymentRequirements;
  priceAtomic: string;
  walletAddress: string;
  provider?: any;
}) {
  const provider = explicitProvider ||
    (typeof window !== 'undefined' && (window as any).ethereum) ||
    null;

  if (!provider) throw new Error('No wallet provider found. Please ensure MetaMask or Coinbase Wallet is installed and connected.');

  // Define EIP-712 typed data
  const chainId =
    requirement.network === 'base-mainnet'
      ? 8453
      : requirement.network === 'base-sepolia'
      ? 84532
      : 1;

  const domain = {
    name: 'x402 Payment',
    version: '1',
    chainId,
    verifyingContract: requirement.payTo || '',
  };

  const types = {
    Payment: [
      { name: 'resource', type: 'string' },
      { name: 'amount', type: 'uint256' },
      { name: 'payTo', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
    ],
  };

  const nonce = Date.now();
  const expiry = Math.floor(Date.now() / 1000) + (requirement.maxTimeoutSeconds || 300);

  const message = {
    resource: requirement.resource,
    amount: priceAtomic,
    payTo: requirement.payTo,
    nonce,
    expiry,
  };

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      ...types,
    },
    primaryType: 'Payment',
    domain,
    message,
  };

  const signer = walletAddress.toLowerCase();
  const params = [signer, JSON.stringify(typedData)];

  const signature = await provider.request({
    method: 'eth_signTypedData_v4',
    params,
  });

  const payload = {
    signer: walletAddress,
    signature,
    typedData,
    scheme: requirement.scheme,
    network: requirement.network,
    meta: {
      createdAt: new Date().toISOString(),
      source: 'xSynesisPayment',
    },
  };

  return {
    x402Version: 1,
    scheme: requirement.scheme,
    network: requirement.network,
    payload,
  };
}

/**
 * 💸 payAndFetch
 * Executes an x402 payment flow:
 * - Calls resource
 * - If 402, signs + retries with payment header
 * - Returns fulfilled resource
 */
export async function payAndFetch(
  url: string,
  opts: RequestInit = {},
  {
    createPayload,
    walletAddress,
    priceAtomicOverride,
    provider,
  }: {
    createPayload: CreatePayloadFn;
    walletAddress: string;
    priceAtomicOverride?: string;
    provider?: any;
  }
): Promise<Response> {
  const res = await fetch(url, opts);
  if (res.status !== 402) return res;

  const pr = await res.json().catch(() => null);
  if (!pr || !pr.accepts || !Array.isArray(pr.accepts) || pr.accepts.length === 0) {
    throw new Error('Server returned 402 but no payment requirements found');
  }

  const requirement = pr.accepts[0];
  const priceAtomic = priceAtomicOverride ?? requirement.maxAmountRequired;

  const paymentHeaderObj = await createPayload({
    requirement,
    priceAtomic,
    walletAddress,
    provider,
  });

  // Build the complete x402 header with both paymentPayload and paymentRequirements
  const x402Header = {
    paymentPayload: paymentHeaderObj,
    paymentRequirements: requirement,
  };

  const headerValue = btoa(JSON.stringify(x402Header)); // Base64 encode

  const paidReqOpts = {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      'X-PAYMENT': headerValue,
    },
  };

  const paidRes = await fetch(url, paidReqOpts);
  return paidRes;
}
