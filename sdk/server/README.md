# @binahpay/server

Official BinahPay Node.js server SDK for creating checkout sessions and managing payments.

## Installation

```bash
npm install @binahpay/server
# or
yarn add @binahpay/server
# or
pnpm add @binahpay/server
```

## Quick Start

```typescript
import BinahPay from '@binahpay/server';

// Initialize with your API key
const binahpay = new BinahPay('pk_test_...');

// Create a checkout session
const session = await binahpay.checkout.sessions.create({
  line_items: [
    {
      product_id: 'prod_123',
      quantity: 1,
    },
  ],
  success_url: 'https://yourdomain.com/success',
  cancel_url: 'https://yourdomain.com/cancel',
  customer_email: 'customer@example.com',
  metadata: {
    order_id: '12345',
  },
});

console.log('Payment URL:', session.url);
// Share session.url with your customer
```

## API Reference

### Initialize SDK

```typescript
const binahpay = new BinahPay(apiKey, options);
```

**Parameters:**
- `apiKey` (string, required): Your BinahPay API key (`pk_test_...` or `pk_live_...`)
- `options` (object, optional):
  - `apiBase` (string): Custom API base URL (default: `https://x402-wrapper-nld7.vercel.app`)

### Create Checkout Session

```typescript
const session = await binahpay.checkout.sessions.create(params);
```

**Parameters:**
- `line_items` (array, required): Products to include in the session
  - `product_id` (string): ID of the product
  - `quantity` (number): Quantity of the product
- `success_url` (string, optional): URL to redirect after successful payment
- `cancel_url` (string, optional): URL to redirect if payment is cancelled
- `customer_email` (string, optional): Customer's email address
- `metadata` (object, optional): Custom key-value pairs to attach to the session
- `mode` (string, optional): Payment mode (default: `'payment'`)

**Returns:**
```typescript
{
  id: string;                    // Session ID
  url: string;                   // Payment page URL
  amount_total: number;          // Total amount in cents
  currency: string;              // Currency (e.g., "USDC")
  customer_email?: string;       // Customer email if provided
  payment_status: string;        // "unpaid" | "paid"
  status: string;                // "open" | "complete" | "expired"
  metadata: object;              // Custom metadata
  created: string;               // ISO timestamp
  expires_at: string;            // ISO timestamp
}
```

### Retrieve Checkout Session

```typescript
const session = await binahpay.checkout.sessions.retrieve(sessionId);
```

**Parameters:**
- `sessionId` (string, required): ID of the session to retrieve

**Returns:** Same as create

### Verify Webhook Signature

```typescript
const event = binahpay.webhooks.constructEvent(
  payload,
  signature,
  webhookSecret
);
```

**Parameters:**
- `payload` (string): Raw request body as string
- `signature` (string): Value of `X-BinahPay-Signature` header
- `webhookSecret` (string): Your webhook secret from the dashboard

**Returns:** Verified event object

**Throws:** `BinahPayError` if signature is invalid or timestamp is too old

## Full Examples

### Express.js Integration

```typescript
import express from 'express';
import BinahPay from '@binahpay/server';

const app = express();
const binahpay = new BinahPay(process.env.BINAHPAY_API_KEY!);

// Create checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await binahpay.checkout.sessions.create({
      line_items: [
        {
          product_id: req.body.productId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
      customer_email: req.body.email,
      metadata: {
        user_id: req.user.id,
        order_number: generateOrderNumber(),
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle webhook
app.post('/webhooks/binahpay', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-binahpay-signature'];
  const payload = req.body.toString();

  try {
    const event = binahpay.webhooks.constructEvent(
      payload,
      sig,
      process.env.BINAHPAY_WEBHOOK_SECRET!
    );

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Payment succeeded!', event.data);
        // Fulfill the order
        await fulfillOrder(event.data);
        break;
      
      case 'payment.succeeded':
        console.log('Payment confirmed:', event.data);
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.listen(3000);
```

### Next.js API Route

```typescript
// pages/api/create-checkout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import BinahPay from '@binahpay/server';

const binahpay = new BinahPay(process.env.BINAHPAY_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await binahpay.checkout.sessions.create({
      line_items: req.body.items,
      success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
      customer_email: req.body.email,
    });

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

```typescript
// pages/api/webhooks/binahpay.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import BinahPay from '@binahpay/server';
import { buffer } from 'micro';

const binahpay = new BinahPay(process.env.BINAHPAY_API_KEY!);

export const config = {
  api: {
    bodyParser: false, // Important: disable body parsing
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const buf = await buffer(req);
  const payload = buf.toString();
  const sig = req.headers['x-binahpay-signature'] as string;

  try {
    const event = binahpay.webhooks.constructEvent(
      payload,
      sig,
      process.env.BINAHPAY_WEBHOOK_SECRET!
    );

    // Process the event
    if (event.type === 'checkout.session.completed') {
      await processOrder(event.data);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error(err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
```

## Error Handling

```typescript
import BinahPay, { BinahPayError } from '@binahpay/server';

const binahpay = new BinahPay('pk_test_...');

try {
  const session = await binahpay.checkout.sessions.create({
    line_items: [{ product_id: 'prod_123', quantity: 1 }],
  });
} catch (error) {
  if (error instanceof BinahPayError) {
    console.error('BinahPay Error:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      raw: error.raw,
    });
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Webhook Events

BinahPay sends webhook events for the following types:

- `checkout.session.completed` - Checkout session completed successfully
- `payment.succeeded` - Payment was successful
- `payment.failed` - Payment failed

## Environment Variables

```bash
# Required
BINAHPAY_API_KEY=pk_test_...

# For webhooks
BINAHPAY_WEBHOOK_SECRET=whsec_...
```

## TypeScript Support

This SDK is written in TypeScript and includes type definitions.

```typescript
import BinahPay, { 
  CheckoutSession, 
  CheckoutSessionCreateParams,
  BinahPayError 
} from '@binahpay/server';
```

## Testing

Use test API keys (starting with `pk_test_`) for development:

```typescript
const binahpay = new BinahPay('pk_test_...');
```

Test on Base Sepolia testnet:
- Get test USDC: https://faucet.circle.com/

## Support

- Documentation: https://docs.binahpay.com
- Discord: https://discord.gg/binahpay
- Email: support@binahpay.com

## License

MIT
