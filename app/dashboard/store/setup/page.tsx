'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthToken } from '@/app/hooks/useAuthToken';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Check, Copy, ExternalLink, ArrowRight, Store } from 'lucide-react';
import { cn } from '@/lib/utils'; // Although not explicitly used in JSX, good to have available

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
                alert(`Error: ${data.error || response.statusText}`); // Should use toast in future
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
            // Could add toast here
        }
    };

    // Success Screen
    if (success && createdStore) {
        return (
            <div className="min-h-dvh bg-background flex items-center justify-center p-6">
                <Card className="max-w-2xl w-full shadow-2xl border-border">
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold text-balance">Store Created Successfully!</CardTitle>
                        <CardDescription className="text-balance text-lg mt-2">
                            Your store is now live. Complete the setup by adding categories and products.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Store URL Card */}
                        <div className="bg-muted/50 border border-border rounded-xl p-6">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    Store URL
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={copyStoreUrl}
                                    className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                </Button>
                            </div>
                            <a
                                href={createdStore.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-blue-600 hover:text-blue-700 font-mono text-sm break-all underline decoration-blue-600/30 hover:decoration-blue-600"
                            >
                                {createdStore.url}
                                <ExternalLink className="ml-2 h-3 w-3 inline" />
                            </a>
                        </div>

                        {/* Next Steps */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                            <h3 className="text-lg font-semibold mb-3 text-foreground">Next Steps</h3>
                            <ol className="space-y-3 text-muted-foreground">
                                <li className="flex items-start">
                                    <span className="font-bold mr-2 text-primary">1.</span>
                                    <span>Add product categories to organize your inventory</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="font-bold mr-2 text-primary">2.</span>
                                    <span>Create your first product with pricing and images</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="font-bold mr-2 text-primary">3.</span>
                                    <span>Preview your store and start selling</span>
                                </li>
                            </ol>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button
                                asChild
                                size="lg"
                                className="flex-1"
                            >
                                <Link href="/dashboard/store/categories">
                                    Add Categories <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="secondary"
                                size="lg"
                                className="flex-1"
                            >
                                <a
                                    href={createdStore.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    View Store <ExternalLink className="ml-2 h-4 w-4" />
                                </a>
                            </Button>
                        </div>

                        {/* Skip Link */}
                        <div className="text-center">
                            <Link
                                href="/dashboard/products"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Skip to products →
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Create Store Form
    return (
        <div className="p-6 max-w-2xl mx-auto space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                    Create Your Store
                </h1>
                <p className="text-zinc-400">
                    Set up your online store in minutes
                </p>
            </div>

            <Card className="border-zinc-800 bg-zinc-900/50">
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Store Name */}
                        <div className="space-y-2">
                            <Label htmlFor="store_name" className="text-white">Store Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="store_name"
                                type="text"
                                required
                                value={formData.store_name}
                                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                                placeholder="My Awesome Store"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500"
                            />
                            {formData.store_name.length > 0 && (
                                <p className="text-sm text-zinc-400">
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
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-white">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Tell customers what makes your store special..."
                                rows={4}
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500 min-h-[100px]"
                            />
                        </div>

                        {/* Logo URL */}
                        <div className="space-y-2">
                            <Label htmlFor="logo_url" className="text-white">Logo URL</Label>
                            <Input
                                id="logo_url"
                                type="url"
                                value={formData.logo_url}
                                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                placeholder="https://example.com/logo.png"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500"
                            />
                            <p className="text-xs text-zinc-500">Optional: Direct URL to your logo image</p>
                        </div>

                        {/* Banner URL */}
                        <div className="space-y-2">
                            <Label htmlFor="banner_url" className="text-white">Banner URL</Label>
                            <Input
                                id="banner_url"
                                type="url"
                                value={formData.banner_url}
                                onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                                placeholder="https://example.com/banner.jpg"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500"
                            />
                            <p className="text-xs text-zinc-500">Optional: Banner image (recommended: 1200x400px)</p>
                        </div>

                        {/* Theme Color */}
                        <div className="space-y-2">
                            <Label htmlFor="theme_color" className="text-white">Theme Color</Label>
                            <div className="flex gap-3">
                                <div className="h-10 w-16 relative overflow-hidden rounded-md border border-zinc-700">
                                    <input
                                        type="color"
                                        id="theme_color"
                                        value={formData.theme_color}
                                        onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                                        className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 p-0 border-0 cursor-pointer"
                                    />
                                </div>
                                <Input
                                    type="text"
                                    value={formData.theme_color}
                                    onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                                    pattern="^#[0-9A-Fa-f]{6}$"
                                    placeholder="#2B5FA5"
                                    className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500 font-mono"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !formData.store_name.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            size="lg"
                        >
                            {loading ? 'Creating Store...' : 'Create Store'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
