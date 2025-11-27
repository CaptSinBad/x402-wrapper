# X402 Payment Verification & Facilitator Integration - Working Examples

## Overview
This guide provides working code patterns and implementations from the coinbase/x402 repository, focusing on payment verification, Authorization object structure, signature formats, and error handling.

---

## 1. PAYMENT PAYLOAD STRUCTURE (Exact EVM Scheme)

### Complete Example of Valid Payment Payload

```typescript
// From specs: Full working payment structure
const paymentPayload: PaymentPayload = {
  x402Version: 1,
  scheme: "exact",
  network: "base-sepolia",
  payload: {
    // EIP-712 signature (65 bytes hex)
    signature: "0x2d6a7588d6acca505cbf0d9a4a227e0c52c6c34008c8e8986a1283259764173608a2ce6496642e377d6da8dbbf5836e9bd15092f9ecab05ded3d6293af148b571c",
    
    // EIP-3009 Authorization object
    authorization: {
      from: "0x857b06519E91e3A54538791bDbb0E22373e36b66",      // Payer address
      to: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",        // Recipient address
      value: "10000",                                             // Amount in atomic units
      validAfter: "1740672089",                                   // Unix timestamp (10 min before now)
      validBefore: "1740672154",                                  // Unix timestamp (60 sec in future)
      nonce: "0x1234567890123456789012345678901234567890123456789012345678901234"  // 32-byte unique nonce
    }
  }
};
```

### EIP-3009 Authorization Types Definition

```typescript
// From coinbase/x402 source
const authorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};
```

### Authorization Object Structure for Signing

```typescript
// The exact structure passed to signAuthorization
interface ExactEvmPayloadAuthorization {
  from: string;           // 0x-prefixed address
  to: string;             // 0x-prefixed address
  value: string;          // Decimal string (NOT hex) - atomic units
  validAfter: string;     // Decimal string (NOT hex) - Unix timestamp
  validBefore: string;    // Decimal string (NOT hex) - Unix timestamp
  nonce: string;          // 0x-prefixed hex string, 66 chars (0x + 64 hex chars)
}
```

### Signature Format Expected

```typescript
// Signature must be:
// - 0x-prefixed hex string
// - Exactly 130 characters (0x + 128 hex chars)
// - EIP-712 compliant ECDSA signature (r || s || v)
// - Where v is 27 or 28

// Example valid signature
"0x1234567890123456789012345678901234567890123456789012345678901234" +
"5678901234567890123456789012345678901234567890123456789012345678901c"
```

---

## 2. FACILITATOR VERIFY FLOW (Node.js/TypeScript)

### Express Facilitator Example

```typescript
// From: examples/typescript/facilitator/index.ts
import express, { Request, Response } from "express";
import { verify, settle } from "x402/facilitator";
import {
  PaymentRequirementsSchema,
  PaymentPayloadSchema,
  createConnectedClient,
  createSigner,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
} from "x402/types";

const app = express();
app.use(express.json());

type VerifyRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

// GET endpoint returns API info
app.get("/verify", (req: Request, res: Response) => {
  res.json({
    endpoint: "/verify",
    description: "POST to verify x402 payments",
    body: {
      paymentPayload: "PaymentPayload",
      paymentRequirements: "PaymentRequirements",
    },
  });
});

// POST endpoint performs verification
app.post("/verify", async (req: Request, res: Response) => {
  try {
    const body: VerifyRequest = req.body;
    
    // 1. Parse and validate the request body
    const paymentRequirements = PaymentRequirementsSchema.parse(
      body.paymentRequirements
    );
    const paymentPayload = PaymentPayloadSchema.parse(
      body.paymentPayload
    );

    // 2. Create the appropriate client based on network
    let client;
    if (SupportedEVMNetworks.includes(paymentRequirements.network)) {
      client = createConnectedClient(paymentRequirements.network);
    } else if (SupportedSVMNetworks.includes(paymentRequirements.network)) {
      client = await createSigner(
        paymentRequirements.network,
        process.env.SVM_PRIVATE_KEY!
      );
    } else {
      throw new Error("Invalid network");
    }

    // 3. Call verify() with the client, payload, and requirements
    const valid = await verify(client, paymentPayload, paymentRequirements);
    
    // 4. Return response
    res.json(valid);
  } catch (error) {
    console.error("error", error);
    res.status(400).json({ error: "Invalid request" });
  }
});
```

