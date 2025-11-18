# X402 Working Code Patterns - Direct Implementation Guide

This document contains production-ready code snippets and patterns extracted directly from the coinbase/x402 repository.

---

## PART 1: CREATE PAYMENT (Client-Side)

### Complete Payment Creation Flow

```typescript
// Full working implementation
import { createPaymentHeader } from "x402/schemes/exact/evm/client";
import { PaymentRequirements } from "x402/types";
import { createSignerSepolia } from "x402/types"; // Or your signer

// Your payment requirements
const paymentRequirements: PaymentRequirements = {
  scheme: "exact",
  network: "base-sepolia",
  maxAmountRequired: "1000000",      // 1 USDC in atomic units
  resource: "https://api.example.com/protected",
  description: "Access to protected API",
  mimeType: "application/json",
  payTo: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  maxTimeoutSeconds: 300,             // 5 minutes
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",  // USDC on Base Sepolia
  extra: {
    name: "USDC",
    version: "2"
  }
};

// Create signer (example with Coinbase CDP SDK)
const signer = await createSignerSepolia(YOUR_PRIVATE_KEY);

// Method 1: Create complete signed payment in one call
const paymentHeader = await createPaymentHeader(
  signer,
  1,                            // x402Version
  paymentRequirements
);

// paymentHeader is a base64-encoded string ready to use as X-PAYMENT header

// Method 2: Step by step (if you need to see intermediate steps)
import { preparePaymentHeader, signPaymentHeader } from "x402/schemes/exact/evm/client";

// Step 2a: Prepare unsigned
const unsignedPayment = preparePaymentHeader(
  signer.account.address,
  1,
  paymentRequirements
);

// Step 2b: Sign
const signedPayment = await signPaymentHeader(
  signer,
  paymentRequirements,
  unsignedPayment
);

// Step 2c: Encode
import { encodePayment } from "x402/schemes/exact/evm/utils/paymentUtils";
const encodedHeader = encodePayment(signedPayment);

// encodedHeader === paymentHeader from Method 1
```

---

## PART 2: VERIFY PAYMENT (Facilitator-Side)

### Complete Verify Endpoint (Express)

```typescript
import express from "express";
import { verify } from "x402/facilitator";
import {
  PaymentPayloadSchema,
  PaymentRequirementsSchema,
  createConnectedClient,
} from "x402/types";

const app = express();
app.use(express.json());

app.post("/verify", async (req: express.Request, res: express.Response) => {
  try {
    // 1. Parse request body
    const { paymentPayload, paymentRequirements } = req.body;

    // 2. Validate with Zod schemas
    const validatedPayload = PaymentPayloadSchema.parse(paymentPayload);
    const validatedRequirements = PaymentRequirementsSchema.parse(paymentRequirements);

    // 3. Create blockchain client for verification
    const client = createConnectedClient(validatedRequirements.network);

    // 4. Call verify function
    const verifyResponse = await verify(
      client,
      validatedPayload,
      validatedRequirements
    );

    // 5. Return response
    res.status(200).json(verifyResponse);

  } catch (error) {
    console.error("Verify error:", error);
    res.status(400).json({
      isValid: false,
      invalidReason: "invalid_payload",
      payer: ""
    });
  }
});
```

### Complete Verify Endpoint (Next.js)

