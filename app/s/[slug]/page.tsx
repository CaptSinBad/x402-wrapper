'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShoppingCart, ExternalLink, Store } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Store {
    id: string;
    store_name: string;
    store_slug: string;
    description: string;
    logo_url: string;
    banner_url: string;
    theme_color: string;
}

interface Product {
    id: string;
    name: string;
    description: string;
    price: string;
    price_cents: number;
    currency: string;
    images: string[];
}

export default function StorePage() {
    const params = useParams();
    const slug = params?.slug as string;

    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<Store | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        if (slug) {
            fetchStore();
            updateCartCount();
        }
    }, [slug]);

    const updateCartCount = () => {
        if (typeof window === 'undefined') return;
        const cart = JSON.parse(localStorage.getItem('cart') || '{"items": []}');
        const count = cart.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
        setCartCount(count);
    };

    const fetchStore = async () => {
        try {
            const response = await fetch(`/api/stores/public/${slug}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Store not found');
                setLoading(false);
                return;
            }

            setStore(data.store);
            setProducts(data.products || []);
        } catch (error) {
            console.error('Failed to fetch store:', error);
            setError('Failed to load store');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product: Product) => {
        const currentCart = JSON.parse(localStorage.getItem('cart') || '{"storeSlug": "", "items": []}');

        // Reset cart if store changes
        if (currentCart.storeSlug !== slug) {
            currentCart.storeSlug = slug;
            currentCart.items = [];
        }

        const existingItem = currentCart.items.find((item: any) => item.productId === product.id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            currentCart.items.push({
                productId: product.id,
                name: product.name,
                price_cents: product.price_cents,
                currency: product.currency,
                image: product.images?.[0] || null,
                quantity: 1
            });
        }

        localStorage.setItem('cart', JSON.stringify(currentCart));
        updateCartCount();

        // Optional: Add toast notification here
    };

    if (loading) {
        return (
            <div className="min-h-dvh bg-zinc-950 flex flex-col">
                {/* Skeleton Header */}
                <div className="w-full h-48 bg-zinc-900 animate-pulse" />
                <div className="max-w-7xl mx-auto px-6 -mt-16 w-full space-y-8">
                    <div className="flex flex-col md:flex-row items-end gap-6">
                        <Skeleton className="w-32 h-32 rounded-xl border-4 border-zinc-950" />
                        <div className="space-y-4 pb-2 w-full">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i} className="bg-zinc-900 border-zinc-800">
                                <Skeleton className="h-48 w-full rounded-t-xl" />
                                <CardHeader>
                                    <Skeleton className="h-6 w-3/4 mb-2" />
                                    <Skeleton className="h-4 w-full" />
                                </CardHeader>
                                <CardFooter>
                                    <Skeleton className="h-10 w-full" />
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="min-h-dvh bg-zinc-950 flex items-center justify-center p-6 text-white">
                <div className="text-center max-w-md space-y-6">
                    <div className="mx-auto bg-zinc-900 p-6 rounded-full w-fit">
                        <Store className="w-12 h-12 text-zinc-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Store Not Found</h1>
                        <p className="text-zinc-400">
                            The store you're looking for doesn't exist or has been deactivated.
                        </p>
                    </div>
                    <Button asChild variant="secondary">
                        <Link href="/">Go to Homepage</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-zinc-950 text-zinc-100">
            {/* Banner */}
            <div
                className="w-full h-48 md:h-64 bg-zinc-900 relative overflow-hidden"
                style={{ backgroundColor: store.theme_color || '#2B5FA5' }}
            >
                {store.banner_url && (
                    <img
                        src={store.banner_url}
                        alt="Store Banner"
                        className="w-full h-full object-cover opacity-80"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 pb-20 -mt-20 relative z-10">
                {/* Store Header */}
                <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-12">
                    <div className="relative">
                        {store.logo_url ? (
                            <img
                                src={store.logo_url}
                                alt={store.store_name}
                                className="w-32 h-32 rounded-2xl border-4 border-zinc-950 shadow-xl object-cover bg-zinc-900"
                            />
                        ) : (
                            <div
                                className="w-32 h-32 rounded-2xl border-4 border-zinc-950 shadow-xl flex items-center justify-center text-4xl font-bold text-white uppercase"
                                style={{ backgroundColor: store.theme_color }}
                            >
                                {store.store_name.slice(0, 2)}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-2 pb-2">
                        <h1 className="text-4xl font-bold text-white text-balance">{store.store_name}</h1>
                        {store.description && (
                            <p className="text-lg text-zinc-400 max-w-2xl text-pretty">{store.description}</p>
                        )}
                    </div>

                    <Button asChild size="lg" className="shadow-lg">
                        <Link href={`/s/${slug}/cart`} className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            <span>Cart</span>
                            {cartCount > 0 && (
                                <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </Button>
                </div>

                {/* Product Grid */}
                {products.length === 0 ? (
                    <Card className="bg-zinc-900/50 border-zinc-800 text-center py-16">
                        <CardContent className="space-y-4">
                            <div className="text-6xl mb-4">📦</div>
                            <CardTitle>No Products Yet</CardTitle>
                            <CardDescription>Check back soon for new items!</CardDescription>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product) => (
                            <Card key={product.id} className="bg-zinc-900 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors group h-full flex flex-col">
                                <div className="aspect-[4/3] bg-zinc-950 relative overflow-hidden">
                                    {product.images?.[0] ? (
                                        <img
                                            src={product.images[0]}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                            <Store className="w-16 h-16" />
                                        </div>
                                    )}
                                </div>
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-4">
                                        <CardTitle className="text-xl text-white line-clamp-1" title={product.name}>
                                            {product.name}
                                        </CardTitle>
                                        <div className="font-mono text-lg font-bold text-green-400 whitespace-nowrap">
                                            ${(product.price_cents / 100).toFixed(2)}
                                        </div>
                                    </div>
                                    <CardDescription className="line-clamp-2 text-zinc-400 h-10">
                                        {product.description || 'No description available'}
                                    </CardDescription>
                                </CardHeader>
                                <div className="flex-1" />
                                <CardFooter className="pt-0">
                                    <Button
                                        className="w-full"
                                        onClick={() => addToCart(product)}
                                        style={{ backgroundColor: store.theme_color }}
                                    >
                                        Add to Cart
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