### Using useFacilitator() Client

```typescript
// Client-side: From examples/typescript/servers/advanced/index.ts
import { useFacilitator } from "x402/verify";

const facilitatorUrl = process.env.FACILITATOR_URL as Resource;
const { verify, settle } = useFacilitator({ url: facilitatorUrl });

// In your request handler:
async function verifyPayment(
  req: express.Request,
  res: express.Response,
  paymentRequirements: PaymentRequirements[]
): Promise<boolean> {
  try {
    // 1. Get X-PAYMENT header
    const paymentHeader = req.headers["x-payment"] as string;
    if (!paymentHeader) {
      res.status(402).json({
        x402Version: 1,
        error: "X-PAYMENT header is required",
        accepts: paymentRequirements,
      });
      return false;
    }

    // 2. Decode payment
    const decodedPayment = exact.evm.decodePayment(paymentHeader);

    // 3. Find matching requirements
    const selectedPaymentRequirement =
      findMatchingPaymentRequirements(paymentRequirements, decodedPayment) ||
      paymentRequirements[0];

    // 4. Call facilitator verify
    const response = await verify(decodedPayment, selectedPaymentRequirement);
    
    if (!response.isValid) {
      res.status(402).json({
        x402Version: 1,
        error: response.invalidReason,
        accepts: paymentRequirements,
        payer: response.payer,
      });
      return false;
    }
    
    return true;
  } catch (error) {
    res.status(402).json({
      x402Version: 1,
      error: String(error),
      accepts: paymentRequirements,
    });
    return false;
  }
}
```

---

## 3. FACILITATOR VERIFY REQUEST/RESPONSE FORMAT

### Verify Request (POST /verify)

```typescript
// TypeScript
{
  x402Version: 1,
  paymentPayload: {
    x402Version: 1,
    scheme: "exact",
    network: "base-sepolia",
    payload: {
      signature: "0x...", // 65-byte hex signature
      authorization: {
        from: "0x857b06519E91e3A54538791bDbb0E22373e36b66",
        to: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
        value: "10000",
        validAfter: "1740672089",
        validBefore: "1740672154",
        nonce: "0x1234567890123456789012345678901234567890123456789012345678901234"
      }
    }
  },
  paymentRequirements: {
    scheme: "exact",
    network: "base-sepolia",
    maxAmountRequired: "10000",
    resource: "https://example.com/resource",
    description: "Access to premium data",
    mimeType: "application/json",
    payTo: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
    maxTimeoutSeconds: 60,
    asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    extra: {
      name: "USDC",
      version: "2"
    }
  }
}
```

### Successful Verify Response

```typescript
// isValid = true response
{
  isValid: true,
  invalidReason: undefined,  // Must be null/undefined for valid payments
  payer: "0x857b06519E91e3A54538791bDbb0E22373e36b66"
}
```

### Failed Verify Response (Examples)

```typescript
// Insufficient funds
{
  isValid: false,
  invalidReason: "insufficient_funds",
  payer: "0x857b06519E91e3A54538791bDbb0E22373e36b66"
}

// Expired authorization
{
  isValid: false,
  invalidReason: "invalid_exact_evm_payload_authorization_valid_before",
  payer: "0x857b06519E91e3A54538791bDbb0E22373e36b66"
}

// Invalid signature
{
  isValid: false,
  invalidReason: "invalid_exact_evm_payload_signature",
  payer: "0x857b06519E91e3A54538791bDbb0E22373e36b66"
}

// Recipient mismatch
{
  isValid: false,
  invalidReason: "invalid_exact_evm_payload_recipient_mismatch",
  payer: "0x857b06519E91e3A54538791bDbb0E22373e36b66"
}

// Invalid amount
{
  isValid: false,
  invalidReason: "invalid_exact_evm_payload_authorization_value",
  payer: "0x857b06519E91e3A54538791bDbb0E22373e36b66"
}

// Invalid payload structure
{
  isValid: false,
  invalidReason: "invalid_payload",
  payer: ""  // May be empty if payload is malformed
}
```

---

## 4. AUTHORIZATION SIGNING & VERIFICATION STEPS

### How Authorization is Created (Client-Side)

