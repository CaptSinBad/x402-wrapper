'use client';

import { useState, useEffect } from 'react';

interface Payment {
    id: string;
    amount: string;
    currency: string;
    purchaser: string;
    status: string;
    txHash?: string;
    network: string;
    createdAt: string;
}

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function PaymentsPage() {
    const { authFetch } = useAuthToken();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const response = await authFetch('/api/dashboard/payments');
            const data = await response.json();
            setPayments(data.payments || []);
        } catch (error) {
            console.error('Failed to fetch payments:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: '#718096' }}>Loading payments...</p>
            </div>
        );
    }

    if (payments.length === 0) {
        return (
            <div style={{ padding: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Payments</h1>
                <p style={{ color: '#718096', marginBottom: '32px' }}>
                    View and manage all your payment transactions
                </p>

                <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                        No payments yet
                    </h2>
                    <p style={{ color: '#718096', marginBottom: '24px' }}>
                        Payments made through your payment links will appear here
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Payments</h1>
            <p style={{ color: '#718096', marginBottom: '32px' }}>
                {payments.length} {payments.length === 1 ? 'payment' : 'payments'} received
            </p>

            <div style={{
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#F7FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>
                                Date
                            </th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>
                                Amount
                            </th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>
                                Purchaser
                            </th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>
                                Status
                            </th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>
                                Transaction
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map((payment) => (
                            <tr key={payment.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '16px', fontSize: '14px', color: '#2D3748' }}>
                                    {new Date(payment.createdAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </td>
                                <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#2D3748' }}>
                                    ${payment.amount} {payment.currency}
                                </td>
                                <td style={{ padding: '16px', fontSize: '14px', color: '#718096', fontFamily: 'monospace' }}>
                                    {payment.purchaser.slice(0, 6)}...{payment.purchaser.slice(-4)}
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        background: '#C6F6D5',
                                        color: '#22543D',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}>
                                        {payment.status}
                                    </span>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    {payment.txHash ? (
                                        <a
                                            href={`https://sepolia.basescan.org/tx/${payment.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: '#2B5FA5',
                                                textDecoration: 'none',
                                                fontSize: '14px',
                                                fontWeight: '500'
                                            }}
                                        >
                                            View ↗
                                        </a>
                                    ) : (
                                        <span style={{ color: '#A0AEC0', fontSize: '14px' }}>-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
