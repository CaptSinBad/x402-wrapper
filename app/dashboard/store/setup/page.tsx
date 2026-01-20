'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Folder, Loader2, Store, Check, Copy, ExternalLink, Settings, Layers, Package } from 'lucide-react';
import { useAuthToken } from '@/app/hooks/useAuthToken';
import Link from 'next/link';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter
} from '@/app/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/app/components/ui/table';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StoreData {
    id: string;
    store_name: string;
    store_slug: string;
    description: string;
    logo_url: string;
    banner_url: string;
    theme_color: string;
    url: string;
}

interface Category {
    id: string;
    name: string;
    slug: string;
    description: string;
    display_order: number;
    active: boolean;
    product_count: number;
}

export default function StoreSettingsPage() {
    const { authFetch } = useAuthToken();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'general' | 'categories'>('general');
    const [store, setStore] = useState<StoreData | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingStore, setIsCreatingStore] = useState(false);
    const [copied, setCopied] = useState(false);

    // Store form data
    const [storeForm, setStoreForm] = useState({
        store_name: '',
        description: '',
        logo_url: '',
        banner_url: '',
        theme_color: '#2B5FA5'
    });

    // Category sheet
    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
    const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        description: '',
        display_order: 0
    });

    useEffect(() => {
        fetchStore();
    }, []);

    useEffect(() => {
        if (store?.id) {
            fetchCategories();
        }
    }, [store?.id]);

    const fetchStore = async () => {
        try {
            const response = await authFetch('/api/stores/my-store');
            const data = await response.json();

            if (response.ok && data.store) {
                setStore(data.store);
                setStoreForm({
                    store_name: data.store.store_name || '',
                    description: data.store.description || '',
                    logo_url: data.store.logo_url || '',
                    banner_url: data.store.banner_url || '',
                    theme_color: data.store.theme_color || '#2B5FA5'
                });
            }
        } catch (error) {
            console.error('Failed to fetch store:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        if (!store?.id) return;

        try {
            const response = await authFetch(`/api/stores/${store.id}/categories/list`);
            const data = await response.json();

            if (response.ok) {
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const handleCreateStore = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingStore(true);

        try {
            const response = await authFetch('/api/stores/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(storeForm)
            });

            const data = await response.json();

            if (!response.ok) {
                alert(`Error: ${data.error || response.statusText}`);
                return;
            }

            setStore(data.store);
            setActiveTab('categories'); // Automatically switch to categories
        } catch (error) {
            console.error('Failed to create store:', error);
            alert('Failed to create store');
        } finally {
            setIsCreatingStore(false);
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!store?.id) return;
        setIsSubmittingCategory(true);

        try {
            const response = await authFetch(`/api/stores/${store.id}/categories/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryForm)
            });

            const data = await response.json();

            if (!response.ok) {
                alert(`Error: ${data.error || response.statusText}`);
                return;
            }

            setCategoryForm({ name: '', description: '', display_order: 0 });
            setIsCategorySheetOpen(false);
            fetchCategories();
        } catch (error) {
            console.error('Failed to create category:', error);
            alert('Failed to create category');
        } finally {
            setIsSubmittingCategory(false);
        }
    };

    const copyStoreUrl = () => {
        if (store?.url) {
            navigator.clipboard.writeText(store.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="space-y-8 p-6">
                <Skeleton className="h-8 w-48 bg-zinc-800" />
                <Skeleton className="h-[400px] w-full rounded-xl bg-zinc-800" />
            </div>
        );
    }

    // No store yet - show creation form
    if (!store) {
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
                        <form onSubmit={handleCreateStore} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="store_name" className="text-white">Store Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="store_name"
                                    type="text"
                                    required
                                    value={storeForm.store_name}
                                    onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                                    placeholder="My Awesome Store"
                                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-white">Description</Label>
                                <Textarea
                                    id="description"
                                    value={storeForm.description}
                                    onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                                    placeholder="Tell customers what makes your store special..."
                                    rows={3}
                                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="theme_color" className="text-white">Theme Color</Label>
                                <div className="flex gap-3">
                                    <div className="h-10 w-16 relative overflow-hidden rounded-md border border-zinc-700">
                                        <input
                                            type="color"
                                            id="theme_color"
                                            value={storeForm.theme_color}
                                            onChange={(e) => setStoreForm({ ...storeForm, theme_color: e.target.value })}
                                            className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 p-0 border-0 cursor-pointer"
                                        />
                                    </div>
                                    <Input
                                        type="text"
                                        value={storeForm.theme_color}
                                        onChange={(e) => setStoreForm({ ...storeForm, theme_color: e.target.value })}
                                        className="flex-1 bg-zinc-800 border-zinc-700 text-white font-mono"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isCreatingStore || !storeForm.store_name.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                size="lg"
                            >
                                {isCreatingStore ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Store...</>
                                ) : (
                                    'Create Store'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Store exists - show settings with tabs
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Store Settings</h1>
                    <p className="text-zinc-400">Manage your store and categories</p>
                </div>
                <Button
                    variant="outline"
                    onClick={copyStoreUrl}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy Store URL'}
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('general')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                        activeTab === 'general'
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-400 hover:text-white"
                    )}
                >
                    <Settings className="h-4 w-4" />
                    General
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                        activeTab === 'categories'
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-400 hover:text-white"
                    )}
                >
                    <Layers className="h-4 w-4" />
                    Categories
                    {categories.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-zinc-700 rounded-full text-xs">
                            {categories.length}
                        </span>
                    )}
                </button>
            </div>

            {/* General Tab */}
            {activeTab === 'general' && (
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle className="text-zinc-100">Store Information</CardTitle>
                        <CardDescription>Update your store details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Store URL Display */}
                        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-zinc-400">Store URL</span>
                                <a
                                    href={store.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                                >
                                    Visit <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            <code className="text-sm text-zinc-300 font-mono">{store.url}</code>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Store Name</Label>
                            <Input
                                value={storeForm.store_name}
                                onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Description</Label>
                            <Textarea
                                value={storeForm.description}
                                onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                                className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Theme Color</Label>
                            <div className="flex gap-3">
                                <div className="h-10 w-16 relative overflow-hidden rounded-md border border-zinc-700">
                                    <input
                                        type="color"
                                        value={storeForm.theme_color}
                                        onChange={(e) => setStoreForm({ ...storeForm, theme_color: e.target.value })}
                                        className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 p-0 border-0 cursor-pointer"
                                    />
                                </div>
                                <Input
                                    value={storeForm.theme_color}
                                    onChange={(e) => setStoreForm({ ...storeForm, theme_color: e.target.value })}
                                    className="flex-1 bg-zinc-800 border-zinc-700 text-white font-mono"
                                />
                            </div>
                        </div>

                        <Button
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-500"
                        >
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setIsCategorySheetOpen(true)}
                                className="bg-blue-600 hover:bg-blue-500 text-white"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add Category
                            </Button>
                        </div>
                        {categories.length > 0 && (
                            <Button
                                asChild
                                variant="outline"
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            >
                                <Link href="/dashboard/products/create">
                                    <Package className="mr-2 h-4 w-4" /> Add Product
                                </Link>
                            </Button>
                        )}
                    </div>

                    {categories.length === 0 ? (
                        <Card className="border-dashed border-zinc-800 bg-zinc-900/20 text-center py-16">
                            <CardContent className="space-y-6">
                                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                                    <Folder className="w-10 h-10 text-zinc-500" />
                                </div>
                                <div className="space-y-2">
                                    <CardTitle className="text-xl text-zinc-100">No categories yet</CardTitle>
                                    <CardDescription className="text-lg text-zinc-400">
                                        Create your first category to start organizing your store.
                                    </CardDescription>
                                </div>
                                <Button
                                    onClick={() => setIsCategorySheetOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-500"
                                >
                                    Create Category
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-zinc-900 border-zinc-800">
                                        <TableRow className="border-zinc-800">
                                            <TableHead className="text-zinc-400">Name</TableHead>
                                            <TableHead className="text-zinc-400">Description</TableHead>
                                            <TableHead className="text-right text-zinc-400">Products</TableHead>
                                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categories.map((category) => (
                                            <TableRow key={category.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                                <TableCell className="font-medium text-white">
                                                    {category.name}
                                                </TableCell>
                                                <TableCell className="text-zinc-400 max-w-[200px] truncate">
                                                    {category.description || '—'}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-zinc-300">
                                                    {category.product_count}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            asChild
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                                        >
                                                            <Link href={`/dashboard/products/create?category=${category.id}`}>
                                                                <Plus className="h-3 w-3 mr-1" /> Add Product
                                                            </Link>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Next Steps CTA */}
                            <Card className="bg-green-500/10 border-green-500/30">
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500/20 rounded-lg">
                                                <Package className="w-5 h-5 text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">Ready to add products!</p>
                                                <p className="text-zinc-400 text-sm">Start adding products to your categories</p>
                                            </div>
                                        </div>
                                        <Button asChild className="bg-green-600 hover:bg-green-500">
                                            <Link href="/dashboard/products/create">
                                                <Plus className="mr-2 h-4 w-4" /> Create Product
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {/* Category Creation Sheet */}
            <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
                <SheetContent className="bg-zinc-950 border-l border-zinc-800 sm:max-w-md">
                    <SheetHeader className="text-left mb-6">
                        <SheetTitle className="text-zinc-100">New Category</SheetTitle>
                        <SheetDescription className="text-zinc-400">
                            Create a new category to group your products.
                        </SheetDescription>
                    </SheetHeader>

                    <form id="create-category-form" onSubmit={handleCreateCategory} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cat-name" className="text-zinc-300">Name</Label>
                                <Input
                                    id="cat-name"
                                    required
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Electronics"
                                    className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cat-description" className="text-zinc-300">Description</Label>
                                <Textarea
                                    id="cat-description"
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Optional description..."
                                    className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-600 min-h-[100px]"
                                />
                            </div>
                        </div>
                    </form>

                    <SheetFooter className="mt-8">
                        <Button
                            type="submit"
                            form="create-category-form"
                            disabled={isSubmittingCategory || !categoryForm.name}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            {isSubmittingCategory ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                            ) : (
                                'Create Category'
                            )}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
