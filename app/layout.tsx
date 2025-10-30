import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', padding: 0, margin: 0 }}>
        <header style={{ background: '#0f172a', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 18 }}>xSynesis</Link>
            <nav style={{ display: 'flex', gap: 8 }}>
              <Link href="/dashboard" style={navLink}>Dashboard</Link>
              <Link href="/pay-demo" style={navLink}>Pay Demo</Link>
              <Link href="/settlements" style={navLink}>Settlements</Link>
            </nav>
          </div>

          <div>
            {/* Privy connect handled in /dashboard pages where PrivyProvider is configured; this is a convenience link */}
            <Link href="/dashboard"><a style={{ ...buttonStyle }}>Connect / Open Dashboard</a></Link>
          </div>
        </header>

        <main style={{ padding: 24, maxWidth: 1100, margin: '24px auto' }}>{children}</main>

        <footer style={{ padding: 24, textAlign: 'center', color: '#666' }}>
          <small>© {new Date().getFullYear()} xSynesis — demo only</small>
        </footer>
      </body>
    </html>
  );
}

const navLink: React.CSSProperties = {
  color: '#cbd5e1',
  textDecoration: 'none',
  padding: '6px 10px',
  borderRadius: 6,
};

const buttonStyle: React.CSSProperties = {
  background: '#06b6d4',
  color: '#04243a',
  padding: '8px 12px',
  borderRadius: 6,
  textDecoration: 'none',
  fontWeight: 600,
};
