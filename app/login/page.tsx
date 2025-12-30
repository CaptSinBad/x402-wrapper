'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { generateSiweMessage } from '@/lib/auth/siwe';
import styles from '../components/auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { open } = useAppKit();
    const { signMessageAsync } = useSignMessage();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignIn = async () => {
        if (!address) {
            setError('Please connect your wallet first');
            return;
        }

        setIsLoading(true);
        setError('');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
            // 1. Get nonce from server
            const nonceRes = await fetch(`/api/auth/challenge?address=${address}`, {
                signal: controller.signal,
            });
            if (!nonceRes.ok) throw new Error('Failed to get challenge');
            const { nonce } = await nonceRes.json();

            // 2. Generate SIWE message
            const domain = window.location.host;
            const origin = window.location.origin;
            const message = generateSiweMessage(address, domain, origin, nonce);

            // 3. Sign message with wallet
            const signature = await signMessageAsync({ message });

            // 4. Send to server for verification
            const signinRes = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, signature, address }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!signinRes.ok) {
                const error = await signinRes.json();
                throw new Error(error.message || 'Sign-in failed');
            }

            const data = await signinRes.json();
            router.push(data.redirectTo);
        } catch (err: any) {
            clearTimeout(timeoutId);
            console.error('[Login] Sign-in error:', err);

            if (err.name === 'AbortError') {
                setError('Request timed out. Please try again.');
            } else if (err.message?.includes('User rejected')) {
                setError('Signature request was rejected.');
            } else {
                setError(err.message || 'Failed to sign in');
            }
            setIsLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('Email/password authentication coming soon. Please use wallet login.');
    };

    return (
        <div className={styles.authPage}>
            <div className={styles.authCard}>
                {/* Logo */}
                <div className={styles.authLogo}>
                    <div className={styles.logoIcon}>
                        <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M32 8L12 20V36C12 46.4 19.2 55.6 32 58C44.8 55.6 52 46.4 52 36V20L32 8Z" fill="white" />
                        </svg>
                    </div>
                    <span className={styles.logoText}>BinahPay</span>
                </div>

                {/* Header */}
                <h1 className={styles.authTitle}>Welcome back</h1>
                <p className={styles.authSubtitle}>
                    Sign in to your BinahPay account
                </p>

                {error && (
                    <div className={styles.errorMessage}>
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '32px' }}>
                        <div className={styles.loading} style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: '16px', color: '#718096' }}>Signing in...</p>
                    </div>
                ) : (
                    <>
                        {!isConnected ? (
                            <>
                                <button
                                    onClick={() => open()}
                                    style={{
                                        width: '100%',
                                        padding: '16px 24px',
                                        background: 'linear-gradient(135deg, #2B5FA5 0%, #1e4a7a 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        marginBottom: '16px',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        boxShadow: '0 4px 12px rgba(43, 95, 165, 0.3)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(43, 95, 165, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(43, 95, 165, 0.3)';
                                    }}
                                >
                                    🔐 Connect Wallet
                                </button>
                                <div style={{ textAlign: 'center', color: '#718096', fontSize: '14px' }}>
                                    Connect your wallet to continue
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{
                                    padding: '12px',
                                    background: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ color: '#0369a1', fontSize: '14px', margin: 0 }}>
                                        ✅ Wallet connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                                    </p>
                                </div>
                                <button
                                    onClick={handleSignIn}
                                    style={{
                                        width: '100%',
                                        padding: '16px 24px',
                                        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        marginBottom: '12px',
                                        transition: 'transform 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    ✍️ Sign In to BinahPay
                                </button>
                                <button
                                    onClick={() => open()}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'transparent',
                                        color: '#64748b',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Disconnect or Switch Wallet
                                </button>
                            </>
                        )}
                    </>
                )}

                {/* Footer Links */}
                <div className={styles.authFooter}>
                    <Link href="/forgot-password">Forgot password?</Link>
                    <div style={{ marginTop: '12px' }}>
                        Don't have an account? <Link href="/signup">Sign up</Link>
                    </div>
                </div>
            </div>

            {/* Back to Home Link */}
            <Link href="/" className={styles.backLink} style={{ position: 'absolute', top: '20px', left: '20px' }}>
                ← Back to Home
            </Link>
        </div>
    );
}
