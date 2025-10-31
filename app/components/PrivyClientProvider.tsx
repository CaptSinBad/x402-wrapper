"use client";

import { PrivyProvider } from '@privy-io/react-auth';
import React from 'react';

export default function PrivyClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{ loginMethods: ['wallet'], appearance: { theme: 'light' } }}
    >
      {children}
    </PrivyProvider>
  );
}
