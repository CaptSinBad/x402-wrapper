'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Package, Edit, Trash2, Power } from 'lucide-react';

import { useAuthToken } from '@/app/hooks/useAuthToken';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';

interface Product {
    id: string;
    name: string;
    description: string;
    price: string;
    price_cents: number;
    currency: string;
    images: string[];
    active: boolean;
    order_count: number;
    total_revenue: string;
    created_at: string;
}

export default function ProductsPage() {
    const router = useRouter();
    const { authFetch } = useAuthToken();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    useEffect(() => {
        fetchProducts();
    }, [filter]);

    const fetchProducts = async () => {
        try {
            const url = `/api/products/list${filter !== 'all' ? `?active=${filter === 'active'}` : ''}`;
            const response = await authFetch(url);
            const data = await response.json();
            setProducts(data.products || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (productId: string, currentActive: boolean) => {
        try {
            await authFetch(`/api/products/${productId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !currentActive })
            });
            fetchProducts();
        } catch (error) {
            console.error('Failed to toggle product:', error);
        }
    };

    const deleteProduct = async (productId: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            await authFetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });
            fetchProducts();
        } catch (error) {
            console.error('Failed to delete product:', error);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48 bg-zinc-800" />
                    <Skeleton className="h-10 w-32 bg-zinc-800" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[300px] rounded-xl bg-zinc-800" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Products</h1>
                    <p className="text-zinc-400">
                        Manage your store's inventory ({products.length})
                    </p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/products/create')}
                    className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                </Button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-zinc-800 pb-1">
                {(['all', 'active', 'inactive'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`
                            px-4 py-2 text-sm font-medium transition-colors relative
                            ${filter === tab ? 'text-blue-500' : 'text-zinc-400 hover:text-zinc-200'}
                        `}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {filter === tab && (
                            <div className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-blue-500 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {products.length === 0 ? (
                <Card className="border-dashed border-zinc-800 bg-zinc-900/20 text-center py-16">
                    <CardContent className="space-y-6">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                            <Package className="h-10 w-10 text-zinc-500" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl text-zinc-100">No products yet</CardTitle>
                            <CardDescription className="text-lg text-zinc-400">
                                Create your first product to start accepting payments
                            </CardDescription>
                        </div>
                        <Button
                            size="lg"
                            onClick={() => router.push('/dashboard/products/create')}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Create Product
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                        <Card key={product.id} className="bg-zinc-900 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all group">
                            {product.images.length > 0 && (
                                <div className="h-48 w-full overflow-hidden bg-zinc-950 relative border-b border-zinc-800/50">
                                    <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-60" />
                                </div>
                            )}

                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-semibold text-zinc-100 line-clamp-1" title={product.name}>
                                        {product.name}
                                    </h3>
                                    <Badge variant={product.active ? 'success' : 'destructive'} className="uppercase text-[10px]">
                                        {product.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>

                                {product.description && (
                                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2 min-h-[40px]">
                                        {product.description}
                                    </p>
                                )}

                                <div className="mb-6">
                                    <div className="text-2xl font-bold text-zinc-100 tabular-nums">
                                        ${product.price} <span className="text-sm font-normal text-zinc-500">{product.currency}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-4 border-t border-zinc-800 mb-4">
                                    <div>
                                        <div className="text-xs text-zinc-500 uppercase font-medium mb-1">Orders</div>
                                        <div className="text-lg font-semibold text-zinc-200 tabular-nums">{product.order_count}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500 uppercase font-medium mb-1">Revenue</div>
                                        <div className="text-lg font-semibold text-zinc-200 tabular-nums">${product.total_revenue}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                                        onClick={() => router.push(`/dashboard/products/${product.id}`)}
                                    >
                                        <Edit className="h-3 w-3 mr-2" /> Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                                        onClick={() => toggleActive(product.id, product.active)}
                                    >
                                        <Power className="h-3 w-3 mr-2" /> {product.active ? 'Disable' : 'Enable'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                                        onClick={() => deleteProduct(product.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
