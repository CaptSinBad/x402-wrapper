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
    const [categories, setCategories] = useState<any[]>([]);
    const [loadingStores, setLoadingStores] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        currency: 'USDC',
        images: [] as string[],
        store_id: '',
        category_id: ''
    });

    useEffect(() => {
        fetchStores();
    }, []);

    useEffect(() => {
        if (formData.store_id) {
            fetchCategories();
        }
    }, [formData.store_id]);

    const fetchStores = async () => {
        try {
            // For now we'll get store_id from URL or use API to fetch user's stores
            // Simplified: we'll make it optional for now
            setLoadingStores(false);
        } catch (error) {
            console.error('Error fetching stores:', error);
            setLoadingStores(false);
        }
    };

    const fetchCategories = async () => {
        if (!formData.store_id) return;

        try {
            const response = await fetch(`/api/stores/${formData.store_id}/categories/list`);
            const data = await response.json();

            if (response.ok) {
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
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

            // Include category_id if selected
            if (formData.category_id) {
                payload.category_id = formData.category_id;
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
        <div className="max-w-4xl mx-auto p-6 lg:p-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Create Product</h1>
                <p className="text-zinc-400">
                    Add a new product to your catalog
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 lg:p-8 space-y-8">

                    {/* Basic Info Section */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                            Basic Information
                        </h2>

                        {/* Product Name */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Premium Subscription"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe what customers will get..."
                                rows={4}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y min-h-[120px]"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-zinc-800" />

                    {/* Pricing Section */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <span className="w-1 h-6 bg-green-500 rounded-full"></span>
                            Pricing
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Price <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-zinc-500">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        min="0"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Currency
                                </label>
                                <div className="relative">
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                    >
                                        <option value="USDC">USDC</option>
                                        <option value="USDT">USDT</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-500">
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Section */}
                    {formData.store_id && (
                        <>
                            <div className="h-px bg-zinc-800" />
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                                    Organization
                                </h2>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Category
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                            className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                        >
                                            <option value="">No category</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name} ({cat.product_count} products)
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-500">
                                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-2">
                                        Optional: Organize product into a category for better discovery
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="h-px bg-zinc-800" />

                    {/* Images Section */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                            Media
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-4">
                                Product Images
                            </label>

                            {formData.images.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                                    {formData.images.map((img, i) => (
                                        <div key={i} className="relative group aspect-square">
                                            <img
                                                src={img}
                                                alt={`Product ${i + 1}`}
                                                className="w-full h-full object-cover rounded-xl border border-zinc-800"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(i)}
                                                    className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors transform hover:scale-110"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <label className="group block relative border-2 border-dashed border-zinc-800 hover:border-blue-500 hover:bg-zinc-900/50 rounded-xl p-8 text-center cursor-pointer transition-all duration-200">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <div className="space-y-3">
                                    <div className="w-12 h-12 bg-zinc-900 group-hover:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto transition-colors">
                                        <svg className="w-6 h-6 text-zinc-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-zinc-300 font-medium">Click to upload images</p>
                                        <p className="text-zinc-500 text-sm mt-1">JPG, PNG up to 5MB</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg font-medium transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {loading ? 'Creating...' : 'Create Product'}
                    </button>
                </div>
            </form>
        </div>
    );
}
