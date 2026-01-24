'use client';

import { cn } from '@/lib/utils';

interface OrderSummaryCardProps {
    lineItems: Array<{
        name: string;
        description?: string;
        quantity: number;
        price_cents: number;
        total_cents: number;
        images?: string[];
    }>;
    subtotalCents: number;
    feeCents: number;
    totalCents: number;
    currency: string;
    className?: string;
}

export function OrderSummaryCard({
    lineItems,
    subtotalCents,
    feeCents,
    totalCents,
    currency,
    className
}: OrderSummaryCardProps) {
    const formatPrice = (cents: number) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    return (
        <div className={cn(
            "bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6",
            className
        )}>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold">1</span>
                Order Summary
            </h2>

            {/* Line Items */}
            <div className="space-y-4 mb-6">
                {lineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0">
                            {item.images && item.images[0] ? (
                                <img
                                    src={item.images[0]}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                    📦
                                </div>
                            )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate">{item.name}</h3>
                            {item.description && (
                                <p className="text-sm text-zinc-400 truncate">{item.description}</p>
                            )}
                            <p className="text-sm text-zinc-500">Qty: {item.quantity}</p>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                            <span className="font-semibold text-white">
                                {formatPrice(item.total_cents)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-800 my-4" />

            {/* Pricing Breakdown */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Subtotal</span>
                    <span className="text-zinc-300">{formatPrice(subtotalCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Service Fee (1%)</span>
                    <span className="text-zinc-300">{formatPrice(feeCents)}</span>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-800 my-4" />

            {/* Total */}
            <div className="flex justify-between items-baseline">
                <span className="text-lg font-semibold text-white">Total</span>
                <div className="text-right">
                    <span className="text-2xl font-bold text-white">
                        {formatPrice(totalCents)}
                    </span>
                    <span className="text-sm text-zinc-400 ml-1">{currency}</span>
                </div>
            </div>
        </div>
    );
}
