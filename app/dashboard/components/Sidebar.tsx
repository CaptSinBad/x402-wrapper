'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter, usePathname } from 'next/navigation';
import {
    CreditCard,
    Wallet,
    ShoppingBag,
    Link as LinkIcon,
    Code2,
    Home,
    Settings,
    User,
    ChevronsUpDown,
    Search,
    Store,
    FolderOpen,
    Package,
    LogOut
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuthToken } from '@/app/hooks/useAuthToken';

export function Sidebar() {
    const pathname = usePathname();
    const { authFetch } = useAuthToken();
    const [projects, setProjects] = useState<any[]>([]);
    const [activeProject, setActiveProject] = useState<any>(null);
    const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await authFetch('/api/projects/create');
            if (response.ok) {
                const data = await response.json();
                setProjects(data.projects);
                if (data.projects.length > 0) {
                    setActiveProject(data.projects[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigation = [
        { name: 'Overview', href: '/dashboard', icon: Home },
        { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
        { name: 'Balances', href: '/dashboard/balances', icon: Wallet },
        { name: 'Payment Links', href: '/dashboard/payment-links', icon: LinkIcon },
    ];

    const storeNav = [
        { name: 'Store Settings', href: '/dashboard/store/setup', icon: Store },
        { name: 'Orders', href: '/dashboard/orders', icon: Package },
        { name: 'Products', href: '/dashboard/products', icon: ShoppingBag },
    ];

    const devNav = [
        { name: 'Developers', href: '/dashboard/developers', icon: Code2 },
        { name: 'API Keys', href: '/dashboard/developers/api-keys', icon: Code2 },
        { name: 'Webhooks', href: '/dashboard/developers/webhooks', icon: Code2 },
    ];

    const isActive = (path: string) => pathname === path;

    const { logout } = usePrivy();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <div className={cn(
            "w-[240px] flex flex-col fixed inset-y-0 left-0 bg-[#0A0A0A] border-r border-border z-50",
            activeProject?.mode === 'test' && "border-r-orange-500/30" // Subtle hint of test mode
        )}>
            {/* Project Switcher */}
            <div className="p-4">
                <button
                    onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800 group"
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        {activeProject ? (
                            <>
                                <div className={cn(
                                    "w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shrink-0",
                                    activeProject.environment === 'live' ? "bg-primary" : "bg-orange-500"
                                )}>
                                    {activeProject.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col items-start truncate">
                                    <span className="text-sm font-medium text-zinc-200 truncate w-full text-left">{activeProject.name}</span>
                                    <span className={cn(
                                        "text-[10px] uppercase font-bold tracking-wider",
                                        activeProject.environment === 'live' ? "text-zinc-500" : "text-orange-500"
                                    )}>
                                        {activeProject.environment}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-zinc-800 animate-pulse" />
                                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                            </div>
                        )}
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                </button>

                {/* Dropdown (Simplified for MVP) */}
                {isProjectMenuOpen && (
                    <div className="absolute top-[70px] left-4 w-[208px] bg-surface border border-border rounded-lg shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                        {projects.map(p => (
                            <button
                                key={p.id}
                                onClick={() => { setActiveProject(p); setIsProjectMenuOpen(false); }}
                                className="w-full flex items-center gap-2 p-2 rounded hover:bg-zinc-800 text-left"
                            >
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    p.environment === 'live' ? "bg-primary" : "bg-orange-500"
                                )} />
                                <span className="text-sm text-zinc-300">{p.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-6">

                {/* Main Nav */}
                <div className="space-y-0.5">
                    {navigation.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all",
                                isActive(item.href)
                                    ? "bg-zinc-800/50 text-white border-l-2 border-primary pl-[10px]"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-900 border-l-2 border-transparent"
                            )}
                        >
                            <item.icon className={cn("w-4 h-4", isActive(item.href) ? "text-primary" : "text-zinc-500")} />
                            {item.name}
                        </Link>
                    ))}
                </div>

                {/* Store Nav */}
                <div>
                    <h3 className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 font-mono">Storefront</h3>
                    <div className="space-y-0.5">
                        {storeNav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all",
                                    isActive(item.href)
                                        ? "bg-zinc-800/50 text-white border-l-2 border-primary pl-[10px]"
                                        : "text-zinc-400 hover:text-white hover:bg-zinc-900 border-l-2 border-transparent"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", isActive(item.href) ? "text-primary" : "text-zinc-500")} />
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Dev Nav */}
                <div>
                    <h3 className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 font-mono">Developers</h3>
                    <div className="space-y-0.5">
                        {devNav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all",
                                    isActive(item.href)
                                        ? "bg-zinc-800/50 text-white border-l-2 border-primary pl-[10px]"
                                        : "text-zinc-400 hover:text-white hover:bg-zinc-900 border-l-2 border-transparent"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", isActive(item.href) ? "text-primary" : "text-zinc-500")} />
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* User Profile & Logout */}
            <div className="p-4 border-t border-border mt-auto space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/50">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                        <div className="text-sm font-medium text-zinc-200">Merchant</div>
                        <div className="text-xs text-zinc-500 truncate">merchant@binahpay.com</div>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-900 hover:text-red-400 text-zinc-400 transition-colors text-sm"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}
