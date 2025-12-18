'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
    id: string;
    store_name: string;
    store_slug: string;
    description: string;
    logo_url: string;
    banner_url: string;
    theme_color: string;
    url: string;
}

export default function StoreSetupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [existingStore, setExistingStore] = useState<Store | null>(null);
    const [formData, setFormData] = useState({
        store_name: '',
        description: '',
        logo_url: '',
        banner_url: '',
        theme_color: '#2B5FA5'
    });

    const isEditing = Boolean(existingStore);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = isEditing ? `/api/stores/${existingStore!.id}` : '/api/stores/create';
            const method = isEditing ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                alert(`Error: ${data.error || response.statusText}`);
                setLoading(false);
                return;
            }

            // Success! Show store URL and redirect
            const storeUrl = `${window.location.origin}/s/${data.store.store_slug}`;
            if (confirm(`Store ${isEditing ? 'updated' : 'created'} successfully!\n\nYour store is live at:\n${storeUrl}\n\nClick OK to view it now, or Cancel to add products.`)) {
                window.open(storeUrl, '_blank');
            }
            router.push('/dashboard/products');
        } catch (error) {
            console.error('Failed to save store:', error);
            alert('Failed to save store');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
                    {isEditing ? 'Edit Store' : 'Create Your Store'}
                </h1>
                <p style={{ color: '#718096' }}>
                    {isEditing
                        ? 'Update your store settings'
                        : 'Set up your online store in minutes'
                    }
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Store Name */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '8px'
                    }}>
                        Store Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.store_name}
                        onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                        placeholder="My Awesome Store"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '15px'
                        }}
                    />
                    {formData.store_name.length > 0 && (
                        <p style={{
                            fontSize: '13px',
                            color: '#718096',
                            marginTop: '6px'
                        }}>
                            Your store will be available at: <strong>
                                {window.location.origin}/s/{formData.store_name
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, '-')
                                    .replace(/^-+|-+$/g, '')}
                            </strong>
                        </p>
                    )}
                </div>

                {/* Description */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '8px'
                    }}>
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Tell customers what makes your store special..."
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Logo URL */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '8px'
                    }}>
                        Logo URL
                    </label>
                    <input
                        type="url"
                        value={formData.logo_url}
                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '15px'
                        }}
                    />
                    <p style={{ fontSize: '13px', color: '#718096', marginTop: '6px' }}>
                        Optional: Direct URL to your logo image
                    </p>
                </div>

                {/* Banner URL */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '8px'
                    }}>
                        Banner URL
                    </label>
                    <input
                        type="url"
                        value={formData.banner_url}
                        onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                        placeholder="https://example.com/banner.jpg"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '15px'
                        }}
                    />
                    <p style={{ fontSize: '13px', color: '#718096', marginTop: '6px' }}>
                        Optional: Direct URL to your banner image (recommended: 1200x400px)
                    </p>
                </div>

                {/* Theme Color */}
                <div style={{ marginBottom: '32px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '8px'
                    }}>
                        Theme Color
                    </label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={formData.theme_color}
                            onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                            style={{
                                width: '60px',
                                height: '40px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        />
                        <input
                            type="text"
                            value={formData.theme_color}
                            onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                            pattern="^#[0-9A-Fa-f]{6}$"
                            placeholder="#2B5FA5"
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                fontSize: '15px'
                            }}
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !formData.store_name.trim()}
                    style={{
                        padding: '14px 32px',
                        background: formData.store_name.trim() ? '#2B5FA5' : '#CBD5E0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: formData.store_name.trim() ? 'pointer' : 'not-allowed',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Saving...' : isEditing ? 'Update Store' : 'Create Store'}
                </button>
            </form>
        </div>
    );
}
