/**
 * Suppress known hydration errors that are safe to ignore
 * This is used to suppress errors from third-party libraries like Privy
 */

if (typeof window !== 'undefined') {
  // Store the original error function
  const originalError = console.error;
  
  // Override console.error to filter out known safe errors
  console.error = function(...args: any[]) {
    const message = args[0]?.toString?.() || '';
    
    // Suppress Privy nested <p> tag errors (known Privy bug)
    if (message.includes('<p> cannot be a descendant of <p>')) {
      return;
    }
    
    // Suppress Privy nested <p> tag errors (alternative message)
    if (message.includes('<p> cannot contain a nested <p>')) {
      return;
    }
    
    // Call original error for all other errors
    originalError.apply(console, args);
  };
}
