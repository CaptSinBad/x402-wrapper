import Link from 'next/link';
import ClientWalletProvider from './components/ClientWalletProvider';
import './globals.css';
import './lib/errorSuppression';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <header className="site-header">
          <div className="site-brand">
            <Link href="/" className="brand-link">BinahPay</Link>
            <nav className="site-nav">
              <Link href="/dashboard" className="nav-link">Dashboard</Link>
            </nav>
          </div>
        </header>

        {/* Wallet provider for wallet authentication */}
        <ClientWalletProvider>
          <main className="main-container">{children}</main>

          <footer className="site-footer">
            <small>© {new Date().getFullYear()} BinahPay — Decentralized Payment Infrastructure</small>
          </footer>
        </ClientWalletProvider>
      </body>
    </html>
  );
}
