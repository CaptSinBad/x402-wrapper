'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import styles from '../components/auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { open } = useAppKit();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-login when wallet connects
    useEffect(() => {
        if (isConnected && address && !isLoading) {
            handleWalletAuth();
        }
    }, [isConnected, address]);

    const handleWalletAuth = async () => {
        if (!address) {
            setError('Please connect your wallet first');
            return;
        }

        console.log('[Login] Starting wallet auth for:', address);
        setIsLoading(true);
        setError('');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
            console.log('[Login] Calling wallet-login API...');
            const response = await fetch('/api/auth/wallet-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: address }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            console.log('[Login] Response status:', response.status);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Authentication failed');
            }

            // Redirect based on onboarding status
            console.log('[Login] Redirecting to:', data.redirectTo);
            router.push(data.redirectTo);

            // Should verify redirect happened? If we're still here after a few seconds, something is wrong.
            // But usually the page unloads. We keep isLoading(true).
        } catch (err: any) {
            console.error('[Login] Wallet auth error:', err);
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                setError('Login timed out. Please check your network or try again.');
            } else {
                setError(err.message || 'Failed to authenticate');
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
                        <p style={{ marginTop: '16px', color: '#718096' }}>Authenticating...</p>
                    </div>
                ) : (
                    <>
                        {/* Manual Connect Button */}
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
                                marginBottom: '24px',
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
                            Connect your wallet or sign in with social accounts to continue.
                        </div>
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