```typescript
// app/facilitator/verify/route.ts
import {
  PaymentPayload,
  PaymentPayloadSchema,
  PaymentRequirements,
  PaymentRequirementsSchema,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
  VerifyResponse,
  createConnectedClient,
  createSigner,
} from "x402/types";
import { verify } from "x402/facilitator";

type VerifyRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

export async function POST(req: Request) {
  try {
    const body: VerifyRequest = await req.json();

    // Determine client type based on network
    const network = body.paymentRequirements.network;
    let client;

    if (SupportedEVMNetworks.includes(network)) {
      client = createConnectedClient(network);
    } else if (SupportedSVMNetworks.includes(network)) {
      client = await createSigner(network, process.env.SOLANA_PRIVATE_KEY!);
    } else {
      return Response.json(
        {
          isValid: false,
          invalidReason: "invalid_network",
        } as VerifyResponse,
        { status: 400 }
      );
    }

    // Validate schemas
    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);
    } catch (error) {
      console.error("Invalid payment payload:", error);
      return Response.json(
        {
          isValid: false,
          invalidReason: "invalid_payload",
          payer:
            body.paymentPayload?.payload && "authorization" in body.paymentPayload.payload
              ? body.paymentPayload.payload.authorization.from
              : "",
        } as VerifyResponse,
        { status: 400 }
      );
    }

    let paymentRequirements: PaymentRequirements;
    try {
      paymentRequirements = PaymentRequirementsSchema.parse(
        body.paymentRequirements
      );
    } catch (error) {
      console.error("Invalid payment requirements:", error);
      return Response.json(
        {
          isValid: false,
          invalidReason: "invalid_payment_requirements",
          payer:
            "authorization" in paymentPayload.payload
              ? paymentPayload.payload.authorization.from
              : "",
        } as VerifyResponse,
        { status: 400 }
      );
    }

    // Perform verification
    const valid = await verify(client, paymentPayload, paymentRequirements);
    return Response.json(valid);

  } catch (error) {
    console.error("Error verifying payment:", error);
    return Response.json(
      {
        isValid: false,
        invalidReason: "unexpected_verify_error",
        payer: "",
      } as VerifyResponse,
      { status: 500 }
    );
  }
}
```

---

## PART 3: USE FACILITATOR CLIENT (Resource Server)

### Verify & Settle with Facilitator Client

```typescript
// app/protected-route.ts
import { useFacilitator } from "x402/verify";
import { exact } from "x402/schemes";
import { PaymentRequirements, settleResponseHeader } from "x402/types";
import { findMatchingPaymentRequirements, processPriceToAtomicAmount } from "x402/shared";

// Initialize facilitator client
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://x402.org/facilitator";
const { verify, settle } = useFacilitator({ url: FACILITATOR_URL });

// Define payment requirements for your resource
const paymentRequirements: PaymentRequirements = {
  scheme: "exact",
  network: "base-sepolia",
  maxAmountRequired: processPriceToAtomicAmount("$0.01", 6), // 0.01 USDC
  resource: "https://api.example.com/weather",
  description: "Access to weather data",
  mimeType: "application/json",
  payTo: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  maxTimeoutSeconds: 60,
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  extra: {
    name: "USDC",
    version: "2"
  }
};

export async function handlePaymentVerification(req: express.Request) {
  // 1. Get X-PAYMENT header
  const paymentHeader = req.headers["x-payment"];
  
  if (!paymentHeader) {
    return {
      status: 402,
      body: {
        x402Version: 1,
        error: "X-PAYMENT header is required",
        accepts: [paymentRequirements],
      }
    };
  }

  try {
    // 2. Decode payment
    const decodedPayment = exact.evm.decodePayment(paymentHeader);

    // 3. Find matching payment requirement (if multiple accepted)
    const selectedRequirement =
      findMatchingPaymentRequirements([paymentRequirements], decodedPayment) ||
      paymentRequirements;

    // 4. Verify with facilitator
    const verifyResponse = await verify(decodedPayment, selectedRequirement);

    if (!verifyResponse.isValid) {
      return {
        status: 402,
        body: {
          x402Version: 1,
          error: verifyResponse.invalidReason,
          accepts: [selectedRequirement],
          payer: verifyResponse.payer,
        }
      };
    }

    // 5. Payment verified! Process the request
    const contentData = getWeatherData();

    // 6. Settle the payment
    try {
      const settleResponse = await settle(decodedPayment, selectedRequirement);
      
      return {
        status: 200,
        body: contentData,
        headers: {
          "X-PAYMENT-RESPONSE": settleResponseHeader(settleResponse),
          "Content-Type": "application/json",
        }
      };
    } catch (settleError) {
      console.error("Settlement failed:", settleError);
      // Still return content if settlement fails (optional policy)
      return {
        status: 200,
        body: contentData,
        headers: {
          "Content-Type": "application/json",
        }
      };
    }

  } catch (error) {
    console.error("Payment verification error:", error);
    return {
      status: 402,
      body: {
        x402Version: 1,
        error: error instanceof Error ? error.message : "Payment verification failed",
        accepts: [paymentRequirements],
      }
    };
  }
}
```

