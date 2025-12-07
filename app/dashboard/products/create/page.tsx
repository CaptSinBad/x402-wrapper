'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
    id: string;
    store_name: string;
    store_slug: string;
}

export default function CreateProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [stores, setStores] = useState<Store[]>([]);
    const [loadingStores, setLoadingStores] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        currency: 'USDC',
        images: [] as string[],
        store_id: ''
    });

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            // Note: You'll need to create this API endpoint
            // For now, we'll make store_id optional
            setLoadingStores(false);
        } catch (error) {
            console.error('Error fetching stores:', error);
            setLoadingStores(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload: any = {
                name: formData.name,
                description: formData.description,
                price_cents: Math.round(parseFloat(formData.price) * 100),
                currency: formData.currency,
                images: formData.images
            };

            // Include store_id if selected
            if (formData.store_id) {
                payload.store_id = formData.store_id;
            }

            const response = await fetch('/api/products/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create product');
            }

            router.push('/dashboard/products');
        } catch (error: any) {
            console.error('Error creating product:', error);
            alert(error.message || 'Failed to create product');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // In production, upload to cloud storage (S3, Cloudinary, etc.)
        // For now, we'll use placeholder URLs
        const newImages = Array.from(files).map((file, i) =>
            URL.createObjectURL(file) // Temporary - replace with actual upload
        );

        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...newImages]
        }));
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Create Product</h1>
            <p style={{ color: '#718096', marginBottom: '32px' }}>
                Add a new product to your catalog
            </p>

            <form onSubmit={handleSubmit}>
                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '32px' }}>

                    {/* Product Name */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                            Product Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Premium Subscription"
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
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what customers will get..."
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

                    {/* Price & Currency */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                Price *
                            </label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                placeholder="10.00"
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
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    fontSize: '15px'
                                }}
                            >
                                <option value="USDC">USDC</option>
                                <option value="USDT">USDT</option>
                            </select>
                        </div>
                    </div>

                    {/* Images */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                            Product Images
                        </label>

                        {formData.images.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                {formData.images.map((img, i) => (
                                    <div key={i} style={{ position: 'relative' }}>
                                        <img
                                            src={img}
                                            alt={`Product ${i + 1}`}
                                            style={{
                                                width: '100%',
                                                height: '150px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                border: '1px solid #E2E8F0'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(i)}
                                            style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px',
                                                background: 'rgba(0,0,0,0.7)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '24px',
                                                height: '24px',
                                                cursor: 'pointer',
                                                fontSize: '16px'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <label
                            style={{
                                display: 'block',
                                padding: '32px',
                                border: '2px dashed #E2E8F0',
                                borderRadius: '8px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2B5FA5'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                            <div style={{ fontSize: '14px', color: '#718096' }}>
                                Click to upload images
                            </div>
                            <div style={{ fontSize: '12px', color: '#A0AEC0', marginTop: '4px' }}>
                                JPG, PNG up to 5MB
                            </div>
                        </label>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #E2E8F0' }}>
                        <button
                            type="button"
                            onClick={() => router.back()}
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
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '12px 24px',
                                background: loading ? '#CBD5E0' : '#2B5FA5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Creating...' : 'Create Product'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
