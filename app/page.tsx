import Link from 'next/link';

export default function Home() {
	return (
		<div style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', maxWidth: 1000 }}>
			<h1 style={{ fontSize: 28, marginBottom: 8 }}>xSynesis Payment</h1>
			<p style={{ color: '#444', marginBottom: 20 }}>Demo dashboard and developer playground for paid endpoints.</p>

					<nav style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
						<Link href="/dashboard" style={linkStyle}>Dashboard</Link>
						<Link href="/pay-demo" style={linkStyle}>Pay Demo</Link>
						<Link href="/settlements" style={linkStyle}>Settlements</Link>
					</nav>

			<section style={{ background: '#f6f8fa', padding: 16, borderRadius: 8 }}>
				<h2 style={{ marginTop: 0 }}>Quick start</h2>
				<ol>
					<li>Open <Link href="/pay-demo"><a>Pay Demo</a></Link> to try the protected resource flow (use Fake-mode for local).</li>
					<li>Go to <Link href="/dashboard"><a>Dashboard</a></Link> to register endpoints (connect wallet via Privy).</li>
					<li>Check <Link href="/settlements"><a>Settlements</a></Link> for worker processed rows.</li>
				</ol>
			</section>
		</div>
	);
}

const linkStyle: React.CSSProperties = {
	display: 'inline-block',
	padding: '8px 14px',
	background: '#0366d6',
	color: '#fff',
	borderRadius: 6,
	textDecoration: 'none'
};
