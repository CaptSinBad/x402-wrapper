'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Copy, Check, Trash2, ExternalLink, MoreVertical, Loader2 } from 'lucide-react';
import { useAuthToken } from '@/app/hooks/useAuthToken';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/app/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/app/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu"
import { Skeleton } from '@/app/components/ui/skeleton';

interface PaymentLink {
    id: string;
    token: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    network: string;
    imageUrl?: string;
    brandColor: string;
    paymentCount: number;
    totalRevenue: number;
    url: string;
    createdAt: string;
}

export default function PaymentLinksPage() {
    const router = useRouter();
    const { authFetch } = useAuthToken();
    const [links, setLinks] = useState<PaymentLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        try {
            const response = await authFetch('/api/payment-links/list');
            const data = await response.json();
            setLinks(data.links || []);
        } catch (error) {
            console.error('Failed to fetch payment links:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyLink = (url: string, token: string) => {
        navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const response = await authFetch(`/api/payment-links/${deleteId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setLinks(links.filter(link => link.id !== deleteId));
                setDeleteId(null);
            }
        } catch (error) {
            console.error('Failed to delete:', error);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48 bg-zinc-800" />
                    <Skeleton className="h-10 w-32 bg-zinc-800" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl bg-zinc-800" />)}
                </div>
            </div>
        );
    }

    if (links.length === 0) {
        return (
            <div className="container max-w-4xl mx-auto py-12">
                <Card className="border-dashed border-zinc-800 bg-zinc-900/20 text-center py-16">
                    <CardContent className="space-y-6">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-4xl">🔗</span>
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl">No payment links yet</CardTitle>
                            <CardDescription className="text-lg">
                                Create shareable payment links to accept crypto payments instantly.
                            </CardDescription>
                        </div>
                        <Button
                            size="lg"
                            onClick={() => router.push('/dashboard/payment-links/create')}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Create Payment Link
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Payment Links</h1>
                    <p className="text-zinc-400">Manage your active payment links</p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/payment-links/create')}
                    className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                >
                    <Plus className="mr-2 h-4 w-4" /> Create Link
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {links.map((link) => (
                    <Card key={link.id} className="bg-zinc-900 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all group">
                        {link.imageUrl && (
                            <div className="h-40 w-full overflow-hidden bg-zinc-950 relative">
                                <img
                                    src={link.imageUrl}
                                    alt={link.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-60" />
                            </div>
                        )}
                        <CardHeader className="relative space-y-1">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg line-clamp-1" title={link.name}>
                                    {link.name}
                                </CardTitle>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 text-zinc-400 hover:text-white">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-300">
                                        <DropdownMenuItem onClick={() => router.push(`/link/${link.token}`)}>
                                            <ExternalLink className="mr-2 h-4 w-4" /> View Page
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => copyLink(link.url, link.token)}>
                                            <Copy className="mr-2 h-4 w-4" /> Copy URL
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-zinc-800" />
                                        <DropdownMenuItem
                                            className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                            onClick={() => setDeleteId(link.id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="text-2xl font-bold font-mono text-zinc-100">
                                ${(link.price || 0).toFixed(2)} <span className="text-sm font-normal text-zinc-500">{link.currency}</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 py-4 border-t border-zinc-800 mb-4">
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase font-medium">Revenue</p>
                                    <p className="text-lg font-semibold text-zinc-200 tabular-nums">
                                        ${(link.totalRevenue || 0).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase font-medium">Sales</p>
                                    <p className="text-lg font-semibold text-zinc-200 tabular-nums">
                                        {link.paymentCount || 0}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                                    onClick={() => copyLink(link.url, link.token)}
                                >
                                    {copiedToken === link.token ? (
                                        <>
                                            <Check className="mr-2 h-3 w-3 text-green-500" /> Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-2 h-3 w-3" /> Copy Link
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Payment Link?</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            This action cannot be undone. The link will no longer be accessible to your customers.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteId(null)}
                            className="bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                                </>
                            ) : (
                                'Delete Link'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
