'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import styles from '../components/dashboard.module.css';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

    return (
        <div className={styles.dashboardContainer}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                {/* Header */}
                <div className={styles.sidebarHeader}>
                    <Link href="/" className={styles.logo}>
                        <div className={styles.logoIcon}>
                            <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
                                <path d="M32 8L12 20V36C12 46.4 19.2 55.6 32 58C44.8 55.6 52 46.4 52 36V20L32 8Z" fill="white" />
                            </svg>
                        </div>
                        <span className={styles.logoText}>BinahPay</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className={styles.sidebarNav}>
                    <div className={styles.navSection}>
                        <Link
                            href="/dashboard"
                            className={`${styles.navItem} ${isActive('/dashboard') && !pathname?.includes('/payments') && !pathname?.includes('/developers') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>📊</span>
                            <span>Overview</span>
                        </Link>

                        <Link
                            href="/dashboard/payments"
                            className={`${styles.navItem} ${isActive('/dashboard/payments') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>💳</span>
                            <span>Payments</span>
                        </Link>

                        <Link
                            href="/dashboard/payment-links"
                            className={`${styles.navItem} ${isActive('/dashboard/payment-links') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>🔗</span>
                            <span>Payment Links</span>
                        </Link>

                        <Link
                            href="/dashboard/balances"
                            className={`${styles.navItem} ${isActive('/dashboard/balances') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>💰</span>
                            <span>Balances</span>
                        </Link>
                    </div>

                    <div className={styles.navSection}>
                        <div className={styles.navSectionTitle}>Store</div>

                        <Link
                            href="/dashboard/store/setup"
                            className={`${styles.navItem} ${isActive('/dashboard/store/setup') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>🏪</span>
                            <span>Store Setup</span>
                        </Link>

                        <Link
                            href="/dashboard/store/categories"
                            className={`${styles.navItem} ${isActive('/dashboard/store/categories') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>📁</span>
                            <span>Categories</span>
                        </Link>

                        <Link
                            href="/dashboard/orders"
                            className={`${styles.navItem} ${isActive('/dashboard/orders') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>📦</span>
                            <span>Orders</span>
                        </Link>
                    </div>

                    <div className={styles.navSection}>
                        <div className={styles.navSectionTitle}>Checkout</div>

                        <Link
                            href="/dashboard/products"
                            className={`${styles.navItem} ${isActive('/dashboard/products') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>📦</span>
                            <span>Products</span>
                        </Link>

                        <Link
                            href="/checkout-demo"
                            className={`${styles.navItem} ${isActive('/checkout-demo') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>🛒</span>
                            <span>Checkout Demo</span>
                        </Link>
                    </div>

                    <div className={styles.navSection}>
                        <div className={styles.navSectionTitle}>Developers</div>

                        <Link
                            href="/dashboard/developers/api-keys"
                            className={`${styles.navItem} ${isActive('/dashboard/developers/api-keys') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>🔑</span>
                            <span>API Keys</span>
                        </Link>

                        <Link
                            href="/dashboard/developers/webhooks"
                            className={`${styles.navItem} ${isActive('/dashboard/developers/webhooks') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>🪝</span>
                            <span>Webhooks</span>
                        </Link>

                        <Link
                            href="/dashboard/developers/logs"
                            className={`${styles.navItem} ${isActive('/dashboard/developers/logs') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>📝</span>
                            <span>Logs</span>
                        </Link>
                    </div>

                    <div className={styles.navSection}>
                        <Link
                            href="/dashboard/settings"
                            className={`${styles.navItem} ${isActive('/dashboard/settings') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>⚙️</span>
                            <span>Settings</span>
                        </Link>
                    </div>
                </nav>

                {/* Footer */}
                <div className={styles.sidebarFooter}>
                    <div className={styles.modeToggle}>
                        <div className={styles.modeIndicator}>
                            <span className={`${styles.modeDot} ${styles.test}`}></span>
                            <span>Test Mode</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#A0AEC0' }}>▼</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                {/* Top Bar */}
                <div className={styles.topBar}>
                    <div className={styles.topBarLeft}>
                        <h1 className={styles.pageTitle}>
                            {pathname === '/dashboard' ? 'Overview' :
                                pathname?.includes('/store/setup') ? 'Store Setup' :
                                    pathname?.includes('/store/categories') ? 'Categories' :
                                        pathname?.includes('/orders') ? 'Orders' :
                                            pathname?.includes('/products') ? 'Products' :
                                                pathname?.includes('/payments') ? 'Payments' :
                                                    pathname?.includes('/api-keys') ? 'API Keys' :
                                                        pathname?.includes('/payment-links') ? 'Payment Links' :
                                                            pathname?.includes('/balances') ? 'Balances' :
                                                                pathname?.includes('/webhooks') ? 'Webhooks' :
                                                                    pathname?.includes('/logs') ? 'Logs' :
                                                                        pathname?.includes('/settings') ? 'Settings' :
                                                                            pathname?.includes('/checkout-demo') ? 'Checkout Demo' :
                                                                                'Dashboard'}
                        </h1>
                    </div>

                    <div className={styles.topBarRight}>
                        <select className={styles.projectSelector}>
                            <option>My Project</option>
                            <option>Create new project</option>
                        </select>

                        <div className={styles.userMenu}>
                            U
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className={styles.contentArea}>
                    {children}
                </div>
            </main>
        </div>
    );
}
