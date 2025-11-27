'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F7FAFC',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '500px',
                textAlign: 'center',
                background: 'white',
                padding: '48px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <div style={{ fontSize: '72px', marginBottom: '16px' }}>404</div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#2D3748' }}>
                    Page Not Found
                </h1>
                <p style={{ fontSize: '16px', color: '#718096', marginBottom: '32px' }}>
                    The page you're looking for doesn't exist or has been moved.
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            padding: '12px 24px',
                            background: 'white',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            color: '#2D3748'
                        }}
                    >
                        ← Go Back
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            padding: '12px 24px',
                            background: '#2B5FA5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