---

## PART 4: AUTHORIZATION OBJECT STRUCTURE

### Step-by-Step Authorization Building

```typescript
// How x402 constructs the authorization object for signing

import { createNonce } from "x402/schemes/exact/evm/sign";
import { Address } from "viem";

interface ExactEvmPayloadAuthorization {
  from: Address;          // Payer wallet
  to: Address;            // Recipient (payTo)
  value: string;          // Amount in atomic units
  validAfter: string;     // Unix timestamp (should be ~now - 600)
  validBefore: string;    // Unix timestamp (should be ~now + maxTimeoutSeconds)
  nonce: string;          // 0x-prefixed 32-byte hex string
}

// Function to create authorization
function createAuthorization(
  from: Address,
  to: Address,
  amountAtomicUnits: string,
  maxTimeoutSeconds: number
): ExactEvmPayloadAuthorization {
  const now = Math.floor(Date.now() / 1000);
  
  return {
    from,                                           // 0x...
    to,                                             // 0x...
    value: amountAtomicUnits,                      // "1000000" for 1 USDC
    validAfter: (now - 600).toString(),            // 10 minutes ago
    validBefore: (now + maxTimeoutSeconds).toString(), // Future timestamp
    nonce: createNonce(),                          // Random 0x-prefixed hex
  };
}

// Usage
const auth = createAuthorization(
  "0x857b06519E91e3A54538791bDbb0E22373e36b66",
  "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  "1000000",  // 1 USDC
  300         // 5 minutes
);

// Result:
/*
{
  from: "0x857b06519E91e3A54538791bDbb0E22373e36b66",
  to: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  value: "1000000",
  validAfter: "1740672089",
  validBefore: "1740672389",
  nonce: "0x1234567890123456789012345678901234567890123456789012345678901234"
}
*/
```

### EIP-712 Typed Data for Signing

```typescript
import { Address } from "viem";
import { authorizationTypes } from "x402/types/shared/evm";

// This is what gets signed
function createEIP712TypedData(
  authorization: ExactEvmPayloadAuthorization,
  chainId: number,
  usdcAddress: Address,
  usdcName: string = "USDC",
  usdcVersion: string = "2"
) {
  return {
    types: authorizationTypes,  // TransferWithAuthorization fields
    primaryType: "TransferWithAuthorization",
    domain: {
      name: usdcName,
      version: usdcVersion,
      chainId: chainId,
      verifyingContract: usdcAddress,
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
}

// Example: Base Sepolia
const typedData = createEIP712TypedData(
  auth,
  84532,  // Base Sepolia chain ID
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e",  // USDC Base Sepolia
  "USDC",
  "2"
);

// Now sign this typed data with wallet
const signature = await walletClient.signTypedData(typedData);

// Signature format:
// - 0x-prefixed hex string
// - 130 characters total (0x + 128 hex chars)
// - Example: 0x2d6a7588d6acca505cbf0d9a4a227e0c52c6c3...
```

---

## PART 5: ERROR HANDLING PATTERNS

### Complete Error Handler

