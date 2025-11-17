// Drop-in configuration and helper loader for x402 facilitators.
// This file provides a small, environment-driven configuration object
// that the server code can import to know where a facilitator is hosted
// and which endpoint paths to call for verify/settle/test/supported resources.
//
// The aim: make it trivial to support any x402 facilitator host by
// swapping `FACILITATOR_URL` / `NETWORK` env vars or by adding entries
// to the `KNOWN_FACILITATORS` map below.

export type FacilitatorConfig = {
  name: string; // human-friendly key
  baseUrl: string; // full base URL, e.g. https://open.x402.host/xlayer
  network?: string; // network id advertised by facilitator (e.g. okx-x-layer)
  paths: {
    supported: string; // GET
    test: string; // GET (payment required)
    verify: string; // POST /verify
    settle: string; // POST /settle
  };
  timeoutSeconds?: number; // default request timeout to facilitator
};

const KNOWN_FACILITATORS: Record<string, FacilitatorConfig> = {
  // Coinbase CDP x402 Facilitator (mainnet)
  "coinbase-cdp": {
    name: "Coinbase CDP (Mainnet)",
    baseUrl: "https://api.coinbase.com/v1/x402",
    network: "base",
    paths: {
      supported: "/supported",
      test: "/test",
      verify: "/verify",
      settle: "/settle",
    },
    timeoutSeconds: 15,
  },
  
  // Public x402 Facilitator (testnet)
  "x402.org": {
    name: "x402.org (Testnet)",
    baseUrl: "https://x402.org/facilitator",
    network: "base-sepolia",
    paths: {
      supported: "/supported",
      test: "/test",
      verify: "/verify",
      settle: "/settle",
    },
    timeoutSeconds: 10,
  },

  // OKX X Layer (alternative testnet)
  "open.x402.host/xlayer": {
    name: "open.x402.host/xlayer",
    baseUrl: "https://open.x402.host/xlayer",
    network: "okx-x-layer",
    paths: {
      supported: "/supported",
      test: "/test",
      verify: "/verify",
      settle: "/settle",
    },
    timeoutSeconds: 10,
  },
};

/**
 * Return the primary facilitator config.
 * Resolution order:
 *  1. If FACILITATOR_URL env var set, use that with sane defaults.
 *  2. Else, if KNOWN_FACILITATORS contains FACILITATOR_KEY env var, use it.
 *  3. Else fall back to x402.org for testnet development.
 * 
 * For production (CDP):
 *   Set FACILITATOR_URL=https://api.coinbase.com/v1/x402
 *   and CDP_API_KEY_ID + CDP_API_KEY_SECRET
 * 
 * For testnet (Free):
 *   Set FACILITATOR_URL=https://x402.org/facilitator
 */
export function loadFacilitatorConfig(): FacilitatorConfig {
  const envUrl = process.env.FACILITATOR_URL?.trim();
  const envNetwork = process.env.NETWORK?.trim();
  const envKey = process.env.FACILITATOR_KEY?.trim();

  // Priority 1: Explicit FACILITATOR_URL
  if (envUrl) {
    return {
      name: "Custom Facilitator",
      baseUrl: envUrl,
      network: envNetwork || "base",
      paths: {
        supported: "/supported",
        test: "/test",
        verify: "/verify",
        settle: "/settle",
      },
      timeoutSeconds: 15,
    };
  }

  // Priority 2: Known facilitator key
  if (envKey && KNOWN_FACILITATORS[envKey]) {
    return KNOWN_FACILITATORS[envKey];
  }

  // Priority 3: Default to x402.org for local development
  const defaultFacilitator = KNOWN_FACILITATORS["x402.org"];
  if (!defaultFacilitator) throw new Error("Default facilitator config not found");
  
  return defaultFacilitator;
}

/**
 * Helper that returns full endpoint URL for a named path
 * Usage: `const cfg = loadFacilitatorConfig(); fetch(urlFor(cfg, 'verify'), {...})`
 */
export function urlFor(cfg: FacilitatorConfig, pathKey: keyof FacilitatorConfig["paths"]) {
  const p = cfg.paths[pathKey];
  // ensure we don't double up slashes
  return `${cfg.baseUrl.replace(/\/$/, "")}${p.startsWith("/") ? p : "/" + p}`;
}

export default { loadFacilitatorConfig, urlFor, KNOWN_FACILITATORS };
