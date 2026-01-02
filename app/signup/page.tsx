'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignupPage() {
    const { user, authenticated } = usePrivy();
    const router = useRouter();
    const [creating, setCreating] = useState(false);

    if (!authenticated) {
        router.push('/login');
        return null;
    }

    const handleCreateAccount = async () => {
        setCreating(true);

        try {
            // Create user in database
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    privyId: user?.id,
                    walletAddress: user?.wallet?.address,
                    email: user?.email?.address,
                    authMethod: user?.wallet ? 'wallet' : 'email',
                }),
            });

            if (response.ok) {
                // Redirect to onboarding
                router.push('/onboarding/step-1');
            } else {
                alert('Failed to create account. Please try again.');
                setCreating(false);
            }
        } catch (error) {
            console.error('Account creation failed:', error);
            alert('Failed to create account. Please try again.');
            setCreating(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-2xl">
                <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="19" y1="8" x2="19" y2="14" />
                            <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Create Account</h1>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-700/30 p-4 rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Connected with:</p>
                        <p className="text-white font-mono text-sm">
                            {user?.wallet?.address || user?.email?.address}
                        </p>
                    </div>

                    <p className="text-gray-300 text-center">
                        Welcome! Let's create your BinahPay account and get you started.
                    </p>
                </div>

                <button
                    onClick={handleCreateAccount}
                    disabled={creating}
                    className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                    {creating ? 'Creating Account...' : 'Create Account & Continue'}
                </button>
            </div>
        </div>
    );
}