```typescript
import { VerifyResponse } from "x402/types";

function getErrorDetails(
  invalidReason: string | null | undefined
): { message: string; retryable: boolean } {
  const errors: Record<string, { message: string; retryable: boolean }> = {
    "unsupported_scheme": {
      message: "Payment scheme not supported",
      retryable: false,
    },
    "invalid_network": {
      message: "Network not supported",
      retryable: false,
    },
    "invalid_exact_evm_payload_signature": {
      message: "Payment signature is invalid",
      retryable: true,
    },
    "invalid_exact_evm_payload_recipient_mismatch": {
      message: "Payment recipient doesn't match",
      retryable: false,
    },
    "invalid_exact_evm_payload_authorization_valid_before": {
      message: "Payment authorization has expired",
      retryable: true,
    },
    "invalid_exact_evm_payload_authorization_valid_after": {
      message: "Payment authorization not yet valid",
      retryable: true,
    },
    "insufficient_funds": {
      message: "Insufficient USDC balance",
      retryable: false,
    },
    "invalid_exact_evm_payload_authorization_value": {
      message: "Payment amount is insufficient",
      retryable: true,
    },
    "invalid_payload": {
      message: "Payment payload is malformed",
      retryable: true,
    },
  };

  const error = errors[invalidReason || ""] || {
    message: "Payment verification failed",
    retryable: true,
  };

  return error;
}

// Usage in handler
async function handlePaymentRequest(req: Request) {
  const verifyResponse = await verify(payment, requirements);

  if (!verifyResponse.isValid) {
    const { message, retryable } = getErrorDetails(verifyResponse.invalidReason);
    
    console.error(`Payment failed [${verifyResponse.invalidReason}]: ${message}`);
    console.error(`Retryable: ${retryable}`);
    console.error(`Payer: ${verifyResponse.payer}`);

    return Response.json(
      {
        x402Version: 1,
        error: message,
        invalidReason: verifyResponse.invalidReason,
        retryable,
        payer: verifyResponse.payer,
      },
      { status: 402 }
    );
  }

  return Response.json({ data: "content" });
}
```

---

## PART 6: SETTLEMENT FLOW

### Complete Settlement Implementation

```typescript
import { settle } from "x402/facilitator";
import { PaymentPayload, PaymentRequirements, settleResponseHeader } from "x402/types";
import { createConnectedClient } from "x402/types";

async function settlePaymentAndRespond(
  decodedPayment: PaymentPayload,
  requirements: PaymentRequirements,
  content: any
) {
  try {
    // Create client for settlement
    const client = createConnectedClient(requirements.network);

    // Settle the payment
    const settleResponse = await settle(
      client,
      decodedPayment,
      requirements
    );

    // Check if settlement succeeded
    if (settleResponse.success) {
      // Create response with settlement header
      const response = new Response(JSON.stringify(content), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // X-PAYMENT-RESPONSE is base64-encoded settlement response
          "X-PAYMENT-RESPONSE": settleResponseHeader(settleResponse),
          // Allow client to read the header
          "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
        },
      });

      return response;
    } else {
      console.error("Settlement failed:", settleResponse.errorReason);
      // Optionally return 200 anyway (your policy)
      return new Response(JSON.stringify(content), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Settlement error:", error);
    // Return content anyway - payment was verified
    return new Response(JSON.stringify(content), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Usage
const contentData = await fetchProtectedContent();
return await settlePaymentAndRespond(
  decodedPayment,
  paymentRequirements,
  contentData
);
```

---

## PART 7: TESTING PATTERNS

### Test Data

