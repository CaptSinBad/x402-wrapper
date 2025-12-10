// import { Card } from "@/lib/utils"; 

export function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center">
                <div className="h-8 w-32 bg-zinc-800/50 rounded-md"></div>
                <div className="h-8 w-40 bg-zinc-800/50 rounded-md"></div>
            </div>

            {/* Metrics Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-zinc-800/50 rounded-xl border border-zinc-800"></div>
                ))}
            </div>

            {/* Table Skeleton */}
            <div className="space-y-4">
                <div className="h-6 w-48 bg-zinc-800/50 rounded-md"></div>
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="h-10 bg-zinc-800/30 border-b border-zinc-800"></div>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 border-b border-zinc-800 bg-zinc-900/20"></div>
                    ))}
                </div>
            </div>
        </div>
    );
}
