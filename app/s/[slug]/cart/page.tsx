'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface CartItem {
    productId: string;
    name: string;
    price_cents: number;
    currency: string;
    image: string | null;
    quantity: number;
}

interface Cart {
    storeSlug: string;
    items: CartItem[];
}

export default function CartPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const [cart, setCart] = useState<Cart>({ storeSlug: slug, items: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadCart();
    }, []);

    const loadCart = () => {
        const cartData = localStorage.getItem('cart');
        if (cartData) {
            const parsedCart = JSON.parse(cartData);
            setCart(parsedCart);
        }
    };

    const updateQuantity = (productId: string, newQuantity: number) => {
        if (newQuantity < 1) return;

        const updatedCart = {
            ...cart,
            items: cart.items.map(item =>
                item.productId === productId
                    ? { ...item, quantity: newQuantity }
                    : item
            )
        };

        setCart(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
    };

    const removeItem = (productId: string) => {
        const updatedCart = {
            ...cart,
            items: cart.items.filter(item => item.productId !== productId)
        };

        setCart(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
    };

    const calculateSubtotal = () => {
        return cart.items.reduce((total, item) => total + (item.price_cents * item.quantity), 0);
    };

    const calculatePlatformFee = (subtotal: number) => {
        return Math.ceil(subtotal * 0.01); // 1% fee, round up
    };

    const handleCheckout = async () => {
        if (cart.items.length === 0) return;

        setLoading(true);

        try {
            // Create checkout session
            const response = await fetch('/api/checkout/sessions/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    line_items: cart.items.map(item => ({
                        product_id: item.productId,
                        quantity: item.quantity
                    })),
                    mode: 'payment',
                    success_url: `${window.location.origin}/s/${slug}?checkout=success`,
                    cancel_url: `${window.location.origin}/s/${slug}/cart`
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(`Error: ${data.error || response.statusText}`);
                setLoading(false);
                return;
            }

            // Clear cart
            localStorage.removeItem('cart');

            // Redirect to checkout
            router.push(data.url);
        } catch (error) {
            console.error('Checkout failed:', error);
            alert('Failed to create checkout session');
            setLoading(false);
        }
    };

    const subtotal = calculateSubtotal();
    const platformFee = calculatePlatformFee(subtotal);
    const total = subtotal + platformFee;

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
                        ← Continue Shopping
                    </Link>
                </div>
            </header>

            {/* Cart Content */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '48px 24px'
            }}>
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    marginBottom: '32px',
                    color: '#2D3748'
                }}>
                    Shopping Cart
                </h1>

                {cart.items.length === 0 ? (
                    <div style={{
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '64px 24px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                            Your cart is empty
                        </h2>
                        <p style={{ color: '#718096', marginBottom: '24px' }}>
                            Add some products to get started!
                        </p>
                        <Link
                            href={`/s/${slug}`}
                            style={{
                                display: 'inline-block',
                                padding: '12px 24px',
                                background: '#2B5FA5',
                                color: 'white',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}
                        >
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr',
                        gap: '24px'
                    }}>
                        {/* Cart Items */}
                        <div>
                            {cart.items.map((item) => (
                                <div
                                    key={item.productId}
                                    style={{
                                        background: 'white',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        marginBottom: '16px',
                                        display: 'flex',
                                        gap: '20px'
                                    }}
                                >
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            style={{
                                                width: '100px',
                                                height: '100px',
                                                objectFit: 'cover',
                                                borderRadius: '8px'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '100px',
                                            height: '100px',
                                            background: '#E2E8F0',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '32px'
                                        }}>
                                            📦
                                        </div>
                                    )}

                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                                            {item.name}
                                        </h3>
                                        <p style={{ fontSize: '16px', color: '#2B5FA5', fontWeight: '600' }}>
                                            ${(item.price_cents / 100).toFixed(2)} {item.currency}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    background: '#F7FAFC',
                                                    border: '1px solid #E2E8F0',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '16px'
                                                }}
                                            >
                                                −
                                            </button>
                                            <span style={{ width: '40px', textAlign: 'center', fontWeight: '600' }}>
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    background: '#F7FAFC',
                                                    border: '1px solid #E2E8F0',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '16px'
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => removeItem(item.productId)}
                                            style={{
                                                padding: '6px 12px',
                                                background: '#FED7D7',
                                                border: '1px solid #FC8181',
                                                borderRadius: '6px',
                                                color: '#742A2A',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Remove
                                        </button>

                                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#2D3748' }}>
                                            ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div>
                            <div style={{
                                background: 'white',
                                border: '1px solid #E2E8F0',
                                borderRadius: '12px',
                                padding: '24px',
                                position: 'sticky',
                                top: '24px'
                            }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
                                    Order Summary
                                </h2>

                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ color: '#718096' }}>Subtotal</span>
                                        <span style={{ fontWeight: '600' }}>
                                            ${(subtotal / 100).toFixed(2)} USDC
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ color: '#718096' }}>Service Fee (1%)</span>
                                        <span style={{ fontWeight: '600' }}>
                                            ${(platformFee / 100).toFixed(2)} USDC
                                        </span>
                                    </div>
                                    <div style={{
                                        borderTop: '1px solid #E2E8F0',
                                        paddingTop: '12px',
                                        marginTop: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span style={{ fontSize: '18px', fontWeight: '700' }}>Total</span>
                                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#2B5FA5' }}>
                                            ${(total / 100).toFixed(2)} USDC
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: loading ? '#CBD5E0' : '#2B5FA5',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        marginTop: '16px'
                                    }}
                                >
                                    {loading ? 'Processing...' : 'Proceed to Checkout'}
                                </button>

                                <p style={{
                                    fontSize: '12px',
                                    color: '#718096',
                                    textAlign: 'center',
                                    marginTop: '12px'
                                }}>
                                    Powered by BinahPay — Secure crypto payments
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
