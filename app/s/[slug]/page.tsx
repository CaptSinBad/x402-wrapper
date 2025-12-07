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
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F7FAFC'
            }}>
                <p style={{ color: '#718096', fontSize: '18px' }}>Loading store...</p>
            </div>
        );
    }

    if (error || !store) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                background: '#F7FAFC',
                padding: '24px'
            }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏪</div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                    Store Not Found
                </h1>
                <p style={{ color: '#718096', marginBottom: '24px' }}>
                    The store you're looking for doesn't exist or has been deactivated.
                </p>
                <Link href="/" style={{
                    padding: '12px 24px',
                    background: '#2B5FA5',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600'
                }}>
                    Go Home
                </Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#F7FAFC' }}>
            {/* Header */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid #E2E8F0',
                padding: '16px 24px'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {store.logo_url && (
                            <img
                                src={store.logo_url}
                                alt={store.store_name}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    objectFit: 'cover'
                                }}
                            />
                        )}
                        <h1 style={{ fontSize: '20px', fontWeight: '700' }}>
                            {store.store_name}
                        </h1>
                    </div>
                    <div style={{ fontSize: '14px', color: '#718096' }}>
                        Powered by <strong style={{ color: store.theme_color }}>BinahPay</strong>
                    </div>
                </div>
            </header>

            {/* Banner */}
            {store.banner_url && (
                <div style={{
                    height: '300px',
                    backgroundImage: `url(${store.banner_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }} />
            )}

            {/* Content */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '48px 24px'
            }}>
                {/* Store Description */}
                {store.description && (
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '48px'
                    }}>
                        <p style={{
                            fontSize: '18px',
                            color: '#4A5568',
                            maxWidth: '600px',
                            margin: '0 auto'
                        }}>
                            {store.description}
                        </p>
                    </div>
                )}

                {/* Products Grid */}
                {products.length === 0 ? (
                    <div style={{
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '64px 24px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                            No products yet
                        </h2>
                        <p style={{ color: '#718096' }}>
                            Check back soon for new products!
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '24px'
                    }}>
                        {products.map((product) => (
                            <Link
                                key={product.id}
                                href={`/s/${slug}/product/${product.id}`}
                                style={{
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    cursor: 'pointer'
                                }}
                            >
                                {product.images.length > 0 && (
                                    <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        style={{
                                            width: '100%',
                                            height: '220px',
                                            objectFit: 'cover'
                                        }}
                                    />
                                )}
                                <div style={{ padding: '16px' }}>
                                    <h3 style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#2D3748'
                                    }}>
                                        {product.name}
                                    </h3>
                                    {product.description && (
                                        <p style={{
                                            fontSize: '14px',
                                            color: '#718096',
                                            marginBottom: '12px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical' as any
                                        }}>
                                            {product.description}
                                        </p>
                                    )}
                                    <div style={{
                                        fontSize: '20px',
                                        fontWeight: '700',
                                        color: store.theme_color
                                    }}>
                                        ${product.price} {product.currency}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid #E2E8F0',
                padding: '24px',
                textAlign: 'center',
                color: '#718096',
                fontSize: '14px'
            }}>
                <p>Powered by <strong style={{ color: '#2B5FA5' }}>BinahPay</strong> — Accept crypto payments worldwide</p>
            </footer>
        </div>
    );
}
