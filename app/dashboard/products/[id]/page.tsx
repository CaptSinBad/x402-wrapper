'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
            const response = await fetch(`/api/products/${productId}`);
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
            const response = await fetch(`/api/products/${productId}`, {
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
            const response = await fetch(`/api/products/${productId}`, {
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
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#718096' }}>Loading product...</p>
            </div>
        );
    }

    if (error && !product) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Product not found</h2>
                <p style={{ color: '#718096', marginBottom: '24px' }}>{error}</p>
                <button
                    onClick={() => router.push('/dashboard/products')}
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
                    Back to Products
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <button
                    onClick={() => router.push('/dashboard/products')}
                    style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        marginBottom: '20px'
                    }}
                >
                    ← Back to Products
                </button>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Edit Product</h1>
                <p style={{ color: '#718096' }}>Update product details</p>
            </div>

            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '32px' }}>
                {/* Product Images */}
                {product?.images && product.images.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <img
                            src={product.images[0]}
                            alt={name}
                            style={{
                                width: '200px',
                                height: '200px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '1px solid #E2E8F0'
                            }}
                        />
                    </div>
                )}

                {/* Name */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Product Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '15px'
                        }}
                    />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '15px',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Price */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                            Price
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                fontSize: '15px'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                            Currency
                        </label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                fontSize: '15px'
                            }}
                        >
                            <option value="USDC">USDC</option>
                        </select>
                    </div>
                </div>

                {/* Active Status */}
                <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                            style={{ marginRight: '8px' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>Active (visible to customers)</span>
                    </label>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ background: '#FED7D7', border: '1px solid #FC8181', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#742A2A', fontSize: '14px' }}>
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                    <button
                        onClick={handleDelete}
                        style={{
                            padding: '12px 24px',
                            background: '#F56565',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Delete Product
                    </button>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => router.push('/dashboard/products')}
                            style={{
                                padding: '12px 24px',
                                background: 'white',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={saving || !name || !price}
                            style={{
                                padding: '12px 24px',
                                background: saving || !name || !price ? '#CBD5E0' : '#2B5FA5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: saving || !name || !price ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