```typescript
import { PaymentPayload, PaymentRequirements } from "x402/types";

// Valid test payment
const mockValidPayment: PaymentPayload = {
  x402Version: 1,
  scheme: "exact",
  network: "base-sepolia",
  payload: {
    signature:
      "0x2d6a7588d6acca505cbf0d9a4a227e0c52c6c34008c8e8986a1283259764173608a2ce6496642e377d6da8dbbf5836e9bd15092f9ecab05ded3d6293af148b571c",
    authorization: {
      from: "0x857b06519E91e3A54538791bDbb0E22373e36b66",
      to: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
      value: "1000000",
      validAfter: "1740672089",
      validBefore: "1740672389",
      nonce: "0x1234567890123456789012345678901234567890123456789012345678901234",
    },
  },
};

const mockRequirements: PaymentRequirements = {
  scheme: "exact",
  network: "base-sepolia",
  maxAmountRequired: "1000000",
  resource: "https://example.com/resource",
  description: "Test resource",
  mimeType: "application/json",
  payTo: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  maxTimeoutSeconds: 300,
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  extra: {
    name: "USDC",
    version: "2",
  },
};

// Test scenarios
describe("Payment Verification", () => {
  it("should verify valid payment", async () => {
    const response = await verify(mockValidPayment, mockRequirements);
    expect(response.isValid).toBe(true);
    expect(response.payer).toBe(mockValidPayment.payload.authorization.from);
  });

  it("should reject expired payment", async () => {
    const expiredPayment = {
      ...mockValidPayment,
      payload: {
        ...mockValidPayment.payload,
        authorization: {
          ...mockValidPayment.payload.authorization,
          validBefore: Math.floor(Date.now() / 1000) - 100, // Expired
        },
      },
    };

    const response = await verify(expiredPayment, mockRequirements);
    expect(response.isValid).toBe(false);
    expect(response.invalidReason).toBe(
      "invalid_exact_evm_payload_authorization_valid_before"
    );
  });

  it("should reject mismatched recipient", async () => {
    const wrongRecipient: PaymentRequirements = {
      ...mockRequirements,
      payTo: "0x0000000000000000000000000000000000000000", // Different address
    };

    const response = await verify(mockValidPayment, wrongRecipient);
    expect(response.isValid).toBe(false);
    expect(response.invalidReason).toBe(
      "invalid_exact_evm_payload_recipient_mismatch"
    );
  });

  it("should reject insufficient amount", async () => {
    const lowAmount: PaymentRequirements = {
      ...mockRequirements,
      maxAmountRequired: "2000000", // More than in payment
    };

    const response = await verify(mockValidPayment, lowAmount);
    expect(response.isValid).toBe(false);
    expect(response.invalidReason).toBe(
      "invalid_exact_evm_payload_authorization_value"
    );
  });
});
```

---

## PART 8: PRODUCTION CHECKLIST

### Before Going Live

- [ ] **Facilitator URL**: Verified working with your network
- [ ] **USDC Address**: Correct for your chain (Base Sepolia vs Mainnet)
- [ ] **Chain ID**: Matches your network
- [ ] **Payment Requirements**: Properly defined with realistic amounts
- [ ] **Signature Verification**: Testing with real wallet signatures
- [ ] **Error Handling**: All error codes handled gracefully
- [ ] **Timeout Values**: Reasonable for your use case (typically 60-3600 seconds)
- [ ] **Amount Precision**: Using atomic units correctly (USDC = 6 decimals)
- [ ] **Address Checksums**: All addresses properly formatted
- [ ] **Testing**: End-to-end flow tested with test payments
- [ ] **Monitoring**: Logging all verify/settle responses for debugging
- [ ] **Fallback**: Plan for when facilitator is unavailable
- [ ] **Rate Limiting**: Protecting verify/settle endpoints

### Common Pitfalls to Avoid

❌ **DON'T**:
- Use different amount formats (mix atomic/decimal)
- Forget 0x prefix on hex strings
- Use wrong chain USDC address
- Retry same invalid payment without changes
- Store signatures without validation
- Trust verifyResponse without checking `isValid` field

✅ **DO**:
- Use atomic units consistently
- Always prefix addresses and nonces with 0x
- Verify chain context for contract addresses
- Regenerate new authorization on failure
- Validate all Schema.parse() calls
- Check `isValid` explicitly before proceeding
- Log the full verification response for debugging

---

## References & Resources

| Resource | Location |
|----------|----------|
| **Facilitator Example** | `examples/typescript/facilitator/index.ts` |
| **Advanced Server Example** | `examples/typescript/servers/advanced/index.ts` |
| **Type Definitions** | `typescript/packages/x402/src/types/` |
| **EVM Facilitator** | `typescript/packages/x402/src/schemes/exact/evm/facilitator.ts` |
| **Specification** | `specs/x402-specification.md` |
| **API Reference** | `docs/api-reference.md` |
