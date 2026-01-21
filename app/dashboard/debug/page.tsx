'use client';

import { useState, useEffect } from 'react';
import { useAuthToken } from '@/app/hooks/useAuthToken';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Bug, Copy, Check, RefreshCw } from 'lucide-react';

interface DebugData {
    user: {
        id: string;
        privy_id: string;
        email: string;
        wallet_address: string;
    };
    projects: any[];
    sellerIdsSearched: string[];
    paymentLinksCount: number;
    salesCount: number;
    allPaymentLinkSellerIds: any[];
}

export default function DebugPage() {
    const { authFetch } = useAuthToken();
    const [data, setData] = useState<DebugData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchDebugData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await authFetch('/api/debug/user-data');
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch debug data');
            }

            setData(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebugData();
    }, []);

    const copyToClipboard = () => {
        if (data) {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Bug className="w-8 h-8 text-orange-400" />
                        Debug Info
                    </h1>
                    <p className="text-zinc-400">
                        Diagnostic information to troubleshoot data issues
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchDebugData}
                        className="border-zinc-700 text-zinc-300"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                    <Button
                        onClick={copyToClipboard}
                        className="bg-blue-600 hover:bg-blue-500"
                    >
                        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied ? 'Copied!' : 'Copy All'}
                    </Button>
                </div>
            </div>

            {error && (
                <Card className="bg-red-500/10 border-red-500/30 mb-6">
                    <CardContent className="py-4">
                        <p className="text-red-400">Error: {error}</p>
                    </CardContent>
                </Card>
            )}

            {data && (
                <div className="space-y-6">
                    {/* User Info */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">User Info</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-zinc-500 text-sm">User ID</p>
                                    <code className="text-zinc-200 text-sm font-mono">{data.user.id}</code>
                                </div>
                                <div>
                                    <p className="text-zinc-500 text-sm">Privy ID</p>
                                    <code className="text-zinc-200 text-sm font-mono">{data.user.privy_id}</code>
                                </div>
                                <div>
                                    <p className="text-zinc-500 text-sm">Email</p>
                                    <code className="text-zinc-200 text-sm">{data.user.email || 'N/A'}</code>
                                </div>
                                <div>
                                    <p className="text-zinc-500 text-sm">Wallet</p>
                                    <code className="text-zinc-200 text-sm font-mono">{data.user.wallet_address || 'N/A'}</code>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Projects */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Projects ({data.projects.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.projects.length === 0 ? (
                                <p className="text-zinc-500">No projects found</p>
                            ) : (
                                <div className="space-y-3">
                                    {data.projects.map((p: any, i: number) => (
                                        <div key={i} className="p-3 bg-zinc-800 rounded-lg">
                                            <p className="text-white font-medium">{p.name}</p>
                                            <code className="text-zinc-400 text-xs font-mono">{p.id}</code>
                                            <div className="flex gap-4 mt-1 text-xs text-zinc-500">
                                                <span>Env: {p.environment}</span>
                                                <span>Network: {p.x402_network}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Data Counts */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Data Counts</CardTitle>
                            <CardDescription className="text-zinc-400">
                                How many records exist for your seller IDs
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-800 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-white">{data.paymentLinksCount}</p>
                                    <p className="text-zinc-500 text-sm">Payment Links</p>
                                </div>
                                <div className="p-4 bg-zinc-800 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-white">{data.salesCount}</p>
                                    <p className="text-zinc-500 text-sm">Sales</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Seller IDs Searched */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Seller IDs Being Searched</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                {data.sellerIdsSearched.map((id, i) => (
                                    <code key={i} className="block text-zinc-300 text-sm font-mono bg-zinc-800 px-2 py-1 rounded">
                                        {id}
                                    </code>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* All Seller IDs in DB */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">All Seller IDs in payment_links table</CardTitle>
                            <CardDescription className="text-zinc-400">
                                These are all unique seller_ids in the database
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.allPaymentLinkSellerIds.length === 0 ? (
                                <p className="text-zinc-500">No payment links in database</p>
                            ) : (
                                <div className="space-y-2">
                                    {data.allPaymentLinkSellerIds.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center p-2 bg-zinc-800 rounded">
                                            <code className="text-zinc-300 text-sm font-mono">{item.seller_id}</code>
                                            <span className="text-zinc-500 text-sm">{item.count} links</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Raw JSON */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Raw JSON</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-xs text-zinc-300 font-mono max-h-96">
                                {JSON.stringify(data, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
