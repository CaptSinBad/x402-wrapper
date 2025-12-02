'use client';

import { useState } from 'react';
import { products, type Product } from '../lib/products';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';
import Header from './components/Header';
import Snowfall from './components/Snowfall';

export default function HomePage() {
    const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
    const [filter, setFilter] = useState<'all' | 'shoes' | 'clothing'>('all');
    const [showCart, setShowCart] = useState(false);

    const filteredProducts =
        filter === 'all' ? products : products.filter((p) => p.category === filter);

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setCart((prev) =>
            prev.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
            )
        );
    };

    const cartTotal = cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
    );

    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <>
            <Snowfall />
            <Header
                cartItemCount={cartItemCount}
                onCartClick={() => setShowCart(true)}
            />

            <Cart
                isOpen={showCart}
                onClose={() => setShowCart(false)}
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                total={cartTotal}
            />

            <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
                {/* Hero Section */}
                <div style={{
                    background: 'linear-gradient(135deg, #C41E3A 0%, #8B1538 100%)',
                    borderRadius: '20px',
                    padding: '60px 40px',
                    textAlign: 'center',
                    marginBottom: '48px',
                    color: 'white',
                    boxShadow: '0 10px 40px rgba(196, 30, 58, 0.3)',
                }}>
                    <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '16px' }}>
                        🎄 ROLA ACCESSORIES
                    </h1>
                    <p style={{ fontSize: '24px', marginBottom: '8px' }}>Christmas Collection 2024</p>
                    <p style={{ fontSize: '16px', opacity: 0.9 }}>
                        Premium Shoes & Clothing | Pay with Crypto 💎
                    </p>
                </div>

                {/* Category Filter */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '32px',
                    justifyContent: 'center',
                }}>
                    <button
                        className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setFilter('all')}
                    >
                        All Products
                    </button>
                    <button
                        className={filter === 'shoes' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setFilter('shoes')}
                    >
                        👞 Shoes
                    </button>
                    <button
                        className={filter === 'clothing' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setFilter('clothing')}
                    >
                        👔 Clothing
                    </button>
                </div>

                {/* Product Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '24px',
                    marginBottom: '80px',
                }}>
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={addToCart}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    borderTop: '2px solid #E2E8F0',
                }}>
                    <p style={{ color: '#718096', marginBottom: '8px' }}>
                        Powered by <strong style={{ color: '#2B5FA5' }}>BinahPay</strong>
                    </p>
                    <p style={{ fontSize: '13px', color: '#A0AEC0' }}>
                        Secure crypto payments | Built with ❤️ for Web3
                    </p>
                </div>
            </main>
        </>
    );
}
