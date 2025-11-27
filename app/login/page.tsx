'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import styles from '../components/auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
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

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/wallet-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: address }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Authentication failed');
            }

            // Redirect based on onboarding status
            router.push(data.redirectTo);
        } catch (err: any) {
            console.error('Wallet auth error:', err);
            setError(err.message || 'Failed to authenticate');
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
                        {/* AppKit Button (Handles Wallet + Socials) */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                            <appkit-button />
                        </div>

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
