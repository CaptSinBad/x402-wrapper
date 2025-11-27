'use client';

import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, base, baseSepolia } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

// WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '71d980de830d6e02a6dbe584c687fa93';

// Metadata
const metadata = {
    name: 'BinahPay',
    description: 'Decentralized Payment Infrastructure',
    url: 'https://binahpay.com',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
    networks: [base, baseSepolia, mainnet, polygon],
    projectId,
    ssr: true
});

// Create AppKit
createAppKit({
    adapters: [wagmiAdapter],
    networks: [base, baseSepolia, mainnet, polygon],
    projectId,
    metadata,
    features: {
        analytics: true,
        email: true, // Enable email login
        socials: ['google', 'x', 'discord', 'github'], // Enable social logins
        onramp: true, // Enable fiat on-ramp (Buy Crypto with Card)
    },
    themeMode: 'light',
    themeVariables: {
        '--w3m-accent': '#2B5FA5',
        '--w3m-border-radius-master': '8px'
    }
});

// React Query client
const queryClient = new QueryClient();

export default function WalletProvider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
