// Expose the buyer SDK functions from the workspace implementation so the SDK package
// is a thin wrapper around the existing implementation. This avoids duplication while
// providing a clean package entrypoint for consumers in the monorepo.

export { payAndFetch, createSignedPaymentHeader } from './payAndFetch';
export type { PaymentRequirements } from './payAndFetch';
