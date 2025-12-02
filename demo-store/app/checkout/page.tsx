'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BinahPayCheckout from '@binahpay/checkout';

function CheckoutContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session');

    if (!sessionId) {
        return (
            <div style={{ textAlign: 'center', padding: '48px' }}>
                <h2>Invalid session</h2>
                <p>Please return to the store and try again.</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '600px', margin: '80px auto', padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>
                    🎄 Complete Your Order
                </h1>
                <p style={{ color: '#718096' }}>Secure payment with BinahPay</p>
            </div>

            {/* THIS IS THE "1 LINE OF CODE" INTEGRATION! */}
            <BinahPayCheckout
                session={sessionId}
                onSuccess={(session, txHash) => {
                    window.location.href = `/success?tx=${txHash}`;
                }}
                onError={(error) => {
                    alert('Payment failed: ' + error);
                }}
            />
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '48px' }}>Loading checkout...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}
