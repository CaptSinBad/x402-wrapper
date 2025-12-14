'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import styles from '../components/auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { open } = useAppKit();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleWalletAuth = async () => {
        if (!address) {
            setError('Please connect your wallet first');
            return;
        }

        console.log('[Login] Starting wallet auth for:', address);
        setIsLoading(true);
        setError('');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for cold starts

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

    const handleDisconnect = async () => {
        // Provide a way to completely reset state
        // access appkit verify disconnect
        try {
            // We can't directly disconnect appkit from here easily without useDisconnect from wagmi
            // But we can reload to clear local state if needed, or just tell user to disconnect via modal
        } catch (e) { console.error(e) }
    };

    // We need useDisconnect to allow manual reset
    const { disconnect } = useDisconnect();

    // Auto-attempt only ONCE when connecting initially
    // If it fails, we revert to manual "Sign In" button instead of infinite loop
    const [hasAttemptedAutoLogin, setHasAttemptedAutoLogin] = useState(false);

    useEffect(() => {
        if (isConnected && address && !isLoading && !hasAttemptedAutoLogin) {
            setHasAttemptedAutoLogin(true);
            handleWalletAuth();
        }
    }, [isConnected, address]);

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
                    {isConnected
                        ? 'Wallet connected. Please sign in.'
                        : 'Sign in to your BinahPay account'}
                </p>

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        <p className="font-medium mb-1">Authentication Failed</p>
                        {error}
                        <div className="mt-2 text-xs opacity-70">
                            If this persists, check your internet or try disconnecting and reconnecting.
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className={styles.loading} style={{ margin: '0 auto' }}></div>
                            <p className="mt-4 text-zinc-400 animate-pulse">Verifying ownership...</p>
                        </div>
                    ) : isConnected && address ? (
                        /* Connected but not Authenticated State */
                        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                            <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-950 rounded-lg border border-zinc-800/50">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Connected Wallet</div>
                                    <div className="text-sm text-zinc-200 font-mono truncate">
                                        {address.slice(0, 6)}...{address.slice(-4)}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleWalletAuth()}
                                className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all shadow-[0_0_20px_-5px_rgba(0,82,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(0,82,255,0.5)] flex items-center justify-center gap-2"
                            >
                                <span>Complete Sign In</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                            </button>

                            <button
                                onClick={() => {
                                    disconnect();
                                    setError('');
                                    setHasAttemptedAutoLogin(false);
                                }}
                                className="w-full mt-3 py-2 text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center justify-center gap-1"
                            >
                                <span>Wrong wallet? Disconnect</span>
                            </button>
                        </div>
                    ) : (
                        /* Disconnected State */
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
                            <div className="text-center text-zinc-500 text-sm">
                                Connect your wallet to access the dashboard.
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Links */}
                <div className={styles.authFooter}>
                    <div className="mt-8 pt-6 border-t border-zinc-800 w-full text-center">
                        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                            ← Back to BinahPay
                        </Link>
                    </div>

                    {/* Troubleshooting */}
                    <div className="mt-6 pt-6 border-t border-zinc-900 w-full text-center">
                        <p className="text-xs text-zinc-600 mb-2">Having trouble?</p>
                        <button
                            onClick={async () => {
                                try {
                                    // 1. Call server logout to clear cookie
                                    await fetch('/api/auth/logout', { method: 'POST' });
                                    // 2. Clear local storage
                                    localStorage.clear();
                                    sessionStorage.clear();
                                    // 3. Disconnect wallet
                                    if (disconnect) disconnect();
                                    // 4. Reload page
                                    window.location.reload();
                                } catch (e) {
                                    console.error(e);
                                    window.location.reload();
                                }
                            }}
                            className="text-xs text-red-900/50 hover:text-red-500 transition-colors underline"
                        >
                            Force Reset Session & Cache
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