```typescript
// From: typescript/packages/x402/src/schemes/exact/evm/client.ts
// Step 1: Prepare unsigned authorization
export function preparePaymentHeader(
  from: Address,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): UnsignedPaymentPayload {
  const nonce = createNonce(); // Random 32-byte hex string
  const validAfter = BigInt(
    Math.floor(Date.now() / 1000) - 600, // 10 minutes before
  ).toString();
  const validBefore = BigInt(
    Math.floor(Date.now() / 1000 + paymentRequirements.maxTimeoutSeconds),
  ).toString();

  return {
    x402Version,
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    payload: {
      signature: undefined, // Will be filled after signing
      authorization: {
        from,
        to: paymentRequirements.payTo,
        value: paymentRequirements.maxAmountRequired,
        validAfter,
        validBefore,
        nonce,
      },
    },
  };
}

// Step 2: Sign the authorization
export async function signAuthorization(
  walletClient: SignerWallet | LocalAccount,
  authorization: ExactEvmPayloadAuthorization,
  paymentRequirements: PaymentRequirements,
): Promise<{ signature: Hex }> {
  // Build EIP-712 typed data
  const permitTypedData = {
    types: authorizationTypes,
    primaryType: "TransferWithAuthorization",
    domain: {
      name,              // USDC
      version,           // "2"
      chainId,           // 84532 for Base Sepolia
      verifyingContract: paymentRequirements.asset, // USDC contract address
    },
    message: {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: authorization.nonce,
    },
  };

  // Sign the typed data
  const signature = await walletClient.signTypedData(permitTypedData);
  return { signature };
}

// Step 3: Create final payment
export async function signPaymentHeader(
  client: SignerWallet | LocalAccount,
  paymentRequirements: PaymentRequirements,
  unsignedPaymentHeader: UnsignedPaymentPayload,
): Promise<PaymentPayload> {
  const { signature } = await signAuthorization(
    client,
    unsignedPaymentHeader.payload.authorization,
    paymentRequirements,
  );

  return {
    ...unsignedPaymentHeader,
    payload: {
      ...unsignedPaymentHeader.payload,
      signature, // Now has the signature
    },
  };
}
```

### How Authorization is Verified (Facilitator-Side)

```typescript
// From: typescript/packages/x402/src/schemes/exact/evm/facilitator.ts
export async function verify(
  client: ConnectedClient,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<VerifyResponse> {
  const exactEvmPayload = payload.payload as ExactEvmPayload;

  // 1. Verify payload version
  if (payload.x402Version !== 1) {
    return {
      isValid: false,
      invalidReason: "unsupported_payload_version",
      payer: exactEvmPayload.authorization.from,
    };
  }

  // 2. Verify scheme matches
  if (payload.scheme !== SCHEME || paymentRequirements.scheme !== SCHEME) {
    return {
      isValid: false,
      invalidReason: "unsupported_scheme",
      payer: exactEvmPayload.authorization.from,
    };
  }

  // 3. Get network and USDC info
  const chainId = getNetworkId(payload.network);
  const name = paymentRequirements.extra?.name ?? config[chainId].usdcName;
  const erc20Address = paymentRequirements.asset as Address;
  const version = paymentRequirements.extra?.version ?? (await getVersion(client));

  // 4. Build the EIP-712 domain and types for verification
  const permitTypedData = {
    types: authorizationTypes,
    primaryType: "TransferWithAuthorization",
    domain: {
      name,
      version,
      chainId,
      verifyingContract: erc20Address,
    },
    message: {
      from: exactEvmPayload.authorization.from,
      to: exactEvmPayload.authorization.to,
      value: exactEvmPayload.authorization.value,
      validAfter: exactEvmPayload.authorization.validAfter,
      validBefore: exactEvmPayload.authorization.validBefore,
      nonce: exactEvmPayload.authorization.nonce,
    },
  };

  // 5. Verify the signature against the typed data
  const recoveredAddress = await client.verifyTypedData({
    address: exactEvmPayload.authorization.from as Address,
    ...permitTypedData,
    signature: exactEvmPayload.signature as Hex,
  });
  
  if (!recoveredAddress) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_signature",
      payer: exactEvmPayload.authorization.from,
    };
  }

  // 6. Verify recipient address matches requirements
  if (getAddress(exactEvmPayload.authorization.to) !== 
      getAddress(paymentRequirements.payTo)) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_recipient_mismatch",
      payer: exactEvmPayload.authorization.from,
    };
  }

  // 7. Verify deadline is not yet expired (with 6-second buffer)
  if (
    BigInt(exactEvmPayload.authorization.validBefore) < 
    BigInt(Math.floor(Date.now() / 1000) + 6)
  ) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_authorization_valid_before",
      payer: exactEvmPayload.authorization.from,
    };
  }

  // 8. Verify deadline is not yet valid
  if (BigInt(exactEvmPayload.authorization.validAfter) > 
      BigInt(Math.floor(Date.now() / 1000))) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_authorization_valid_after",
      payer: exactEvmPayload.authorization.from,
    };
  }

  // 9. Verify sufficient USDC balance
  const balance = await getERC20Balance(
    client,
    erc20Address,
    exactEvmPayload.authorization.from as Address,
  );
  if (balance < BigInt(paymentRequirements.maxAmountRequired)) {
    return {
      isValid: false,
      invalidReason: "insufficient_funds",
      payer: exactEvmPayload.authorization.from,
    };
  }

  // 10. Verify payment amount is sufficient
  if (BigInt(exactEvmPayload.authorization.value) < 
      BigInt(paymentRequirements.maxAmountRequired)) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_authorization_value",
      payer: exactEvmPayload.authorization.from,
    };
  }

  // All checks passed!
  return {
    isValid: true,
    invalidReason: undefined,
    payer: exactEvmPayload.authorization.from,
  };
}
```

