# x402 Payment Integration Guide

## Overview

**xSynesis** is a **Stripe-like payment platform** that abstracts away all the complexity of the Coinbase x402 protocol. As a seller on xSynesis, you simply:

1. Register your API endpoints
2. Set prices for each endpoint
3. Receive USDC payments automatically
4. Monitor transactions via a dashboard

**We handle everything else:** Coinbase integration, payment verification, settlement, and webhook management. No crypto knowledge required.

---

## 1. For Sellers: Getting Started

### Step 1: Connect Your Wallet (One-time Setup)

Visit your seller dashboard and connect any EVM wallet (MetaMask, WalletConnect, Coinbase Wallet, etc.). This is where USDC payments will be received.

### Step 2: Register Your First Endpoint

```typescript
// Example: You have a premium API endpoint

// Before: Public (free)
GET /api/weather → Returns weather data

// After: Protected (paid)
GET /api/weather?premium=true → Returns premium weather data + AI analysis
```

Register it in the dashboard:

```
Endpoint: /api/weather?premium=true
Price: $0.01 per request
Network: Base Sepolia (testnet) or Base (mainnet)
Description: Premium weather with AI analysis
```

### Step 3: Test the Payment Flow

Visit the **Payment Demo** (`/pay-demo`) to see how buyers will pay:

- Buyer enters your endpoint URL
- xSynesis generates a QR code
- Buyer scans with any x402-compatible wallet
- Payment settles instantly
- Buyer gets access to your premium endpoint
- **You receive USDC directly in your wallet**

### Step 4: Monitor Your Transactions

Dashboard shows:

- All payment attempts with status (pending, confirmed, settled)
- Amount received in USDC
- Buyer wallet address
- Transaction timestamp
- Settlement proof (transaction hash)

---

## 2. Architecture: How xSynesis Works

```
┌─────────────────────────────────────────────────────────────┐
│                     xSynesis Platform                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Seller Dashboard (Your Management Interface)        │ │
│  │ - Register endpoints                                 │ │
│  │ - Set prices                                         │ │
│  │ - Monitor transactions                               │ │
│  │ - Withdraw funds                                     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Payment Processing (Hidden from You)                │ │
│  │ - Generate payment requirements (HTTP 402)           │ │
│  │ - Verify signatures with Coinbase facilitator        │ │
│  │ - Settle payments                                    │ │
│  │ - Handle webhooks                                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Buyer Interface (/pay-demo)                          │ │
│  │ - Paste your endpoint URL                            │ │
│  │ - Scan QR code with wallet                           │ │
│  │ - Sign payment authorization                         │ │
│  │ - Get instant access                                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Coinbase x402 Infrastructure                         │ │
│  │ - CDP Facilitator (mainnet)                          │ │
│  │ - x402.org/facilitator (testnet)                     │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Your Backend API
↓
xSynesis Payment Middleware (automatic)
↓
Coinbase x402 Protocol (hidden)
↓
Payments land in your wallet
```

---

## 3. Payment Flow (From Buyer Perspective)

1. **Buyer discovers your endpoint** → xSynesis dashboard or word-of-mouth
2. **Buyer visits payment demo** → Pastes your endpoint URL
3. **System shows payment requirements** → Amount, network, timeout
4. **QR code displays** → Buyer scans with any x402-compatible wallet
5. **Wallet shows approval request** → "Approve payment of $0.01 to access /api/weather"
6. **Buyer signs authorization** → No transaction needed, just a signature
7. **Signature sent to xSynesis** → Platform verifies with Coinbase
8. **Payment settled** → USDC deducted from buyer, sent to you
9. **Access granted** → Buyer can now call your premium endpoint
10. **You see transaction** → Dashboard shows settled payment + payer address

---

## 4. What You Don't Need to Do

❌ **No Coinbase setup** - We handle CDP credentials internally  
❌ **No API keys to manage** - xSynesis abstracts this  
❌ **No facilitator configuration** - Pre-configured for Base testnet/mainnet  
❌ **No webhook setup** - Automatic settlement tracking  
❌ **No wallet management** - Use any EVM wallet  
❌ **No compliance work** - xSynesis handles regulatory compliance  

---

## 5. What's Happening Behind the Scenes (Optional Reading)

