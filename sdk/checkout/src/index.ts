/**
 * @binahpay/checkout
 * 
 * Drop-in checkout component for accepting crypto payments with BinahPay.
 * 
 * ## Quick Start
 * 
 * ```tsx
 * import { BinahPayCheckout } from '@binahpay/checkout';
 * 
 * function MyPage() {
 *   return (
 *     <BinahPayCheckout 
 *       session="cs_abc123..."
 *       onSuccess={(session, txHash) => {
 *         console.log('Payment successful!', txHash);
 *       }}
 *     />
 *   );
 * }
 * ```
 * 
 * @packageDocumentation
 */

export { BinahPayCheckout } from './BinahPayCheckout';
export { BinahPayCheckoutWithProviders } from './ProviderWrapper';
export type { BinahPayCheckoutProps } from './BinahPayCheckout';

// Default export for convenience
export { BinahPayCheckoutWithProviders as default } from './ProviderWrapper';
