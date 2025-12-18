import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase();

    const styles = {
        succeeded: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        settled: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",

        pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        processing: "bg-amber-500/10 text-amber-500 border-amber-500/20",

        failed: "bg-red-500/10 text-red-500 border-red-500/20",
        cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    }[normalizedStatus] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";

    const dotColor = {
        succeeded: "bg-emerald-500",
        settled: "bg-emerald-500",
        paid: "bg-emerald-500",

        pending: "bg-amber-500",
        processing: "bg-amber-500",

        failed: "bg-red-500",
        cancelled: "bg-zinc-500",
    }[normalizedStatus] || "bg-zinc-500";

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
            styles,
            className
        )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
            <span className="capitalize">{status}</span>
        </span>
    );
}