---

## 5. KNOWN ISSUES & COMMON MISTAKES

### 🚨 Issue #1: Invalid Payload Format

```typescript
// WRONG - Sending raw string instead of object
const verify = await facilitator.verify("invalid-payment-header", requirements);

// RIGHT - Parse first, then send object
const decodedPayload = exact.evm.decodePayment(paymentHeader);
const verify = await facilitator.verify(decodedPayload, requirements);
```

### 🚨 Issue #2: "invalid_payload" Error

**Causes:**
- Missing `authorization` field in payload
- Missing `signature` field
- Incorrect field types
- Malformed hex strings (missing 0x prefix)

```typescript
// WRONG - Missing nonce 0x prefix
{
  authorization: {
    nonce: "1234567890..." // ❌ Should be 0x-prefixed
  }
}

// RIGHT
{
  authorization: {
    nonce: "0x1234567890..." // ✅ 0x-prefixed
  }
}
```

### 🚨 Issue #3: Payment Amount Mismatches

```typescript
// Three different amount fields must match or be consistent:

// In the authorization
authorization: {
  value: "10000"  // Atomic units the payer is authorizing
}

// In the requirements
paymentRequirements: {
  maxAmountRequired: "10000"  // Minimum amount required
}

// WRONG: Mismatch
authorization.value = "5000" // Too low
maxAmountRequired = "10000"   // Results in: invalid_exact_evm_payload_authorization_value
```

### 🚨 Issue #4: Recipient Address Mismatch

```typescript
// These MUST match exactly (case-insensitive at contract level, but should match):

authorization: {
  to: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C"  // Where payment goes
}

paymentRequirements: {
  payTo: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C"  // Expected recipient
}

// WRONG: Different addresses
// Results in: invalid_exact_evm_payload_recipient_mismatch
```

### 🚨 Issue #5: Expired Authorization

```typescript
// validBefore must be AFTER current time
const now = Math.floor(Date.now() / 1000);

// WRONG: Already expired
authorization: {
  validBefore: now - 100  // ❌ Already in the past
}

// RIGHT: Buffer for processing
authorization: {
  validBefore: now + 3600  // ✅ 1 hour in future
}

// Facilitator adds 6-second buffer:
// if (validBefore < now + 6) => invalid_exact_evm_payload_authorization_valid_before
```

### 🚨 Issue #6: Insufficient Balance

```typescript
// Verify sender has USDC balance >= value

// WRONG: User has 5000 USDC but trying to pay 10000
authorization: {
  from: "0x857b06519E91e3A54538791bDbb0E22373e36b66",
  value: "10000"  // Balance check will fail
}

// Results in: insufficient_funds
```

### 🚨 Issue #7: Invalid Signature

```typescript
// Signature must be valid EIP-712 signature of the authorization

// The facilitator recovers the signer by:
1. Building the exact EIP-712 typed data
2. Calling verifyTypedData(address, typedData, signature)
3. Checking if recovered address === authorization.from

// WRONG: Signature doesn't match or was signed differently
// Results in: invalid_exact_evm_payload_signature

// If signature parsing fails or is malformed:
// Results in: "invalid_exact_evm_payload_signature" or potentially internal error
```

---

