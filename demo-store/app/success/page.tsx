'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
    const searchParams = useSearchParams();
    const txHash = searchParams.get('tx');

    return (
        <div style={{
            maxWidth: '600px',
            margin: '100px auto',
            padding: '48px',
            textAlign: 'center',
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>✅</div>

            <h1 style={{
                fontSize: '36px',
                fontWeight: '800',
                color: '#0F5132',
                marginBottom: '16px',
            }}>
                Order Confirmed!
            </h1>

            <p style={{
                fontSize: '18px',
                color: '#718096',
                marginBottom: '32px',
            }}>
                Thank you for shopping at ROLA ACCESSORIES!
            </p>

            {txHash && (
                <div style={{
                    background: '#F7FAFC',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '32px',
                }}>
                    <div style={{
                        fontSize: '13px',
                        color: '#718096',
                        marginBottom: '8px',
                    }}>
                        Transaction Hash
                    </div>
                    <div style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: '#2C2C2C',
                        wordBreak: 'break-all',
                    }}>
                        {txHash}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Link
                    href="/"
                    className="btn-primary"
                >
                    Continue Shopping
                </Link>
            </div>

            <div style={{
                marginTop: '48px',
                paddingTop: '24px',
                borderTop: '1px solid #E2E8F0',
            }}>
                <p style={{ fontSize: '14px', color: '#A0AEC0' }}>
                    Powered by <strong style={{ color: '#2B5FA5' }}>BinahPay</strong>
                </p>
            </div>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '48px' }}>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
