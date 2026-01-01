'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export default function PrivyAuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmh80hanx04lrl50c7llxbrgy'}
            config={{
                loginMethods: ['wallet', 'email'],
                appearance: {
                    theme: 'dark',
                    accentColor: '#2B5FA5',
                    logo: '/logo.svg',
                },
            }}
        >
            {children}
        </PrivyProvider>
    );
}
