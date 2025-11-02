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
  // public Coinbase-hosted example (discovered previously)
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
 *  - If FACILITATOR_URL env var set, use that with sane defaults.
 *  - Else, if KNOWN_FACILITATORS contains FACILITATOR_KEY env var, use it.
 *  - Else fall back to the built-in `open.x402.host/xlayer` example.
 */
export function loadFacilitatorConfig(): FacilitatorConfig {
  const envUrl = process.env.FACILITATOR_URL?.trim();
  const envNetwork = process.env.NETWORK?.trim();
  const envKey = process.env.FACILITATOR_KEY?.trim();

  if (envUrl) {
    // Normalize a few common patterns: allow trailing slash
    const normalized = envUrl.replace(/\/+$/, "");
    return {
      name: normalized,
      baseUrl: normalized,
      network: envNetwork || undefined,
      paths: {
        supported: "/supported",
        test: "/test",
        verify: "/verify",
        settle: "/settle",
      },
      timeoutSeconds: 10,
    };
  }

  if (envKey && KNOWN_FACILITATORS[envKey]) {
    return KNOWN_FACILITATORS[envKey];
  }

  // default fallback
  return KNOWN_FACILITATORS["open.x402.host/xlayer"];
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