If you're curious how it works technically:

### When a Buyer Requests Your Endpoint

```typescript
// Buyer: GET /api/weather?premium=true (without payment header)

// xSynesis responds:
HTTP 402 Payment Required
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base",
  "maxAmountRequired": "10000000", // $0.01 in atomic units
  "resource": "/api/weather?premium=true",
  "asset": "USDC",
  "facilitatorUrl": "/api/paid/resource"
}
```

### After Buyer Signs Payment

```typescript
// Buyer: GET /api/weather?premium=true
// Header: X-PAYMENT: base64(signed_payment_data)

// xSynesis verifies with Coinbase:
// ✓ Signature is valid
// ✓ Buyer has USDC balance
// ✓ Amount is correct
// ✓ Network matches

// Then xSynesis settles:
// → Coinbase pulls USDC from buyer
// → USDC sent to your wallet
// → Transaction finalizes

// Finally, endpoint returns:
HTTP 200 OK
{
  "weather": "sunny",
  "temperature": 72,
  "ai_analysis": "Perfect weather for outdoor activities"
}
```

### Settlement Webhook (Internal)

xSynesis automatically handles settlement webhooks from Coinbase:

```typescript
{
  "event": "payment.settled",
  "data": {
    "payment_id": "attempt_abc123",
    "payer": "0x742d35Cc6634C0532925a3b844Bc1e3c8f0a8D5E",
    "amount": "10000000",
    "asset": "USDC",
    "network": "base",
    "txHash": "0x8f1a4...",
    "timestamp": "2025-11-16T14:30:00Z"
  }
}
```

Your dashboard automatically updates to show this transaction.

---

## 6. FAQ

### Q: What networks do you support?

**A:** We start with Base Sepolia (testnet) and Base (mainnet). Solana support coming soon.

### Q: What if a buyer disputes the payment?

**A:** xSynesis handles disputes through Coinbase's system. You can configure refund policies in settings.

### Q: How do I withdraw my USDC?

**A:** Connect your wallet and use "Withdraw" in the dashboard. Funds transfer instantly to your wallet.

### Q: Can I set different prices for different endpoints?

**A:** Yes! Each endpoint registration has its own price configuration.

### Q: What about failed payments?

**A:** If a payment fails (insufficient balance, timeout, etc.), the buyer sees an error. You see nothing. No charge to either party.

### Q: Is my data secure?

**A:** Yes. All payments are cryptographically signed. xSynesis never has access to private keys. Coinbase handles security.

### Q: Can I test before going live?

**A:** Absolutely! Use Base Sepolia testnet with free USDC from the faucet: https://faucets.base.org

---

## 7. Getting Testnet USDC (Development)

1. Go to: https://faucets.base.org
2. Connect your wallet
3. Request testnet USDC
4. Use it to test payments on `/pay-demo`

---

## 8. Going Live (Mainnet)

When ready to accept real payments:

1. Switch network from "Base Sepolia" to "Base" in endpoint settings
2. Fund your wallet with real USDC on Base mainnet
3. Update endpoint prices to real values
4. xSynesis automatically uses Coinbase's mainnet facilitator
5. You start receiving real USDC payments

---

## 9. Dashboard Guide

### Endpoints Tab

- Register new endpoints
- Edit prices and descriptions
- Enable/disable endpoints
- View payment statistics

### Transactions Tab

- All payments with status
- Filter by date/amount/status
- Export data for accounting
- See payer wallet addresses

### Wallet Tab

- View current USDC balance
- Withdraw to your wallet
- View transaction history
- See fees (if any)

### Settings Tab

- Configure webhook receipts
- Set refund policies
- Manage team members
- API documentation

---

## 10. Next Steps

1. ✅ Connect your wallet in the dashboard
2. ✅ Register your first endpoint
3. ✅ Visit `/pay-demo` and test a payment
4. ✅ See the transaction in your dashboard
5. ✅ Request testnet USDC if needed
6. ✅ Monitor your balance and transactions

---

## Still Have Questions?

- **Live Demo**: Visit `/pay-demo` to see how it works
- **Documentation**: Check `/docs` for technical details
- **Support**: Email support@xsynesis.com

**Welcome to the future of API monetization! 🚀**
