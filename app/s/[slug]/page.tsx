'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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

    useEffect(() => {
        if (slug) {
            fetchStore();
        }
    }, [slug]);

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

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-400">Loading store...</p>
                </div>
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">🏪</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Store Not Found</h1>
                    <p className="text-zinc-400 mb-6">
                        The store you're looking for doesn't exist or has been deactivated.
                    </p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-900">
            {/* Header */}
            <header className="bg-zinc-800 border-b border-zinc-700">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {store.logo_url && (
                            <img
                                src={store.logo_url}
                                alt={store.store_name}
                                className="w-12 h-12 rounded-lg object-cover ring-2 ring-zinc-700"
                            />
                        )}
                        <h1 className="text-2xl font-bold text-white">
                            {store.store_name}
                        </h1>
                    </div>
                    <div className="text-sm text-zinc-400">
                        Powered by <span style={{ color: store.theme_color }} className="font-semibold">BinahPay</span>
                    </div>
                </div>
            </header>

            {/* Banner */}
            {store.banner_url && (
                <div
                    className="h-80 bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${store.banner_url})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/50"></div>
                </div>
            )}

            {/* Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Store Description */}
                {store.description && (
                    <div className="text-center mb-16">
                        <p className="text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed">
                            {store.description}
                        </p>
                    </div>
                )}

                {/* Products Section */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-8">Products</h2>

                    {products.length === 0 ? (
                        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-16 text-center">
                            <div className="text-6xl mb-4">📦</div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                No products yet
                            </h3>
                            <p className="text-zinc-400">
                                Check back soon for new products!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {products.map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/s/${slug}/product/${product.id}`}
                                    className="group bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden hover:border-zinc-600 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1"
                                >
                                    {/* Product Image */}
                                    <div className="relative aspect-square bg-zinc-900 overflow-hidden">
                                        {product.images.length > 0 ? (
                                            <img
                                                src={product.images[0]}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-5">
                                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                                            {product.name}
                                        </h3>
                                        {product.description && (
                                            <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                                                {product.description}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <div
                                                className="text-2xl font-bold"
                                                style={{ color: store.theme_color }}
                                            >
                                                ${product.price}
                                            </div>
                                            <div className="text-xs text-zinc-500 uppercase tracking-wide">
                                                {product.currency}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-800 mt-20">
                <div className="max-w-7xl mx-auto px-6 py-8 text-center">
                    <p className="text-zinc-500 text-sm">
                        Powered by <span className="text-blue-500 font-semibold">BinahPay</span> — Accept crypto payments worldwide
                    </p>
                </div>
            </footer>
        </div>
    );
}
