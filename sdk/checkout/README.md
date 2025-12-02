# @binahpay/checkout

Drop-in React component for accepting crypto payments with BinahPay. **Integrate payments with just 1 line of code.**

## Installation

```bash
npm install @binahpay/checkout
# or
yarn add @binahpay/checkout
# or
pnpm add @binahpay/checkout
```

## Quick Start (1 Line of Code!)

```tsx
import BinahPayCheckout from '@binahpay/checkout';

function MyPage() {
  return <BinahPayCheckout session="cs_abc123..." />;
}
```

That's it! The component handles:
- ✅ Wallet connection UI
- ✅ Payment signing
- ✅ Transaction submission
- ✅ Success/error states

## Full Example

```tsx
import BinahPayCheckout from '@binahpay/checkout';

function CheckoutPage() {
  return (
    <BinahPayCheckout
      session="cs_abc123..."
      onSuccess={(session, txHash) => {
        console.log('Payment successful!', txHash);
        // Redirect, show confirmation, etc.
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
      }}
      style={{ maxWidth: '600px', margin: '0 auto' }}
    />
  );
}
```

## Creating a Session

Use the [@binahpay/server](https://www.npmjs.com/package/@binahpay/server) SDK to create checkout sessions:

```tsx
// Server-side (API route)
import BinahPay from '@binahpay/server';

const binahpay = new BinahPay(process.env.BINAHPAY_API_KEY!);

const session = await binahpay.checkout.sessions.create({
  line_items: [
    {
      product_id: 'prod_123',
      quantity: 1,
    },
  ],
  success_url: 'https://yourdomain.com/success',
  cancel_url: 'https://yourdomain.com/cancel',
});

// Pass session.id to your frontend
return { sessionId: session.id };
```

```tsx
// Client-side (React component)
import BinahPayCheckout from '@binahpay/checkout';

function Page({ sessionId }: { sessionId: string }) {
  return <BinahPayCheckout session={sessionId} />;
}
```

## API Reference

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `session` | `string` | ✅ | Checkout session ID from `binahpay.checkout.sessions.create()` |
| `apiBase` | `string` | ❌ | API base URL (defaults to production) |
| `onSuccess` | `(session, txHash) => void` | ❌ | Called when payment succeeds |
| `onCancel` | `() => void` | ❌ | Called when user cancels |
| `onError` | `(error: string) => void` | ❌ | Called on error |
| `style` | `React.CSSProperties` | ❌ | Custom styles for the container |

## Advanced Usage

### With Existing Wagmi Provider

If your app already has Wagmi/AppKit providers, use the raw component:

```tsx
import { BinahPayCheckout } from '@binahpay/checkout';

// In a component that's already wrapped with WagmiProvider
function Page() {
  return <BinahPayCheckout session="cs_123..." />;
}
```

### Custom Styling

```tsx
<BinahPayCheckout
  session="cs_123..."
  style={{
    maxWidth: '800px',
    margin: '0 auto',
    padding: '32px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  }}
/>
```

## Next.js Integration

### App Router (Next.js 13+)

```tsx
// app/checkout/page.tsx
import BinahPayCheckout from '@binahpay/checkout';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { session: string };
}) {
  return (
    <div>
      <h1>Checkout</h1>
      <BinahPayCheckout session={searchParams.session} />
    </div>
  );
}
```

### Pages Router

```tsx
// pages/checkout.tsx
import BinahPayCheckout from '@binahpay/checkout';
import { useRouter } from 'next/router';

export default function CheckoutPage() {
  const router = useRouter();
  const { session } = router.query;

  if (!session) return <div>Loading...</div>;

  return <BinahPayCheckout session={session as string} />;
}
```

## Supported Networks

- **Base Mainnet** (default for production)
- **Base Sepolia** (default for test mode)

The component automatically detects the network based on your session.

## Payment Flow

1. **User connects wallet** → AppKit modal appears
2. **User signs payment** → EIP-712 typed signature
3. **Payment submits** → Transaction sent to blockchain
4. **Success callback** → `onSuccess` called with transaction hash

## Styling

The component uses inline styles by default but respects the `style` prop for custom styling. For advanced theming, fork the component and customize directly.

## TypeScript Support

Full TypeScript support included:

```tsx
import type { BinahPayCheckoutProps } from '@binahpay/checkout';

const props: BinahPayCheckoutProps = {
  session: 'cs_123...',
  onSuccess: (session, txHash) => {
    // session and txHash are fully typed
  },
};
```

## Environment Setup

You'll need a WalletConnect Project ID. Get one at [cloud.walletconnect.com](https://cloud.walletconnect.com).

Set it in your environment:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Support

- **Documentation:** https://docs.binahpay.com
- **Discord:** https://discord.gg/binahpay
- **Email:** support@binahpay.com

## License

MIT
