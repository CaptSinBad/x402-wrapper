'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Wallet, Clock, Activity } from 'lucide-react';

import { useAuthToken } from '@/app/hooks/useAuthToken';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export default function BalancesPage() {
    const { authFetch } = useAuthToken();
    const [balance, setBalance] = useState({ total: 0, available: 0, pending: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        try {
            const response = await authFetch('/api/dashboard/payments');
            const data = await response.json();
            const payments = data.payments || [];

            // Calculate total from all completed payments
            const total = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

            setBalance({
                total: total,
                available: total, // In a real app, this would be adjust for payouts
                pending: 0
            });
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl bg-zinc-800" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-zinc-100">Balances</h1>
                <p className="text-zinc-400">
                    View your account balances and pending settlements
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Balance */}
                <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-none shadow-xl text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Total Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold mb-2">
                            {formatCurrency(balance.total)}
                        </div>
                        <p className="text-sm opacity-80">
                            All time earnings
                        </p>
                    </CardContent>
                </Card>

                {/* Available Balance */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <Wallet className="h-4 w-4" /> Available Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-zinc-100 mb-2">
                            {formatCurrency(balance.available)}
                        </div>
                        <p className="text-sm text-zinc-500">
                            Ready for payout
                        </p>
                    </CardContent>
                </Card>

                {/* Pending Balance */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Pending
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-zinc-100 mb-2">
                            {formatCurrency(balance.pending)}
                        </div>
                        <p className="text-sm text-zinc-500">
                            In settlement
                        </p>
                    </CardContent>
                </Card>
            </div>

            {balance.total === 0 && (
                <Card className="border-dashed border-zinc-800 bg-zinc-900/20 text-center py-12">
                    <CardContent className="space-y-4">
                        <div className="text-4xl">💰</div>
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-100 mb-1">
                                No balance yet
                            </h2>
                            <p className="text-zinc-400">
                                Your balance will appear here once you receive payments
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