## 6. PYTHON IMPLEMENTATION EXAMPLE

```python
# From: python/x402/src/x402/facilitator.py
from x402.types import PaymentPayload, PaymentRequirements, VerifyResponse

class FacilitatorClient:
    async def verify(
        self, 
        payment: PaymentPayload, 
        payment_requirements: PaymentRequirements
    ) -> VerifyResponse:
        """Verify a payment is valid"""
        headers = {"Content-Type": "application/json"}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.config['url']}/verify",
                json={
                    "x402Version": payment.x402_version,
                    "paymentPayload": payment.model_dump(by_alias=True),
                    "paymentRequirements": payment_requirements.model_dump(
                        by_alias=True, exclude_none=True
                    ),
                },
                headers=headers,
                follow_redirects=True,
            )

            data = response.json()
            return VerifyResponse(**data)  # Returns VerifyResponse with isValid, invalidReason, payer
```

---

## 7. X-PAYMENT HEADER FORMAT

### Header Transport

```typescript
// X-PAYMENT header = Base64 encoded JSON PaymentPayload

// Example decoded:
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base-sepolia",
  "payload": {
    "signature": "0x...",
    "authorization": {
      "from": "0x...",
      "to": "0x...",
      "value": "10000",
      "validAfter": "1740672089",
      "validBefore": "1740672154",
      "nonce": "0x..."
    }
  }
}

// HTTP Header
X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwiand...base64...w==

// Decode in TypeScript
import { exact } from "x402/schemes";
const decodedPayment = exact.evm.decodePayment(xPaymentHeader);
```

### X-PAYMENT-RESPONSE Header (Post-Settlement)

```typescript
// After successful settlement, facilitator returns:
X-PAYMENT-RESPONSE: eyJzdWNjZXNzIjp0cnVlLCJ0cmFuc2FjdGlv...

// Decoded:
{
  "success": true,
  "transaction": "0xabc123...",  // Transaction hash
  "network": "base-sepolia",
  "payer": "0x857b06519E91e3A54538791bDbb0E22373e36b66"
}
```

---

## 8. SUCCESSFUL VS FAILED FLOWS

### Successful Payment Flow

```
1. Client creates unsigned payment header:
   - generateNonce() → random 32-byte hex
   - validAfter = now - 600 seconds
   - validBefore = now + maxTimeoutSeconds
   
2. Client signs authorization with EIP-712:
   - Uses walletClient.signTypedData()
   - Adds signature to payload
   - Encodes to base64 X-PAYMENT header

3. Client sends request with X-PAYMENT header

4. Resource server receives:
   - Decodes X-PAYMENT header
   - Extracts paymentPayload and paymentRequirements
   - Calls facilitator.verify(paymentPayload, requirements)

5. Facilitator verifies 10 checks (see section 4):
   - ✅ Version compatibility
   - ✅ Scheme match
   - ✅ Valid signature
   - ✅ Recipient match
   - ✅ Not expired (validBefore)
   - ✅ Not pre-dated (validAfter)
   - ✅ Sufficient balance
   - ✅ Amount sufficient
   - ✅ USDC contract correct
   - ✅ Chain correct

6. Facilitator returns:
   {
     "isValid": true,
     "payer": "0x857b06519E91e3A54538791bDbb0E22373e36b66"
   }

7. Resource server:
   - Processes request
   - Calls facilitator.settle(payment, requirements)
   - Adds X-PAYMENT-RESPONSE header
   - Returns 200 with content
```

### Failed Payment Flow (Invalid Signature)

```
1-4. Same as successful flow

5. Facilitator verification:
   - ✅ Version OK
   - ✅ Scheme OK
   - ❌ Signature verification fails
   
   const recoveredAddress = await client.verifyTypedData({
     address: authorization.from,
     ...typedData,
     signature: payload.signature
   });
   
   // recoveredAddress !== authorization.from
   // OR signature parsing fails

6. Facilitator returns:
   {
     "isValid": false,
     "invalidReason": "invalid_exact_evm_payload_signature",
     "payer": "0x857b06519E91e3A54538791bDbb0E22373e36b66"
   }

7. Resource server:
   - Returns 402 Payment Required
   - Includes this verification response
   - Client should NOT retry with same payment
```

---

## 9. ERROR CODES & CAUSES

