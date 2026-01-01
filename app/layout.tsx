import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import ClientWalletProvider from './components/ClientWalletProvider';
import PrivyAuthProvider from './components/PrivyAuthProvider';
import './globals.css';
import './lib/errorSuppression'; // Keep error suppression

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BinahPay',
  description: 'Crypto payments platform powered by Coinbase x402',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-zinc-100 min-h-screen font-sans antialiased selection:bg-primary/20 selection:text-primary">
        <PrivyAuthProvider>
          <ClientWalletProvider>
            <div className="min-h-screen flex flex-col">
              {/* Temporary minimal header to allow navigation during dev */}
              <header className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                  <a href="/" className="text-lg font-medium tracking-tight text-white">BinahPay</a>
                  <nav className="flex gap-6 text-sm font-medium text-zinc-400">
                    <a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a>
                    <a href="/login" className="hover:text-white transition-colors">Login</a>
                  </nav>
                </div>
              </header>

              <main className="flex-1">
                {children}
              </main>

              <footer className="border-t border-border py-8 text-center text-xs text-muted font-mono">
                © {new Date().getFullYear()} BinahPay — Decentralized Infrastructure
              </footer>
            </div>
          </ClientWalletProvider>
        </PrivyAuthProvider>
      </body>
    </html>
  );
}
