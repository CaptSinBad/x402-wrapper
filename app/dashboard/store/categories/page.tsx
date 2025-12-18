'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Category {
    id: string;
    name: string;
    slug: string;
    description: string;
    display_order: number;
    active: boolean;
    product_count: number;
}

export default function CategoriesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const storeId = searchParams?.get('store_id');

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        display_order: 0
    });

    useEffect(() => {
        if (storeId) {
            fetchCategories();
        }
    }, [storeId]);

    const fetchCategories = async () => {
        if (!storeId) return;

        try {
            const response = await fetch(`/api/stores/${storeId}/categories/list`);
            const data = await response.json();

            if (response.ok) {
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId) return;

        try {
            const response = await fetch(`/api/stores/${storeId}/categories/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                alert(`Error: ${data.error || response.statusText}`);
                return;
            }

            setFormData({ name: '', description: '', display_order: 0 });
            setShowCreateForm(false);
            fetchCategories();
        } catch (error) {
            console.error('Failed to create category:', error);
            alert('Failed to create category');
        }
    };

    if (!storeId) {
        return (
            <div style={{ padding: '24px' }}>
                <p style={{ color: '#E53E3E' }}>Error: No store ID provided. Please create a store first.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: '#718096' }}>Loading categories...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Categories</h1>
                    <p style={{ color: '#718096' }}>
                        {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    style={{
                        padding: '12px 24px',
                        background: showCreateForm ? '#E2E8F0' : '#2B5FA5',
                        color: showCreateForm ? '#2D3748' : 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    {showCreateForm ? 'Cancel' : '+ Add Category'}
                </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px'
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>New Category</h2>
                    <form onSubmit={handleCreate}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Electronics"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    fontSize: '15px'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional description..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
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
                            Create Category
                        </button>
                    </form>
                </div>
            )}

            {/* Categories List */}
            {categories.length === 0 ? (
                <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '64px 24px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                        No categories yet
                    </h2>
                    <p style={{ color: '#718096' }}>
                        Create categories to organize your products
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {categories.map((category) => (
                        <div
                            key={category.id}
                            style={{
                                background: 'white',
                                border: '1px solid #E2E8F0',
                                borderRadius: '12px',
                                padding: '20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                                        {category.name}
                                    </h3>
                                    <span style={{
                                        padding: '4px 12px',
                                        background: '#EDF2F7',
                                        color: '#4A5568',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        fontWeight: '600'
                                    }}>
                                        {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
                                    </span>
                                </div>
                                {category.description && (
                                    <p style={{ color: '#718096', fontSize: '14px' }}>
                                        {category.description}
                                    </p>
                                )}
                                <p style={{ color: '#A0AEC0', fontSize: '13px', marginTop: '4px' }}>
                                    Slug: {category.slug}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    style={{
                                        padding: '8px 16px',
                                        background: '#F7FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
