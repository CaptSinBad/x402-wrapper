'use client';

import { useRouter } from 'next/navigation';
import type { Product } from '../../lib/products';

interface CartProps {
    isOpen: boolean;
    onClose: () => void;
    cart: Array<{ product: Product; quantity: number }>;
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemove: (productId: string) => void;
    total: number;
}

export default function Cart({
    isOpen,
    onClose,
    cart,
    onUpdateQuantity,
    onRemove,
    total,
}: CartProps) {
    const router = useRouter();

    const handleCheckout = async () => {
        // Send cart to API to create BinahPay session
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart }),
        });

        const data = await response.json();

        if (data.sessionId) {
            // Navigate to checkout page with session ID
            router.push(`/checkout?session=${data.sessionId}`);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 999,
                }}
            />

            {/* Cart Sidebar */}
            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '400px',
                maxWidth: '90vw',
                background: 'white',
                zIndex: 1000,
                boxShadow: '-4px 0 15px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '2px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                        🛒 Your Cart
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Cart Items */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#718096' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛍️</div>
                            <p>Your cart is empty</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div
                                key={item.product.id}
                                style={{
                                    marginBottom: '16px',
                                    padding: '16px',
                                    background: '#F7FAFC',
                                    borderRadius: '12px',
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '12px',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                            {item.product.name}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#C41E3A', fontWeight: '700' }}>
                                            ${item.product.price.toFixed(2)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onRemove(item.product.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#E53E3E',
                                            cursor: 'pointer',
                                            fontSize: '18px',
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button
                                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            border: '1px solid #E2E8F0',
                                            background: 'white',
                                            cursor: 'pointer',
                                            fontWeight: '700',
                                        }}
                                    >
                                        −
                                    </button>
                                    <span style={{ fontWeight: '600', minWidth: '30px', textAlign: 'center' }}>
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            border: '1px solid #E2E8F0',
                                            background: 'white',
                                            cursor: 'pointer',
                                            fontWeight: '700',
                                        }}
                                    >
                                        +
                                    </button>
                                    <span style={{ marginLeft: 'auto', fontWeight: '700' }}>
                                        ${(item.product.price * item.quantity).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div style={{
                        padding: '24px',
                        borderTop: '2px solid #E2E8F0',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '20px',
                            fontSize: '20px',
                            fontWeight: '800',
                        }}>
                            <span>Total:</span>
                            <span style={{ color: '#C41E3A' }}>${total.toFixed(2)} USDC</span>
                        </div>

                        <button
                            onClick={handleCheckout}
                            className="btn-primary"
                            style={{ width: '100%', padding: '16px', fontSize: '16px' }}
                        >
                            Proceed to Checkout →
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
