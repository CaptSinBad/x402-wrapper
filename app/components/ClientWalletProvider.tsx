'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const WalletProvider = dynamic(() => import('./WalletProvider'), {
    ssr: false,
});

export default function ClientWalletProvider({ children }: { children: React.ReactNode }) {
    return <WalletProvider>{children}</WalletProvider>;
}
