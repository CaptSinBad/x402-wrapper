'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Folder, Loader2 } from 'lucide-react';
import { useAuthToken } from '@/app/hooks/useAuthToken';

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
    const { authFetch } = useAuthToken();
    const router = useRouter();

    const [storeId, setStoreId] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        display_order: 0
    });

    // Fetch user's store on mount
    useEffect(() => {
        fetchUserStore();
    }, []);

    // Fetch categories when store is loaded
    useEffect(() => {
        if (storeId) {
            fetchCategories();
        }
    }, [storeId]);

    const fetchUserStore = async () => {
        try {
            const response = await authFetch('/api/stores/my-store');
            const data = await response.json();

            if (response.ok && data.store) {
                setStoreId(data.store.id);
            } else {
                // No store found, redirect to create one
                router.push('/dashboard/store/setup');
            }
        } catch (error) {
            console.error('Failed to fetch store:', error);
        }
    };

    const fetchCategories = async () => {
        if (!storeId) return;

        try {
            const response = await authFetch(`/api/stores/${storeId}/categories/list`);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId) return;
        setIsSubmitting(true);

        try {
            const response = await authFetch(`/api/stores/${storeId}/categories/create`, {
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
            setIsSheetOpen(false);
            fetchCategories();
        } catch (error) {
            console.error('Failed to create category:', error);
            alert('Failed to create category');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48 bg-zinc-800" />
                    <Skeleton className="h-10 w-32 bg-zinc-800" />
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl bg-zinc-800" />
            </div>
        );
    }

    if (!storeId) {
        // Should have redirected, but just in case
        return null;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Categories</h1>
                    <p className="text-zinc-400">Organize your products into categories</p>
                </div>
                <Button
                    onClick={() => setIsSheetOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
            </div>

            {categories.length === 0 ? (
                <Card className="border-dashed border-zinc-800 bg-zinc-900/20 text-center py-16">
                    <CardContent className="space-y-6">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                            <Folder className="w-10 h-10 text-zinc-500" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-xl">No categories yet</CardTitle>
                            <CardDescription className="text-lg">
                                Create your first category to start organizing your store.
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setIsSheetOpen(true)}
                            className="text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                        >
                            Create Category
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-zinc-900 border-zinc-800">
                            <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                                <TableHead className="text-zinc-400">Name</TableHead>
                                <TableHead className="text-zinc-400">Description</TableHead>
                                <TableHead className="text-zinc-400">Slug</TableHead>
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
                                    <TableCell className="text-zinc-400 max-w-[300px] truncate">
                                        {category.description || '—'}
                                    </TableCell>
                                    <TableCell className="text-zinc-500 font-mono text-xs">
                                        {category.slug}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-zinc-300">
                                        {category.product_count}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
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
            )}

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="bg-zinc-950 border-l border-zinc-800 sm:max-w-md">
                    <SheetHeader className="text-left mb-6">
                        <SheetTitle className="text-zinc-100">New Category</SheetTitle>
                        <SheetDescription className="text-zinc-400">
                            Create a new category to group your products.
                        </SheetDescription>
                    </SheetHeader>

                    <form id="create-category-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-zinc-300">Name</Label>
                                <Input
                                    id="name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Electronics"
                                    className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-zinc-300">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                            disabled={isSubmitting || !formData.name}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                                </>
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
