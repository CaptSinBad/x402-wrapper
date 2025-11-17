import Link from 'next/link';
import PrivyClientProvider from './components/PrivyClientProvider';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <header className="site-header">
          <div className="site-brand">
            <Link href="/" className="brand-link">xSynesis</Link>
            <nav className="site-nav">
              <Link href="/dashboard" className="nav-link">Dashboard</Link>
              <Link href="/pay-demo" className="nav-link">Pay Demo</Link>
              <Link href="/settlements" className="nav-link">Settlements</Link>
            </nav>
          </div>

          <div>
            <Link href="/dashboard" className="cta">Connect / Open Dashboard</Link>
          </div>
        </header>

        {/* Provide Privy client-side context to the app pages that need wallet connect */}
        <PrivyClientProvider>
          <main className="main-container">{children}</main>

          <footer className="site-footer">
            <small>© {new Date().getFullYear()} xSynesis — demo only</small>
          </footer>
        </PrivyClientProvider>
      </body>
    </html>
  );
}

