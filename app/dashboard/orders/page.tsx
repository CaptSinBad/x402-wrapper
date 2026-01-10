'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Eye, Calendar, User, Package as PackageIcon } from 'lucide-react';

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
import { Badge } from '@/app/components/ui/badge';

interface Order {
    id: string;
    session_id: string;
    customer_email: string;
    customer_wallet: string;
    line_items: any[];
    total_cents: number;
    currency: string;
    status: string;
    created_at: string;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            // Placeholder: Connect to real API when ready
            // const response = await fetch('/api/orders/list');
            // const data = await response.json();
            // setOrders(data.orders || []);
            setOrders([]); // Explicitly empty for now to show correct empty state
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-96 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-zinc-100">Orders</h1>
                <p className="text-zinc-400">
                    Track and manage customer orders ({orders.length})
                </p>
            </div>

            {orders.length === 0 ? (
                <Card className="border-dashed border-zinc-800 bg-zinc-900/20 text-center py-16">
                    <CardContent className="space-y-6">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                            <ShoppingBag className="h-10 w-10 text-zinc-500" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl text-zinc-100">No orders yet</CardTitle>
                            <CardDescription className="text-lg text-zinc-400">
                                Orders from your store will appear here once customers make a purchase.
                            </CardDescription>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-zinc-800 hover:bg-transparent">
                                    <TableHead className="text-zinc-400">Order</TableHead>
                                    <TableHead className="text-zinc-400">Customer</TableHead>
                                    <TableHead className="text-zinc-400">Items</TableHead>
                                    <TableHead className="text-zinc-400">Total</TableHead>
                                    <TableHead className="text-zinc-400">Status</TableHead>
                                    <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell>
                                            <div className="font-medium text-zinc-200">#{order.session_id.substring(0, 8)}</div>
                                            <div className="flex items-center text-xs text-zinc-500 mt-0.5">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-zinc-300">
                                                {order.customer_email || 'Guest'}
                                            </div>
                                            <div className="flex items-center text-xs text-zinc-500 font-mono mt-0.5">
                                                <User className="w-3 h-3 mr-1" />
                                                {order.customer_wallet ? `${order.customer_wallet.substring(0, 6)}...${order.customer_wallet.substring(38)}` : '—'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-sm text-zinc-300">
                                                <PackageIcon className="w-4 h-4 mr-2 text-zinc-500" />
                                                {order.line_items.length} {order.line_items.length === 1 ? 'item' : 'items'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-zinc-100">
                                                ${(order.total_cents / 100).toFixed(2)} <span className="text-xs font-normal text-zinc-500">{order.currency}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                order.status === 'shipped' ? 'success' :
                                                    order.status === 'delivered' ? 'outline' : 'secondary'
                                            }>
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                                                <Eye className="w-4 h-4 mr-2" /> View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}
        </div>
    );
}
