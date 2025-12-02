# ROLA ACCESSORIES - Christmas Demo Store

A beautiful Christmas-themed e-commerce demo showcasing BinahPay's "1 line of code" checkout integration.

## Features

- 🎄 Christmas-themed design with snowfall animation
- 👞 12 Products (6 shoes + 6 clothing items) - all under $10 USDC
- 🛒 Shopping cart with quantity controls
- 💳 **BinahPay checkout integration (literally 1 line!)**
- ✅ Order confirmation with transaction hash

## The "1 Line of Code" Integration

```tsx
import BinahPayCheckout from '@binahpay/checkout';

<BinahPayCheckout session={sessionId} />
```

That's it! See `app/checkout/page.tsx` for the full example.

## Setup

1. **Install dependencies:**
   ```bash
   cd demo-store
   npm install
   ```

2. **Configure environment:**
   Create `.env.local`:
   ```
   BINAHPAY_API_KEY=pk_test_your_api_key
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Visit:**
   http://localhost:3001

## How It Works

1. **Browse Products** → User adds items to cart
2. **Proceed to Checkout** → Creates BinahPay session
3. **Pay with Crypto** → BinahPayCheckout component handles everything
4. **Order Confirmation** → Shows transaction hash

## File Structure

```
demo-store/
├── app/
│   ├── page.tsx (storefront)
│   ├── checkout/page.tsx (BinahPay integration!)
│   ├── success/page.tsx (confirmation)
│   ├── api/
│   │   └── create-session/route.ts
│   └── components/
│       ├── Header.tsx
│       ├── ProductCard.tsx
│       ├── Cart.tsx
│       └── Snowfall.tsx
├── lib/
│   └── products.ts (product catalog)
└── ...
```

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- @binahpay/checkout (the star of the show!)

## Why This Demo Matters

This demonstrates how **any merchant** can integrate BinahPay checkout with minimal code. 
The entire payment flow - wallet connection, signing, settlement - is handled by a single component.

Perfect example of BinahPay's philosophy: **"Web3 payments made simple"**

---

Built with ❤️ to showcase BinahPay
