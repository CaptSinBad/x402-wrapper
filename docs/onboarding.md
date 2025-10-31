# Quickstart for Sellers

This guide walks you through integrating with x402 to enable payments for your API or service. By the end, your API will be able to charge buyers and AI agents for access.

> Note: This quickstart begins with testnet configuration for safe testing. When you're ready for production, see the "Running on Mainnet" section for the simple changes needed to accept real payments on Base (EVM) and Solana networks.

> Info: This is the official CDP documentation adapted for this repo. Community-maintained docs and examples live upstream at the x402 repo and CDP developer docs.

## Prerequisites

Before you begin, ensure you have:

- A crypto wallet to receive funds (any EVM-compatible wallet for Base, or a Solana wallet for Solana).
- (Optional) A Coinbase Developer Platform (CDP) account and API Keys for mainnet facilitator use.
- Node.js and npm (or Python and pip) installed.
- An existing API or server you want to protect with paid access.

We provide example servers in the repo for express/next/hono (Node) and FastAPI/Flask (Python). See the `examples/` folder for working reference implementations.

## 1. Install Dependencies

Install the middleware/sdk you need for your platform. For Node/Next/Express/Hono we use the `x402-*` middleware packages. For Python, use the `x402` package on PyPI.

Example (Node / Next.js):

```bash
npm install x402-next
# For mainnet facilitator use:
npm install @coinbase/x402
```

> The mainnet facilitator packages are only needed for production. For testnet development you can test against the public testnet facilitator URL.

## 2. Add Payment Middleware

You will need to provide:

- The facilitator URL (or facilitator object when using the CDP SDK for mainnet)
- The routes you want to protect
- Your receiving wallet address

Example (Next.js middleware):

```js
import { paymentMiddleware } from 'x402-next';

export const middleware = paymentMiddleware(
	'0xYourAddress',
	{
		'/protected': {
			price: '$0.01',
			network: 'base-sepolia',
			config: {
				description: 'Access to protected content',
			}
		}
	},
	{ url: 'https://x402.org/facilitator' }
);

export const config = { matcher: ['/protected/:path*'] };
```

When an unauthenticated request hits a protected route, the middleware will return HTTP 402 with payment instructions. After payment is completed, clients include the proof (for example via `X-PAYMENT` header) and the server verifies the payment with the facilitator before returning the protected response.

## 3. Test Your Integration

1. Call a protected endpoint — you should receive HTTP 402 and payment instructions.
2. Complete the payment using a compatible client or wallet (there are SDK helpers in the repo).
3. Retry the request with the payment proof included and receive the actual response.

## 4. Enhance Discovery with Metadata (Recommended)

Include descriptive metadata in your middleware configuration to improve discovery and developer experience. Add `description`, `inputSchema`, and `outputSchema` to help agents and developers understand how to call your API.

Example metadata (abbreviated):

```json
{
	"price": "$0.001",
	"network": "base",
	"config": {
		"description": "Get real-time weather data",
		"inputSchema": { "type": "object", "properties": { "location": { "type": "string" } }, "required": ["location"] },
		"outputSchema": { "type": "object", "properties": { "temperature": { "type": "number" } } }
	}
}
```

## 5. Running on Mainnet

When moving to production with the CDP facilitator, you will typically:

1. Create a CDP project and generate API keys (CDP API Key ID and Secret).
2. Set the CDP API keys as environment variables in your production environment (for example `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET`).
3. Replace the testnet facilitator URL in your middleware config with the CDP facilitator object (via `@coinbase/x402`).
4. Update your configured `network` to `base` (or the appropriate mainnet identifier).

Example environment variables for production:

```bash
CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret
```

## Next Steps & Resources

- Examples: `examples/` in this repository (Node and Python servers)
- Advanced example: see upstream examples for more complex flows
- Community support: x402 Discord and upstream docs

## Security & Best Practices

- Never commit secret keys to git. Use CI/secret manager (we added `docs/deploy/ci-secrets.md` with recommended names).
- Start testing on testnet and small amounts on mainnet before scaling.

---

If you'd like, I can now:

- Add a link to this quickstart from the dashboard UI (a new `/docs/onboarding` route), or
- Create a seller-facing onboarding wizard UI that walks through: Connect wallet → Register first endpoint → Test with Pay Demo (uses the demo we already added).

Which would you prefer me to implement next?

