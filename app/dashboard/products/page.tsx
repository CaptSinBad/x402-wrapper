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
    order_count: number;
    total_revenue: string;
    created_at: string;
}

export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    useEffect(() => {
        fetchProducts();
    }, [filter]);

    const fetchProducts = async () => {
        try {
            const url = `/api/products/list${filter !== 'all' ? `?active=${filter === 'active'}` : ''}`;
            const response = await fetch(url);
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
            await fetch(`/api/products/${productId}`, {
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
            await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });
            fetchProducts();
        } catch (error) {
            console.error('Failed to delete product:', error);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: '#718096' }}>Loading products...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Products</h1>
                    <p style={{ color: '#718096' }}>
                        {products.length} {products.length === 1 ? 'product' : 'products'}
                    </p>
                </div>
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
                    + Add Product
                </button>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E2E8F0' }}>
                {(['all', 'active', 'inactive'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        style={{
                            padding: '12px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: filter === tab ? '2px solid #2B5FA5' : '2px solid transparent',
                            color: filter === tab ? '#2B5FA5' : '#718096',
                            fontWeight: filter === tab ? '600' : '400',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {products.length === 0 ? (
                <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                        No products yet
                    </h2>
                    <p style={{ color: '#718096', marginBottom: '24px' }}>
                        Create your first product to start accepting payments
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
                        Create Product
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
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
                                        height: '200px',
                                        objectFit: 'cover'
                                    }}
                                />
                            )}
                            <div style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2D3748' }}>
                                        {product.name}
                                    </h3>
                                    <span
                                        style={{
                                            padding: '4px 8px',
                                            background: product.active ? '#C6F6D5' : '#FED7D7',
                                            color: product.active ? '#22543D' : '#742A2A',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        {product.active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                {product.description && (
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#718096',
                                        marginBottom: '12px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                    }}>
                                        {product.description}
                                    </p>
                                )}

                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#2B5FA5' }}>
                                        ${product.price} {product.currency}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#718096' }}>Orders</div>
                                        <div style={{ fontSize: '16px', fontWeight: '600' }}>{product.order_count}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#718096' }}>Revenue</div>
                                        <div style={{ fontSize: '16px', fontWeight: '600' }}>${product.total_revenue}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => router.push(`/dashboard/products/${product.id}`)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: '#F7FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => toggleActive(product.id, product.active)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: '#F7FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {product.active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => deleteProduct(product.id)}
                                        style={{
                                            padding: '8px',
                                            background: '#FED7D7',
                                            border: '1px solid #FC8181',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            color: '#742A2A'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