| Error Code | Cause | Solution |
|-----------|-------|----------|
| `invalid_payload` | Malformed JSON or missing required fields | Check payload structure, ensure all fields present |
| `unsupported_scheme` | Scheme not "exact" | Use "exact" scheme |
| `invalid_network` | Network not supported | Use base-sepolia, ethereum-mainnet, or supported network |
| `invalid_exact_evm_payload_signature` | Signature doesn't recover to signer address | Re-sign with correct wallet, check typed data matches |
| `invalid_exact_evm_payload_recipient_mismatch` | `to` ≠ `payTo` | Ensure recipient address matches payment requirements |
| `invalid_exact_evm_payload_authorization_valid_before` | `validBefore` ≤ now | Recreate payment with future validBefore |
| `invalid_exact_evm_payload_authorization_valid_after` | `validAfter` > now | Use current time or slightly in past for validAfter |
| `insufficient_funds` | Payer balance < value | Ensure payer has sufficient USDC balance |
| `invalid_exact_evm_payload_authorization_value` | `value` < `maxAmountRequired` | Increase authorized value to meet requirements |

---

## 10. TESTING & VERIFICATION CHECKLIST

### Before Sending to Facilitator

- [ ] `x402Version` = 1
- [ ] `scheme` = "exact"
- [ ] `network` is supported (base-sepolia, etc.)
- [ ] `signature` is 0x-prefixed 130-char hex string
- [ ] `authorization.from` is 0x-prefixed 40-char hex string
- [ ] `authorization.to` matches `paymentRequirements.payTo`
- [ ] `authorization.value` ≥ `paymentRequirements.maxAmountRequired`
- [ ] `authorization.validAfter` is in past (now - 600)
- [ ] `authorization.validBefore` is in future (now + maxTimeoutSeconds)
- [ ] `authorization.nonce` is 0x-prefixed 66-char hex
- [ ] `paymentRequirements.asset` is valid USDC address for network
- [ ] Payer has sufficient USDC balance

### After Receiving Response

- For `isValid: true`:
  - [ ] `invalidReason` is null/undefined
  - [ ] `payer` field populated
  - [ ] Proceed to settle
  
- For `isValid: false`:
  - [ ] Check `invalidReason` against error codes table
  - [ ] Do NOT retry same payment
  - [ ] Generate new payment with fixes applied

---

## 11. QUICK REFERENCE - WORKING CODE SNIPPET

```typescript
// Full working example from coinbase/x402
import { useFacilitator } from "x402/verify";
import { exact } from "x402/schemes";
import { PaymentRequirements, PaymentPayload } from "x402/types";

// 1. Initialize facilitator client
const { verify, settle } = useFacilitator({ 
  url: "https://x402.org/facilitator"
});

// 2. Receive X-PAYMENT header from client
const xPaymentHeader = request.headers.get("X-PAYMENT");

// 3. Decode the payment
const decodedPayment: PaymentPayload = exact.evm.decodePayment(xPaymentHeader);

// 4. Define payment requirements (what resource costs)
const paymentRequirements: PaymentRequirements = {
  scheme: "exact",
  network: "base-sepolia",
  maxAmountRequired: "10000",
  resource: "https://api.example.com/premium",
  description: "Premium API access",
  mimeType: "application/json",
  payTo: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  maxTimeoutSeconds: 300,
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  extra: {
    name: "USDC",
    version: "2"
  }
};

// 5. Verify payment with facilitator
const verifyResponse = await verify(decodedPayment, paymentRequirements);

if (!verifyResponse.isValid) {
  // Payment invalid - return 402
  return new Response(
    JSON.stringify({
      x402Version: 1,
      error: verifyResponse.invalidReason,
      accepts: [paymentRequirements],
      payer: verifyResponse.payer
    }),
    { status: 402 }
  );
}

// 6. Payment valid - settle and return content
const settleResponse = await settle(decodedPayment, paymentRequirements);

if (settleResponse.success) {
  // Create response with settlement confirmation
  const response = new Response(JSON.stringify({ data: "content" }));
  response.headers.set(
    "X-PAYMENT-RESPONSE",
    btoa(JSON.stringify(settleResponse))
  );
  return response;
}
```

---

## References
- **Repo**: https://github.com/coinbase/x402
- **Examples**: `/examples/typescript/facilitator/`
- **Types**: `/typescript/packages/x402/src/types/`
- **Verification**: `/typescript/packages/x402/src/schemes/exact/evm/facilitator.ts`
- **Specs**: `/specs/x402-specification.md`
