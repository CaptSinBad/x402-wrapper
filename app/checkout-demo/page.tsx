'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function CheckoutDemoPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<{ [key: string]: number }>({});
    const [creatingSession, setCreatingSession] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products/list?active=true');
            const data = await response.json();
            setProducts(data.products || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (productId: string) => {
        setCart(prev => ({
            ...prev,
            [productId]: (prev[productId] || 0) + 1
        }));
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (newCart[productId] > 1) {
                newCart[productId]--;
            } else {
                delete newCart[productId];
            }
            return newCart;
        });
    };

    const getCartTotal = () => {
        return Object.entries(cart).reduce((total, [productId, quantity]) => {
            const product = products.find(p => p.id === productId);
            return total + (product ? product.price_cents * quantity : 0);
        }, 0) / 100;
    };

    const createCheckoutSession = async () => {
        setCreatingSession(true);
        try {
            const lineItems = Object.entries(cart).map(([productId, quantity]) => ({
                product_id: productId,
                quantity
            }));

            console.log('[checkout-demo] Creating session with line items:', lineItems);

            const response = await fetch('/api/checkout/sessions/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    line_items: lineItems,
                    mode: 'payment',
                    success_url: `${window.location.origin}/checkout/success`,
                    cancel_url: window.location.href
                })
            });

            const data = await response.json();
            console.log('[checkout-demo] Session API response:', data);

            if (!response.ok) {
                console.error('[checkout-demo] Session creation failed:', data);
                throw new Error(data.error || 'Failed to create session');
            }

            console.log('[checkout-demo] Redirecting to:', `/checkout/${data.id}`);

            // Redirect to hosted checkout
            router.push(`/checkout/${data.id}`);
        } catch (error: any) {
            console.error('[checkout-demo] Error:', error);
            alert(`Failed to create checkout session:\n${error.message}\n\nCheck browser console for details.`);
        } finally {
            setCreatingSession(false);
        }
    };


    const cartItems = Object.entries(cart).map(([productId, quantity]) => {
        const product = products.find(p => p.id === productId);
        return product ? { ...product, quantity } : null;
    }).filter(Boolean);

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#4B5563' }}>Loading products...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '12px' }}>
                Checkout Demo (MVP 2)
            </h1>
            <p style={{ color: '#4B5563', marginBottom: '40px' }}>
                Add products to cart and checkout - just like Stripe!
            </p>

            {products.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>No products yet</h2>
                    <p style={{ color: '#4B5563', marginBottom: '24px' }}>
                        Create products first to test checkout
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/products/create')}
                        style={{
                            padding: '12px 24px',
                            background: '#2B5FA5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Create Your First Product
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
                    {/* Products Grid */}
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Available Products</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    style={{
                                        background: 'white',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {product.images.length > 0 && (
                                        <img
                                            src={product.images[0]}
                                            alt={product.name}
                                            style={{
                                                width: '100%',
                                                height: '180px',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    )}
                                    <div style={{ padding: '16px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                                            {product.name}
                                        </h3>
                                        {product.description && (
                                            <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '12px' }}>
                                                {product.description}
                                            </p>
                                        )}
                                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#2B5FA5', marginBottom: '16px' }}>
                                            ${product.price} {product.currency}
                                        </div>
                                        <button
                                            onClick={() => addToCart(product.id)}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: '#2B5FA5',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cart */}
                    <div>
                        <div style={{ position: 'sticky', top: '20px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Cart</h2>
                            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                                {cartItems.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                                        <p style={{ color: '#4B5563', fontSize: '14px' }}>Your cart is empty</p>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {cartItems.map((item: any) => (
                                                <div
                                                    key={item.id}
                                                    style={{
                                                        padding: '16px',
                                                        borderBottom: '1px solid #E2E8F0',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                                                            {item.name}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: '#4B5563' }}>
                                                            ${item.price} each
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                background: '#F7FAFC',
                                                                border: '1px solid #E2E8F0',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '16px'
                                                            }}
                                                        >
                                                            −
                                                        </button>
                                                        <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '20px', textAlign: 'center' }}>
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => addToCart(item.id)}
                                                            style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                background: '#F7FAFC',
                                                                border: '1px solid #E2E8F0',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '16px'
                                                            }}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ padding: '20px', background: '#F7FAFC', borderTop: '2px solid #E2E8F0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                <span style={{ fontSize: '16px', fontWeight: '700' }}>Total</span>
                                                <span style={{ fontSize: '20px', fontWeight: '700', color: '#2B5FA5' }}>
                                                    ${getCartTotal().toFixed(2)} USDC
                                                </span>
                                            </div>

                                            <button
                                                onClick={createCheckoutSession}
                                                disabled={creatingSession}
                                                style={{
                                                    width: '100%',
                                                    padding: '14px',
                                                    background: creatingSession ? '#CBD5E0' : '#2B5FA5',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '15px',
                                                    fontWeight: '700',
                                                    cursor: creatingSession ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {creatingSession ? 'Creating...' : 'Checkout'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
