'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../../components/dashboard.module.css';

export default function DashboardOverview() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        successfulPayments: 0,
        availableBalance: 0,
        pendingSettlements: 0,
    });

    const [recentPayments, setRecentPayments] = useState([]);

    useEffect(() => {
        // Fetch real stats from API
        fetch('/api/dashboard/stats')
            .then(res => res.json())
            .then(data => {
                setStats({
                    totalRevenue: parseFloat(data.totalRevenue) || 0,
                    successfulPayments: data.totalPayments || 0,
                    availableBalance: parseFloat(data.totalRevenue) * 0.8 || 0, // Approximate available balance
                    pendingSettlements: 0,
                });
            })
            .catch(err => console.error('Failed to fetch stats:', err));

        // Fetch recent payments
        fetch('/api/dashboard/recent-payments')
            .then(res => res.json())
            .then(data => {
                setRecentPayments(data.payments || []);
            })
            .catch(err => console.error('Failed to fetch payments:', err));
    }, []);

    return (
        <>
            {/* Welcome Banner */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                    Welcome back! 👋
                </h2>
                <p style={{ color: '#718096', fontSize: '15px' }}>
                    Here's what's happening with your payments today.
                </p>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Revenue</div>
                    <div className={styles.statValue}>${stats.totalRevenue.toLocaleString()}</div>
                    <div className={styles.statChange}>+12.5% from last month</div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Successful Payments</div>
                    <div className={styles.statValue}>{stats.successfulPayments}</div>
                    <div className={styles.statChange}>+8 from last week</div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Available Balance</div>
                    <div className={styles.statValue}>${stats.availableBalance.toLocaleString()}</div>
                    <div className={styles.statChange}>Ready to withdraw</div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Pending Settlements</div>
                    <div className={styles.statValue}>{stats.pendingSettlements}</div>
                    <div className={styles.statChange}>In progress</div>
                </div>
            </div>

            {/* Recent Payments */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Recent Payments</h3>
                    <Link href="/dashboard/payments" className={styles.cardAction}>
                        View all
                    </Link>
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentPayments.map((payment: any) => (
                            <tr key={payment.id}>
                                <td>{payment.customer}</td>
                                <td style={{ fontWeight: '600' }}>{payment.amount}</td>
                                <td>
                                    <span className={`${styles.badge} ${payment.status === 'succeeded' ? styles.success : styles.pending}`}>
                                        {payment.status}
                                    </span>
                                </td>
                                <td style={{ color: '#718096' }}>{payment.date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Quick Actions */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Quick Actions</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <Link
                        href="/dashboard/payment-links"
                        style={{
                            padding: '20px',
                            background: 'linear-gradient(135deg, #F7FAFC, #E3F2FD)',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            border: '1px solid #E2E8F0',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔗</div>
                        <div style={{ fontWeight: '600', color: '#2D3748', marginBottom: '4px' }}>Create Payment Link</div>
                        <div style={{ fontSize: '13px', color: '#718096' }}>Share a link to collect payments</div>
                    </Link>

                    <Link
                        href="/dashboard/developers/api-keys"
                        style={{
                            padding: '20px',
                            background: 'linear-gradient(135deg, #F7FAFC, #E3F2FD)',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            border: '1px solid #E2E8F0',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔑</div>
                        <div style={{ fontWeight: '600', color: '#2D3748', marginBottom: '4px' }}>View API Keys</div>
                        <div style={{ fontSize: '13px', color: '#718096' }}>Integrate BinahPay into your app</div>
                    </Link>

                    <Link
                        href="/pay-demo"
                        style={{
                            padding: '20px',
                            background: 'linear-gradient(135deg, #F7FAFC, #E3F2FD)',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            border: '1px solid #E2E8F0',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🧪</div>
                        <div style={{ fontWeight: '600', color: '#2D3748', marginBottom: '4px' }}>Test Payment Flow</div>
                        <div style={{ fontSize: '13px', color: '#718096' }}>Try a test payment</div>
                    </Link>
                </div>
            </div>
        </>
    );
}
