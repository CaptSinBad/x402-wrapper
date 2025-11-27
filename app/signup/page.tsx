'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppKit } from '@reown/appkit/react';
import styles from '../components/auth.module.css';

export default function SignupPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const [isLoading, setIsLoading] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const { open } = useAppKit();

    // Auto-login when wallet connects
    useEffect(() => {
        if (isConnected && address && !isLoading) {
            handleWalletAuth();
        }
    }, [isConnected, address]);

    const handleWalletAuth = async () => {
        console.log('Wallet connected, checking auth...');

        setIsLoading(true);
        try {
            console.log('Calling /api/auth/wallet-login with address:', address);
            const response = await fetch('/api/auth/wallet-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: address }),
            });

            const data = await response.json();
            console.log('Auth response:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Authentication failed');
            }

            // Redirect based on onboarding status
            console.log('Redirecting to:', data.redirectTo);
            router.push(data.redirectTo);
        } catch (err: any) {
            console.error('Wallet auth error:', err);
            setIsLoading(false);
        }
    };

    const handleEmailSignup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!agreedToTerms) {
            alert('Please agree to the Terms of Service and Privacy Policy');
            return;
        }
        // ... existing email logic ...
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
                <h1 className={styles.authTitle}>Create your account</h1>
                <p className={styles.authSubtitle}>
                    Start accepting payments and monetizing APIs in minutes
                </p>

                {/* Terms Checkbox (Moved up for visibility before action) */}
                <div className={styles.checkboxGroup} style={{ marginBottom: '24px', justifyContent: 'center' }}>
                    <input
                        id="terms"
                        type="checkbox"
                        className={styles.checkbox}
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                    />
                    <label htmlFor="terms" className={styles.checkboxLabel}>
                        I agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>
                    </label>
                </div>


                {/* Custom Side-by-Side Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <button
                        className={styles.walletConnectButton}
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => open()}
                        disabled={isLoading}
                    >
                        <span className={styles.buttonIcon}>👛</span>
                        <span className={styles.buttonText}>Wallet</span>
                    </button>

                    <button
                        className={styles.walletConnectButton}
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            background: 'white',
                            color: '#2D3748',
                            border: '1px solid #E2E8F0'
                        }}
                        onClick={() => open()}
                        disabled={isLoading}
                    >
                        <span className={styles.buttonIcon}>G</span>
                        <span className={styles.buttonText}>Google</span>
                    </button>
                </div>



                {/* Footer Links */}
                <div className={styles.authFooter}>
                    Already have an account? <Link href="/login">Log in</Link>
                </div>
            </div>

            {/* Back to Home Link */}
            <Link href="/" className={styles.backLink} style={{ position: 'absolute', top: '20px', left: '20px' }}>
                ← Back to Home
            </Link>
        </div>
    );
}
