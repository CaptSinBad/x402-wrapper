'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthToken } from '@/app/hooks/useAuthToken';
import Link from 'next/link';

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
    const { authFetch } = useAuthToken();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [createdStore, setCreatedStore] = useState<Store | null>(null);
    const [formData, setFormData] = useState({
        store_name: '',
        description: '',
        logo_url: '',
        banner_url: '',
        theme_color: '#2B5FA5'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authFetch('/api/stores/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                alert(`Error: ${data.error || response.statusText}`);
                setLoading(false);
                return;
            }

            setCreatedStore(data.store);
            setSuccess(true);
        } catch (error) {
            console.error('Failed to create store:', error);
            alert('Failed to create store');
            setLoading(false);
        }
    };

    const copyStoreUrl = () => {
        if (createdStore) {
            navigator.clipboard.writeText(createdStore.url);
        }
    };

    // Success Screen (Stripe-style)
    if (success && createdStore) {
        return (
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
                <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-12">
                    {/* Success Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>

                    {/* Heading */}
                    <h1 className="text-3xl font-bold text-center text-zinc-900 mb-3">
                        Store Created Successfully!
                    </h1>
                    <p className="text-center text-zinc-600 mb-8">
                        Your store is now live. Complete the setup by adding categories and products.
                    </p>

                    {/* Store URL Card */}
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
                                Store URL
                            </span>
                            <button
                                onClick={copyStoreUrl}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Copy
                            </button>
                        </div>
                        <a
                            href={createdStore.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-mono text-sm break-all underline"
                        >
                            {createdStore.url}
                        </a>
                    </div>

                    {/* Next Steps */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                        <h3 className="text-lg font-semibold text-zinc-900 mb-3">Next Steps</h3>
                        <ol className="space-y-2 text-zinc-700">
                            <li className="flex items-start">
                                <span className="font-bold mr-2">1.</span>
                                <span>Add product categories to organize your inventory</span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-bold mr-2">2.</span>
                                <span>Create your first product with pricing and images</span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-bold mr-2">3.</span>
                                <span>Preview your store and start selling</span>
                            </li>
                        </ol>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <Link
                            href="/dashboard/store/categories"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
                        >
                            Add Categories →
                        </Link>
                        <a
                            href={createdStore.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold py-3 px-6 rounded-lg text-center transition-colors"
                        >
                            View Store
                        </a>
                    </div>

                    {/* Skip Link */}
                    <div className="text-center mt-6">
                        <Link
                            href="/dashboard/products"
                            className="text-sm text-zinc-500 hover:text-zinc-700"
                        >
                            Skip to products →
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Create Store Form
    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Create Your Store
                </h1>
                <p className="text-zinc-400">
                    Set up your online store in minutes
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Store Name */}
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                        Store Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.store_name}
                        onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                        placeholder="My Awesome Store"
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.store_name.length > 0 && (
                        <p className="text-sm text-zinc-400 mt-2">
                            Store URL: <span className="font-mono text-blue-400">
                                {window.location.origin}/s/{formData.store_name
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, '-')
                                    .replace(/^-+|-+$/g, '')}
                            </span>
                        </p>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Tell customers what makes your store special..."
                        rows={4}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                </div>

                {/* Logo URL */}
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                        Logo URL
                    </label>
                    <input
                        type="url"
                        value={formData.logo_url}
                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Optional: Direct URL to your logo image</p>
                </div>

                {/* Banner URL */}
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                        Banner URL
                    </label>
                    <input
                        type="url"
                        value={formData.banner_url}
                        onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                        placeholder="https://example.com/banner.jpg"
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Optional: Banner image (recommended: 1200x400px)</p>
                </div>

                {/* Theme Color */}
                <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                        Theme Color
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="color"
                            value={formData.theme_color}
                            onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                            className="w-16 h-12 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer"
                        />
                        <input
                            type="text"
                            value={formData.theme_color}
                            onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                            pattern="^#[0-9A-Fa-f]{6}$"
                            placeholder="#2B5FA5"
                            className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !formData.store_name.trim()}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                    {loading ? 'Creating Store...' : 'Create Store'}
                </button>
            </form>
        </div>
    );
}
