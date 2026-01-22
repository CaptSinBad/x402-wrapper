'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ArrowLeft, Loader2, ShoppingCart } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';

interface CartItem {
    productId: string;
    name: string;
    price_cents: number;
    currency: string;
    image: string | null;
    quantity: number;
}

interface Cart {
    storeSlug: string;
    items: CartItem[];
}

export default function CartPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const [cart, setCart] = useState<Cart>({ storeSlug: slug, items: [] });
    const [loading, setLoading] = useState(false);
    const [pageLoaded, setPageLoaded] = useState(false);

    useEffect(() => {
        loadCart();
        setPageLoaded(true);
    }, []);

    const loadCart = () => {
        if (typeof window === 'undefined') return;
        const cartData = localStorage.getItem('cart');
        if (cartData) {
            const parsedCart = JSON.parse(cartData);
            setCart(parsedCart);
        }
    };

    const updateQuantity = (productId: string, newQuantity: number) => {
        if (newQuantity < 1) return;

        const updatedCart = {
            ...cart,
            items: cart.items.map(item =>
                item.productId === productId
                    ? { ...item, quantity: newQuantity }
                    : item
            )
        };

        setCart(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
    };

    const removeItem = (productId: string) => {
        const updatedCart = {
            ...cart,
            items: cart.items.filter(item => item.productId !== productId)
        };

        setCart(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
    };

    const calculateSubtotal = () => {
        return cart.items.reduce((total, item) => total + (item.price_cents * item.quantity), 0);
    };

    const calculatePlatformFee = (subtotal: number) => {
        return Math.ceil(subtotal * 0.01); // 1% fee, round up
    };

    const handleCheckout = async () => {
        if (cart.items.length === 0) return;

        setLoading(true);

        try {
            // Create checkout session using public API (no auth required for customers)
            const response = await fetch('/api/checkout/public/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    store_slug: slug,
                    line_items: cart.items.map(item => ({
                        product_id: item.productId,
                        quantity: item.quantity
                    })),
                    success_url: `${window.location.origin}/s/${slug}?checkout=success`,
                    cancel_url: `${window.location.origin}/s/${slug}/cart`
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(`Error: ${data.error || response.statusText}`);
                setLoading(false);
                return;
            }

            // Clear cart
            localStorage.removeItem('cart');

            // Redirect to checkout
            router.push(data.url);
        } catch (error) {
            console.error('Checkout failed:', error);
            alert('Failed to create checkout session');
            setLoading(false);
        }
    };

    const subtotal = calculateSubtotal();
    const platformFee = calculatePlatformFee(subtotal);
    const total = subtotal + platformFee;

    if (!pageLoaded) {
        return (
            <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Skeleton className="h-12 w-48" />
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-4">
                            {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                        </div>
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            {/* Header */}
            <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <Button asChild variant="ghost" size="sm" className="-ml-3 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                        <Link href={`/s/${slug}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Continue Shopping
                        </Link>
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                    <ShoppingCart className="w-8 h-8" />
                    Shopping Cart
                </h1>

                {cart.items.length === 0 ? (
                    <Card className="text-center py-20 bg-white dark:bg-zinc-900 border-dashed">
                        <CardContent className="space-y-6">
                            <div className="text-6xl mx-auto w-fit bg-zinc-100 dark:bg-zinc-800 p-6 rounded-full">🛒</div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold">Your cart is empty</h2>
                                <p className="text-zinc-500 max-w-sm mx-auto">
                                    Looks like you haven't added anything to your cart yet.
                                </p>
                            </div>
                            <Button asChild size="lg">
                                <Link href={`/s/${slug}`}>Browse Products</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-3 gap-8 items-start">
                        {/* Cart Items List */}
                        <div className="md:col-span-2 space-y-4">
                            {cart.items.map((item) => (
                                <Card key={item.productId} className="flex flex-col sm:flex-row p-4 gap-4 items-center bg-white dark:bg-zinc-900">
                                    <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden flex-shrink-0">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                                        )}
                                    </div>

                                    <div className="flex-1 text-center sm:text-left space-y-1">
                                        <h3 className="font-semibold text-lg">{item.name}</h3>
                                        <p className="text-blue-600 dark:text-blue-400 font-mono font-medium">
                                            ${(item.price_cents / 100).toFixed(2)} {item.currency}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3 items-center sm:items-end w-full sm:w-auto">
                                        <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center font-mono font-medium">{item.quantity}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="font-bold text-lg">
                                                ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => removeItem(item.productId)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div className="sticky top-24">
                            <Card className="bg-white dark:bg-zinc-900 shadow-lg border-zinc-200 dark:border-zinc-800">
                                <CardHeader>
                                    <CardTitle>Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                                        <span>Subtotal</span>
                                        <span className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                                            ${(subtotal / 100).toFixed(2)} USDC
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                                        <span>Service Fee (1%)</span>
                                        <span className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                                            ${(platformFee / 100).toFixed(2)} USDC
                                        </span>
                                    </div>
                                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-end">
                                        <span className="font-bold text-lg">Total</span>
                                        <span className="font-bold text-xl text-blue-600 dark:text-blue-400 font-mono">
                                            ${(total / 100).toFixed(2)} USDC
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex-col gap-4">
                                    <Button
                                        className="w-full py-6 text-lg"
                                        onClick={handleCheckout}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            'Proceed to Checkout'
                                        )}
                                    </Button>
                                    <p className="text-xs text-center text-zinc-500">
                                        Powered by BinahPay — Secure crypto payments
                                    </p>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
