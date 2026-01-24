'use client';

import { CheckCircle2, ExternalLink, ArrowLeft, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/app/components/ui/button';
import confetti from 'canvas-confetti';

interface CheckoutSuccessProps {
    txHash: string;
    amount: string;
    currency: string;
    network: string;
    productName?: string;
    onReturn: () => void;
    className?: string;
}

export function CheckoutSuccess({
    txHash,
    amount,
    currency,
    network,
    productName,
    onReturn,
    className
}: CheckoutSuccessProps) {
    const [copied, setCopied] = useState(false);

    const explorerUrl = network === 'base-mainnet'
        ? `https://basescan.org/tx/${txHash}`
        : `https://sepolia.basescan.org/tx/${txHash}`;

    const copyTxHash = () => {
        navigator.clipboard.writeText(txHash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Trigger confetti on mount
    useState(() => {
        setTimeout(() => {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#22c55e', '#4ade80']
            });
        }, 300);
    });

    return (
        <div className={cn(
            "bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 text-center max-w-md mx-auto",
            className
        )}>
            {/* Success Icon */}
            <div className="mb-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center animate-in zoom-in-50 duration-500">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
            </div>

            {/* Success Message */}
            <h2 className="text-2xl font-bold text-white mb-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-150">
                Payment Successful!
            </h2>
            <p className="text-zinc-400 mb-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200">
                Your payment of <span className="text-white font-semibold">{amount} {currency}</span> has been confirmed.
            </p>

            {/* Product Info */}
            {productName && (
                <div className="mb-6 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 animate-in fade-in-0 duration-500 delay-300">
                    <p className="text-sm text-zinc-400">You purchased</p>
                    <p className="text-lg font-semibold text-white">{productName}</p>
                </div>
            )}

            {/* Transaction Hash */}
            <div className="mb-6 animate-in fade-in-0 duration-500 delay-400">
                <p className="text-sm text-zinc-400 mb-2">Transaction Hash</p>
                <div className="flex items-center gap-2 justify-center">
                    <code className="text-xs text-zinc-300 font-mono bg-zinc-800 px-3 py-2 rounded-lg">
                        {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </code>
                    <button
                        onClick={copyTxHash}
                        className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        {copied ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                            <Copy className="w-4 h-4 text-zinc-400" />
                        )}
                    </button>
                    <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4 text-zinc-400" />
                    </a>
                </div>
            </div>

            {/* Return Button */}
            <Button
                onClick={onReturn}
                className="w-full h-12 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold animate-in fade-in-0 duration-500 delay-500"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Store
            </Button>

            {/* Powered By */}
            <p className="mt-6 text-xs text-zinc-500">
                Powered by <span className="text-violet-400 font-medium">BinahPay</span>
            </p>
        </div>
    );
}
