'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

export default function DashboardHeader() {
    const { user, logout, authenticated } = usePrivy();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    if (!authenticated) return null;

    return (
        <div className="border-b border-gray-700 bg-gray-800/50 p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                            {user?.wallet?.address?.slice(0, 2).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div>
                        <p className="text-white font-medium">
                            {user?.wallet?.address?.slice(0, 6)}...{user?.wallet?.address?.slice(-4)}
                        </p>
                        <p className="text-sm text-gray-400">Connected</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
