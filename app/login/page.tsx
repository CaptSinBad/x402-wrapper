'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
    const { login, logout, authenticated, ready, user } = usePrivy();
    const router = useRouter();
    const [checking, setChecking] = useState(false);

    // Force logout on page load for fresh login
    useEffect(() => {
        if (ready && authenticated && !checking) {
            logout();
        }
    }, [ready, authenticated, checking, logout]);

    // Check if user is registered in database after authentication
    useEffect(() => {
        if (ready && authenticated && user && !checking) {
            setChecking(true);
            checkUserRegistration();
        }
    }, [ready, authenticated, user]);

    const checkUserRegistration = async () => {
        try {
            const response = await fetch('/api/auth/check-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    privyId: user?.id,
                    walletAddress: user?.wallet?.address,
                    email: user?.email?.address,
                }),
            });

            const data = await response.json();

            if (data.registered) {
                // User exists in database, go to dashboard
                router.push('/dashboard');
            } else {
                // New user, go to signup/onboarding
                router.push('/signup');
            }
        } catch (error) {
            console.error('Registration check failed:', error);
            // On error, assume new user
            router.push('/signup');
        }
    };

    if (!ready || checking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="text-white">{checking ? 'Checking registration...' : 'Loading...'}</div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-2xl">
                <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
                            <path d="M32 8L12 20V36C12 46.4 19.2 55.6 32 58C44.8 55.6 52 46.4 52 36V20L32 8Z" fill="white" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white">BinahPay</h1>
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold text-white">Welcome back</h2>
                    <p className="text-sm text-gray-400">Sign in to access your BinahPay account</p>
                </div>

                <button
                    onClick={login}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-blue-500/50"
                >
                    <div className="flex items-center justify-center space-x-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Sign In</span>
                    </div>
                </button>

                <p className="text-xs text-center text-gray-500">Securely powered by Privy</p>
            </div>
        </div>
    );
}
