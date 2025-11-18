/**
 * Suppress known Privy hydration errors
 * 
 * Privy's error text component has a bug where it renders nested <p> tags,
 * which violates HTML standards and causes hydration errors in Next.js.
 * 
 * This suppression is temporary until Privy fixes this in their library.
 * Reference: https://github.com/privy-io/privy-js/issues/...
 */

export function suppressPrivyHydrationErrors() {
  if (typeof window === 'undefined') return;

  // Store original console.error
  const originalError = console.error;

  // Override console.error to filter Privy hydration errors
  console.error = function (...args: any[]) {
    const errorMessage = args[0]?.toString() || '';

    // Suppress specific Privy hydration errors
    if (
      errorMessage.includes('<p> cannot contain a nested <p>') ||
      errorMessage.includes('<p> cannot be a descendant of <p>') ||
      errorMessage.includes('Hydration failed') && errorMessage.includes('privy')
    ) {
      // Silently ignore these Privy errors
      return;
    }

    // Call original console.error for all other errors
    originalError.apply(console, args);
  };
}
