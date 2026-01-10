'use client';

import { StatusBadge as OldStatusBadge } from '@/app/dashboard/components/StatusBadge';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/lib/utils';

// Maps backend status to Badge variant
const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
    succeeded: "success",
    settled: "success",
    paid: "success",
    pending: "warning",
    processing: "warning",
    failed: "destructive",
    cancelled: "secondary",
};

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase();
    const variant = statusVariantMap[normalizedStatus] || "outline";

    return (
        <Badge variant={variant} className={cn("capitalize", className)}>
            {status}
        </Badge>
    );
}
