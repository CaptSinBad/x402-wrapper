import { z } from 'zod';

export const SellerEndpointBody = z.object({
  endpointUrl: z.string().url(),
  price: z.union([z.string(), z.number()]).transform((v) => (typeof v === 'string' ? parseFloat(v) : v)).refine((n) => !isNaN(n) && n > 0, { message: 'price must be a positive number' }),
  currency: z.string().optional().default('USDC'),
  scheme: z.string().optional().default('exact'),
  network: z.string().optional().default('base'),
  facilitatorUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

export type SellerEndpointBodyType = z.infer<typeof SellerEndpointBody>;

export const PaymentRequirementsSchema = z.object({
  x402Version: z.number().optional().default(1),
  scheme: z.string(),
  network: z.string(),
  maxAmountRequired: z.string().optional(),
  resource: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().nullable().optional(),
  payTo: z.string().optional(),
  maxTimeoutSeconds: z.number().optional(),
  asset: z.string().optional(),
  extra: z.record(z.any()).optional().nullable(),
}).passthrough();

export const PaymentPayloadSchema = z.object({
  x402Version: z.number(),
  scheme: z.string(),
  network: z.string(),
  payload: z.object({
    signature: z.string(),
    authorization: z.object({
      from: z.string(),
      to: z.string(),
      value: z.string(),
      validAfter: z.string(),
      validBefore: z.string(),
      nonce: z.string(),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

export const FacilitatorVerifyRequest = z.object({
  paymentPayload: PaymentPayloadSchema,
  paymentRequirements: PaymentRequirementsSchema,
}).passthrough();

export const FacilitatorSettleRequest = FacilitatorVerifyRequest;

export type FacilitatorVerifyRequestType = z.infer<typeof FacilitatorVerifyRequest>;
