"use client";

import { PrivyProvider } from '@privy-io/react-auth';
import React, { useEffect } from 'react';
import { suppressPrivyHydrationErrors } from '../lib/suppressPrivityHydrationErrors';

export default function PrivyClientProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress known Privy hydration errors on mount
    suppressPrivyHydrationErrors();
  }, []);

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['wallet'],
        appearance: { 
          theme: 'light',
          accentColor: '#8B6914', // Bookstore theme color
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        // Enable wallet signing operations
        walletConnectClusterApiUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.testnet.solana.com',
      }}
    >
      <ErrorBoundary>
        <React.Fragment key="privy-children">
          {children}
        </React.Fragment>
      </ErrorBoundary>
    </PrivyProvider>
  );
}

/**
 * Error boundary to catch and log Privy errors gracefully
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    if (error.message.includes('privy') || error.message.includes('Hydration')) {
      console.warn('[PrivyClientProvider] Caught Privy error:', error.message);
    } else {
      console.error('[PrivyClientProvider] Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Don't crash the entire app on Privy errors
      return <>{this.props.children}</>;
    }

    return this.props.children;
  }
}
