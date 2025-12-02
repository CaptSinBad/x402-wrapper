import React from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { BinahPayCheckout, BinahPayCheckoutProps } from './BinahPayCheckout';

const queryClient = new QueryClient();

// WalletConnect Project ID (you'll need to get this from https://cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

const metadata = {
    name: 'BinahPay Checkout',
    description: 'BinahPay Crypto Payments',
    url: 'https://binahpay.com',
    icons: ['https://x402-wrapper-nld7.vercel.app/logo.png']
};

// Create Wagmi config
const wagmiAdapter = new WagmiAdapter({
    networks: [base, baseSepolia],
    projectId,
    ssr: false,
});

const wagmiConfig = createConfig({
    chains: [base, baseSepolia],
    transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
    },
    ...wagmiAdapter
});

// Create AppKit instance
createAppKit({
    adapters: [wagmiAdapter],
    networks: [base, baseSepolia],
    metadata,
    projectId,
    features: {
        analytics: false,
    },
});

/**
 * Smart Provider Wrapper
 * 
 * Automatically wraps the checkout component with necessary providers
 * if they're not already present in the tree.
 */
export function BinahPayCheckoutWithProviders(props: BinahPayCheckoutProps) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <BinahPayCheckout {...props} />
            </QueryClientProvider>
        </WagmiProvider>
    );
}
