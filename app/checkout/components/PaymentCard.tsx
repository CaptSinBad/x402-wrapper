'use client';

import { useState } from 'react';
import { Wallet, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/app/components/ui/button';

interface PaymentCardProps {
    email: string;
    onEmailChange: (email: string) => void;
    isConnected: boolean;
    isConnecting: boolean;
    isPaying: boolean;
    walletAddress?: string;
    onConnect: () => void;
    onPay: () => void;
    disabled?: boolean;
    error?: string;
    className?: string;
}

export function PaymentCard({
    email,
    onEmailChange,
    isConnected,
    isConnecting,
    isPaying,
    walletAddress,
    onConnect,
    onPay,
    disabled,
    error,
    className
}: PaymentCardProps) {
    const [emailFocused, setEmailFocused] = useState(false);

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className={cn(
            "bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6",
            className
        )}>
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold">2</span>
                Payment
            </h2>

            {/* Email Field */}
            <div className="mb-6">
                <label className="text-sm text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email for receipt (optional)
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="you@example.com"
                    className={cn(
                        "w-full px-4 py-3 rounded-xl bg-zinc-800/50 border-2 transition-all duration-200",
                        "text-white placeholder:text-zinc-500",
                        "focus:outline-none",
                        emailFocused
                            ? "border-violet-500 bg-zinc-800"
                            : "border-zinc-700 hover:border-zinc-600"
                    )}
                />
            </div>

            {/* Wallet Connection */}
            <div className="mb-6">
                <label className="text-sm text-zinc-400 mb-2 block">
                    Payment Method
                </label>

                {isConnected && walletAddress ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-emerald-400">Wallet Connected</p>
                            <p className="text-xs text-zinc-400 font-mono">{formatAddress(walletAddress)}</p>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={onConnect}
                        disabled={isConnecting || disabled}
                        className={cn(
                            "w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all duration-200",
                            "hover:bg-zinc-800 hover:border-violet-500/50",
                            isConnecting
                                ? "border-violet-500 bg-violet-500/10"
                                : "border-zinc-700 bg-zinc-800/30"
                        )}
                    >
                        {isConnecting ? (
                            <>
                                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                                <span className="text-violet-400 font-medium">Connecting...</span>
                            </>
                        ) : (
                            <>
                                <Wallet className="w-5 h-5 text-zinc-400" />
                                <span className="text-zinc-300 font-medium">Connect Wallet</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Pay Button */}
            <Button
                onClick={onPay}
                disabled={!isConnected || isPaying || disabled}
                className={cn(
                    "w-full h-14 text-lg font-semibold rounded-xl transition-all duration-200",
                    isConnected && !isPaying
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25"
                        : "bg-zinc-700 cursor-not-allowed"
                )}
            >
                {isPaying ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing Payment...
                    </span>
                ) : isConnected ? (
                    'Complete Payment'
                ) : (
                    'Connect Wallet to Pay'
                )}
            </Button>

            {/* Helper Text */}
            <p className="mt-4 text-xs text-center text-zinc-500">
                Payment is processed securely on the blockchain.
                <br />
                You'll need to approve the transaction in your wallet.
            </p>
        </div>
    );
}
