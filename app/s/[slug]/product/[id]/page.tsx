'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Product {
    id: string;
    name: string;
    description: string;
    price: string;
    price_cents: number;
    currency: string;
    images: string[];
}

export default function ProductDetailPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const productId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (slug && productId) {
            fetchProduct();
        }
    }, [slug, productId]);

    const fetchProduct = async () => {
        try {
            // Fetch store first to get products
            const storeResponse = await fetch(`/api/stores/public/${slug}`);
            const storeData = await storeResponse.json();

            if (!storeResponse.ok) {
                setLoading(false);
                return;
            }

            // Find product in store's products
            const foundProduct = storeData.products.find((p: any) => p.id === productId);
            setProduct(foundProduct || null);
        } catch (error) {
            console.error('Failed to fetch product:', error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = () => {
        if (!product) return;

        // Get existing cart from localStorage
        const cartData = localStorage.getItem('cart');
        const cart = cartData ? JSON.parse(cartData) : { storeSlug: slug, items: [] };

        // Update or add item
        const existingItemIndex = cart.items.findIndex((item: any) => item.productId === productId);

        if (existingItemIndex >= 0) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({
                productId,
                name: product.name,
                price_cents: product.price_cents,
                currency: product.currency,
                image: product.images[0] || null,
                quantity
            });
        }

        cart.storeSlug = slug;
        localStorage.setItem('cart', JSON.stringify(cart));

        alert(`Added ${quantity} ${product.name} to cart!`);
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
                <p style={{ color: '#4B5563', fontSize: '18px' }}>Loading product...</p>
            </div>
        );
    }

    if (!product) {
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
                <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>
                    Product Not Found
                </h1>
                <Link href={`/s/${slug}`} style={{
                    padding: '12px 24px',
                    background: '#2B5FA5',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600'
                }}>
                    Back to Store
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
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <Link
                        href={`/s/${slug}`}
                        style={{
                            color: '#2B5FA5',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}
                    >
                        ← Back to Store
                    </Link>
                </div>
            </header>

            {/* Product Detail */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '48px 24px'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '48px',
                    background: 'white',
                    borderRadius: '12px',
                    padding: '32px',
                    border: '1px solid #E2E8F0'
                }}>
                    {/* Product Image */}
                    <div>
                        {product.images.length > 0 ? (
                            <img
                                src={product.images[0]}
                                alt={product.name}
                                style={{
                                    width: '100%',
                                    aspectRatio: '1',
                                    objectFit: 'cover',
                                    borderRadius: '12px'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                aspectRatio: '1',
                                background: '#E2E8F0',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '64px'
                            }}>
                                📦
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div>
                        <h1 style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            marginBottom: '16px',
                            color: '#2D3748'
                        }}>
                            {product.name}
                        </h1>

                        <div style={{
                            fontSize: '28px',
                            fontWeight: '700',
                            color: '#2B5FA5',
                            marginBottom: '24px'
                        }}>
                            ${product.price} {product.currency}
                        </div>

                        {product.description && (
                            <p style={{
                                fontSize: '16px',
                                color: '#4B5563',
                                lineHeight: '1.6',
                                marginBottom: '32px'
                            }}>
                                {product.description}
                            </p>
                        )}

                        {/* Quantity Selector */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '8px',
                                color: '#2D3748'
                            }}>
                                Quantity
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#F7FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        fontWeight: '700'
                                    }}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    style={{
                                        width: '80px',
                                        padding: '12px',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        fontSize: '16px',
                                        fontWeight: '600'
                                    }}
                                />
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#F7FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        fontWeight: '700'
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                            onClick={addToCart}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: '#2B5FA5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                marginBottom: '12px'
                            }}
                        >
                            Add to Cart
                        </button>

                        <Link
                            href={`/s/${slug}/cart`}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '16px',
                                background: 'white',
                                color: '#2B5FA5',
                                border: '2px solid #2B5FA5',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                textAlign: 'center',
                                textDecoration: 'none'
                            }}
                        >
                            View Cart
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
