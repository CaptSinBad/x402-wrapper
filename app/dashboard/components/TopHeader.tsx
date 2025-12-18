'use client';

import { usePathname } from 'next/navigation';
import { Search, HelpCircle, Bell } from 'lucide-react';
import Link from 'next/link';

export function TopHeader() {
    const pathname = usePathname();
    const segments = pathname?.split('/').filter(Boolean) || [];

    return (
        <header className="h-16 sticky top-0 z-40 w-full border-b border-border bg-[#0A0A0A]/80 backdrop-blur-md">
            <div className="flex h-16 items-center px-8 justify-between">

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span className="text-zinc-600">Inventory</span>
                    <span className="text-zinc-600">/</span>
                    {segments.map((segment, index) => (
                        <div key={segment} className="flex items-center gap-2">
                            <span className={index === segments.length - 1 ? "text-white font-medium capitalize" : "capitalize"}>
                                {segment.replace('-', ' ')}
                            </span>
                            {index < segments.length - 1 && <span className="text-zinc-600">/</span>}
                        </div>
                    ))}
                </div>

                {/* Center Command Bar Trigger */}
                <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-border hover:border-zinc-700 transition-all w-64 text-sm text-zinc-500">
                    <Search className="w-3.5 h-3.5" />
                    <span>Search...</span>
                    <span className="ml-auto text-xs font-mono bg-zinc-800 px-1 rounded text-zinc-400">⌘K</span>
                </button>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <Link href="/docs" className="text-sm text-zinc-400 hover:text-white transition-colors">Docs</Link>
                    <button className="text-zinc-400 hover:text-white transition-colors">
                        <HelpCircle className="w-4 h-4" />
                    </button>
                    <button className="text-zinc-400 hover:text-white transition-colors relative">
                        <Bell className="w-4 h-4" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full"></span>
                    </button>
                </div>
            </div>
        </header>
    );
}
