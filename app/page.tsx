import Link from 'next/link';
import styles from './components/landing.module.css';

export default function Home() {
	return (
		<div className={styles.landing}>
			{/* Hero Section */}
			<section className={styles.hero}>
				<div className={styles.heroContent}>
					<div className={styles.logo}>
						<div className={styles.logoIcon}>
							<svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M32 8L12 20V36C12 46.4 19.2 55.6 32 58C44.8 55.6 52 46.4 52 36V20L32 8Z" fill="#2B5FA5" />
								<rect x="20" y="26" width="24" height="16" rx="3" fill="white" />
								<circle cx="26" cy="34" r="2" fill="#2B5FA5" />
								<rect x="30" y="32" width="8" height="4" rx="1" fill="#2B5FA5" />
							</svg>
						</div>
					</div>

					<h1 className={styles.heroTitle}>BinahPay</h1>
					<p className={styles.heroSubtitle}>
						Accept payments, monetize APIs, and build commerce applications
						with the power of crypto — all in one platform.
					</p>

					<div className={styles.heroCta}>
						<Link href="/signup" className={styles.ctaPrimary}>
							Get Started Free
						</Link>
						<Link href="/login" className={styles.ctaSecondary}>
							Log In
						</Link>
					</div>
				</div>
			</section>

			{/* Products Section */}
			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Everything you need to get paid</h2>
				<p className={styles.sectionSubtitle}>
					Powerful payment solutions designed for developers and businesses
				</p>

				<div className={styles.products}>
					<div className={styles.productCard}>
						<div className={styles.productIcon}>💳</div>
						<h3 className={styles.productTitle}>Payment Links</h3>
						<p className={styles.productDescription}>
							Create shareable payment links in seconds. No code required.
							Perfect for invoices, products, and services.
						</p>
						<Link href="/dashboard" className={styles.productLink}>
							Create a link →
						</Link>
					</div>

					<div className={styles.productCard}>
						<div className={styles.productIcon}>⚡</div>
						<h3 className={styles.productTitle}>API Monetization</h3>
						<p className={styles.productDescription}>
							Monetize your APIs with built-in payment gating. Charge per request
							with automatic settlement and withdrawal.
						</p>
						<Link href="/dashboard" className={styles.productLink}>
							Register endpoint →
						</Link>
					</div>

					<div className={styles.productCard}>
						<div className={styles.productIcon}>🔐</div>
						<h3 className={styles.productTitle}>Checkout</h3>
						<p className={styles.productDescription}>
							Embeddable checkout for your website or app. Accept crypto
							payments with a beautiful, conversion-optimized flow.
						</p>
						<Link href="/checkout" className={styles.productLink}>
							Try checkout →
						</Link>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className={styles.section} id="features">
				<h2 className={styles.sectionTitle}>Built for developers</h2>
				<p className={styles.sectionSubtitle}>
					Everything you need to build and scale your payment infrastructure
				</p>

				<div className={styles.features}>
					<div className={styles.featureCard}>
						<div className={styles.featureIcon}>🚀</div>
						<h3 className={styles.featureTitle}>Instant Settlement</h3>
						<p className={styles.featureDescription}>
							Get paid instantly with automated settlement and withdrawal to your wallet
						</p>
					</div>

					<div className={styles.featureCard}>
						<div className={styles.featureIcon}>🔒</div>
						<h3 className={styles.featureTitle}>Secure by Default</h3>
						<p className={styles.featureDescription}>
							Enterprise-grade security with wallet authentication and encryption
						</p>
					</div>

					<div className={styles.featureCard}>
						<div className={styles.featureIcon}>📊</div>
						<h3 className={styles.featureTitle}>Real-time Analytics</h3>
						<p className={styles.featureDescription}>
							Track payments, revenue, and customer behavior with powerful dashboards
						</p>
					</div>

					<div className={styles.featureCard}>
						<div className={styles.featureIcon}>🌐</div>
						<h3 className={styles.featureTitle}>Multi-Chain Support</h3>
						<p className={styles.featureDescription}>
							Accept payments on multiple blockchains with automatic conversion
						</p>
					</div>

					<div className={styles.featureCard}>
						<div className={styles.featureIcon}>⚡</div>
						<h3 className={styles.featureTitle}>Developer First</h3>
						<p className={styles.featureDescription}>
							Simple APIs, comprehensive docs, and SDKs for every platform
						</p>
					</div>

					<div className={styles.featureCard}>
						<div className={styles.featureIcon}>💎</div>
						<h3 className={styles.featureTitle}>No Hidden Fees</h3>
						<p className={styles.featureDescription}>
							Transparent pricing with no setup fees, monthly fees, or hidden charges
						</p>
					</div>
				</div>
			</section>

			{/* Integrations Section */}
			<section className={styles.integrations}>
				<h2 className={styles.sectionTitle}>Trusted by the ecosystem</h2>
				<p className={styles.sectionSubtitle}>
					Works with your favorite wallets and chains
				</p>

				<div className={styles.badgeGrid}>
					<div className={styles.badge}>
						<div className={styles.badgeIcon}>CB</div>
						<span className={styles.badgeName}>Coinbase</span>
					</div>
					<div className={styles.badge}>
						<div className={styles.badgeIcon}>◎</div>
						<span className={styles.badgeName}>Solana</span>
					</div>
					<div className={styles.badge}>
						<div className={styles.badgeIcon}>Ξ</div>
						<span className={styles.badgeName}>Ethereum</span>
					</div>
					<div className={styles.badge}>
						<div className={styles.badgeIcon}>🌈</div>
						<span className={styles.badgeName}>Rainbow</span>
					</div>
					<div className={styles.badge}>
						<div className={styles.badgeIcon}>🦊</div>
						<span className={styles.badgeName}>MetaMask</span>
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className={styles.stats}>
				<div className={styles.statsGrid}>
					<div className={styles.stat}>
						<div className={styles.statValue}>99.9%</div>
						<div className={styles.statLabel}>Uptime</div>
					</div>
					<div className={styles.stat}>
						<div className={styles.statValue}>&lt;100ms</div>
						<div className={styles.statLabel}>API Response</div>
					</div>
					<div className={styles.stat}>
						<div className={styles.statValue}>$0</div>
						<div className={styles.statLabel}>Setup Cost</div>
					</div>
					<div className={styles.stat}>
						<div className={styles.statValue}>24/7</div>
						<div className={styles.statLabel}>Support</div>
					</div>
				</div>
			</section>

			{/* CTA Footer */}
			<section className={styles.ctaFooter}>
				<h2 className={styles.ctaFooterTitle}>Ready to get started?</h2>
				<p className={styles.ctaFooterText}>
					Join thousands of developers building the future of payments
				</p>
				<Link href="/dashboard" className={styles.ctaPrimary}>
					Start Building Now
				</Link>
			</section>
		</div>
	);
}
