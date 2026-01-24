'use client';

import { Shield, Lock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustBadgesProps {
    network?: string;
    className?: string;
}

export function TrustBadges({ network = 'base-sepolia', className }: TrustBadgesProps) {
    const isMainnet = network === 'base-mainnet';

    return (
        <div className={cn("flex flex-wrap items-center justify-center gap-4 sm:gap-6", className)}>
            <div className="flex items-center gap-1.5 text-zinc-400">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">256-bit SSL</span>
            </div>

            <div className="flex items-center gap-1.5 text-zinc-400">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Secure Payment</span>
            </div>

            <div className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                isMainnet
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
            )}>
                <Zap className="w-3 h-3" />
                <span>{isMainnet ? 'Base Mainnet' : 'Base Testnet'}</span>
            </div>
        </div>
    );
}
