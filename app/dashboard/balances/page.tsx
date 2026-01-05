'use client';

import { useState, useEffect } from 'react';

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function BalancesPage() {
    const { authFetch } = useAuthToken();
    const [balance, setBalance] = useState({ total: 0, available: 0, pending: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        try {
            const response = await authFetch('/api/dashboard/payments');
            const data = await response.json();
            const payments = data.payments || [];

            // Calculate total from all completed payments
            const total = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

            setBalance({
                total: total,
                available: total, // In a real app, this would be after settlement
                pending: 0
            });
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Balances</h1>
            <p style={{ color: '#718096', marginBottom: '32px' }}>
                View your account balances and pending settlements
            </p>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                    <p style={{ color: '#718096' }}>Loading...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                    {/* Total Balance */}
                    <div style={{
                        background: 'linear-gradient(135deg, #2B5FA5 0%, #1e4a85 100%)',
                        borderRadius: '16px',
                        padding: '32px',
                        color: 'white'
                    }}>
                        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>
                            Total Balance
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>
                            {formatCurrency(balance.total)}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>
                            All time revenue
                        </div>
                    </div>

                    {/* Available Balance */}
                    <div style={{
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '32px'
                    }}>
                        <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px', fontWeight: '500' }}>
                            Available Balance
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: '700', color: '#2D3748', marginBottom: '8px' }}>
                            {formatCurrency(balance.available)}
                        </div>
                        <div style={{ fontSize: '13px', color: '#A0AEC0' }}>
                            Ready for payout
                        </div>
                    </div>

                    {/* Pending Balance */}
                    <div style={{
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '32px'
                    }}>
                        <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px', fontWeight: '500' }}>
                            Pending
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: '700', color: '#2D3748', marginBottom: '8px' }}>
                            {formatCurrency(balance.pending)}
                        </div>
                        <div style={{ fontSize: '13px', color: '#A0AEC0' }}>
                            In settlement
                        </div>
                    </div>
                </div>
            )}

            {balance.total === 0 && !loading && (
                <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    marginTop: '24px'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                        No balance yet
                    </h2>
                    <p style={{ color: '#718096', marginBottom: '24px' }}>
                        Your balance will appear here once you receive payments
                    </p>
                </div>
            )}
        </div>
    );
}
