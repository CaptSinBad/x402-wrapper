import { PrivyProvider } from '@privy-io/react-auth';
import type { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['wallet'],
        appearance: { theme: 'light' },
      }}
    >
      <Component {...pageProps} />
    </PrivyProvider>
  );
}
