'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Client-side authentication guard
 * Wraps protected pages and redirects unauthenticated users
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { ready, authenticated, user } = usePrivy();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (!ready) return;

        if (!authenticated) {
            // Not authenticated - redirect to login
            const currentPath = window.location.pathname;
            router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
            return;
        }

        // Check if user is registered in database
        const checkRegistration = async () => {
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

                if (!data.registered) {
                    // User has Privy account but not in our database
                    router.push('/signup');
                    return;
                }

                // All checks passed
                setIsChecking(false);
            } catch (error) {
                console.error('Registration check failed:', error);
                // On error, redirect to login
                router.push('/login');
            }
        };

        checkRegistration();
    }, [ready, authenticated, user, router]);

    // Show loading state while checking
    if (!ready || isChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="space-y-4 text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-gray-400">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Show nothing if not authenticated (redirect in progress)
    if (!authenticated) {
        return null;
    }

    // Render protected content
    return <>{children}</>;
}
