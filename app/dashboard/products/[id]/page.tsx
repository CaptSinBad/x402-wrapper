'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthToken } from '@/app/hooks/useAuthToken';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ArrowLeft, Trash2, Save, AlertTriangle } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    description: string;
    price: string;
    price_cents: number;
    currency: string;
    images: string[];
    active: boolean;
}

export default function ProductEditPage() {
    const { authFetch } = useAuthToken();
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [currency, setCurrency] = useState('USDC');
    const [active, setActive] = useState(true);

    useEffect(() => {
        fetchProduct();
    }, [productId]);

    const fetchProduct = async () => {
        try {
            const response = await authFetch(`/api/products/${productId}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }
            const data = await response.json();
            setProduct(data);
            setName(data.name);
            setDescription(data.description || '');
            setPrice(data.price);
            setCurrency(data.currency);
            setActive(data.active);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setSaving(true);
        setError('');

        try {
            const response = await authFetch(`/api/products/${productId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    price: parseFloat(price),
                    currency,
                    active
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update product');
            }

            alert('Product updated successfully!');
            router.push('/dashboard/products');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await authFetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete product');
            }

            alert('Product deleted successfully!');
            router.push('/dashboard/products');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    }

    if (error && !product) {
        return (
            <div className="p-6 lg:p-10 max-w-3xl mx-auto">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="py-16 text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Product not found</h2>
                        <p className="text-zinc-400 mb-6">{error}</p>
                        <Button
                            onClick={() => router.push('/dashboard/products')}
                            className="bg-blue-600 hover:bg-blue-500"
                        >
                            Back to Products
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-3xl mx-auto">
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/products')}
                    className="text-zinc-400 hover:text-white mb-4 -ml-2"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
                </Button>
                <h1 className="text-3xl font-bold text-white mb-2">Edit Product</h1>
                <p className="text-zinc-400">Update product details</p>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6 space-y-6">
                    {/* Product Images */}
                    {product?.images && product.images.length > 0 && (
                        <div>
                            <img
                                src={product.images[0]}
                                alt={name}
                                className="w-48 h-48 object-cover rounded-xl border border-zinc-700"
                            />
                        </div>
                    )}

                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-300">Product Name</Label>
                        <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-zinc-300">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="bg-zinc-800 border-zinc-700 text-white resize-y"
                        />
                    </div>

                    {/* Price */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="price" className="text-zinc-300">Price</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white pl-7"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency" className="text-zinc-300">Currency</Label>
                            <select
                                id="currency"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                            >
                                <option value="USDC">USDC</option>
                                <option value="USDT">USDT</option>
                            </select>
                        </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3 p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
                        <input
                            type="checkbox"
                            id="active"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                            className="w-4 h-4 accent-blue-500"
                        />
                        <label htmlFor="active" className="text-zinc-200 cursor-pointer">
                            Active (visible to customers)
                        </label>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-500"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Product
                        </Button>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => router.push('/dashboard/products')}
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdate}
                                disabled={saving || !name || !price}
                                className="bg-blue-600 hover:bg-blue-500"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
