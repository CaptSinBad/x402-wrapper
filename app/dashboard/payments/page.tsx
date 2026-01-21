'use client';

import { useState, useEffect } from 'react';
import { useAuthToken } from '@/app/hooks/useAuthToken';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/app/components/ui/table';
import { CreditCard, ExternalLink } from 'lucide-react';

interface Payment {
    id: string;
    amount: string;
    currency: string;
    purchaser: string;
    status: string;
    txHash?: string;
    network: string;
    createdAt: string;
}

export default function PaymentsPage() {
    const { authFetch } = useAuthToken();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const response = await authFetch('/api/dashboard/payments');
            const data = await response.json();
            setPayments(data.payments || []);
        } catch (error) {
            console.error('Failed to fetch payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const getExplorerUrl = (txHash: string, network: string) => {
        if (network === 'base' || network === 'base-mainnet') {
            return `https://basescan.org/tx/${txHash}`;
        }
        return `https://sepolia.basescan.org/tx/${txHash}`;
    };

    if (loading) {
        return (
            <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (payments.length === 0) {
        return (
            <div className="p-6 lg:p-10 max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Payments</h1>
                    <p className="text-zinc-400">
                        View and manage all your payment transactions
                    </p>
                </div>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="py-16">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CreditCard className="w-10 h-10 text-zinc-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                No payments yet
                            </h2>
                            <p className="text-zinc-400 max-w-md mx-auto">
                                Payments made through your payment links will appear here.
                                Create a payment link to start accepting payments.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Payments</h1>
                <p className="text-zinc-400">
                    {payments.length} {payments.length === 1 ? 'payment' : 'payments'} received
                </p>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <Table>
                    <TableHeader className="bg-zinc-800/50">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="text-zinc-400 font-semibold">Date</TableHead>
                            <TableHead className="text-zinc-400 font-semibold">Amount</TableHead>
                            <TableHead className="text-zinc-400 font-semibold">Purchaser</TableHead>
                            <TableHead className="text-zinc-400 font-semibold">Status</TableHead>
                            <TableHead className="text-zinc-400 font-semibold">Network</TableHead>
                            <TableHead className="text-zinc-400 font-semibold text-right">Transaction</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.map((payment) => (
                            <TableRow key={payment.id} className="border-zinc-800 hover:bg-zinc-800/30">
                                <TableCell className="text-zinc-300">
                                    {new Date(payment.createdAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </TableCell>
                                <TableCell className="text-white font-semibold tabular-nums">
                                    ${payment.amount} <span className="text-zinc-500">{payment.currency}</span>
                                </TableCell>
                                <TableCell className="text-zinc-400 font-mono text-sm">
                                    {payment.purchaser.slice(0, 6)}...{payment.purchaser.slice(-4)}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        className={
                                            payment.status === 'completed' || payment.status === 'settled'
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : payment.status === 'pending'
                                                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }
                                    >
                                        {payment.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                                        {payment.network}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {payment.txHash ? (
                                        <a
                                            href={getExplorerUrl(payment.txHash, payment.network)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                                        >
                                            View <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : (
                                        <span className="text-zinc-600">—</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
