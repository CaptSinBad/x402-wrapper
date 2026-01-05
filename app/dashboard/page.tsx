'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Calendar, DollarSign, Users, Clock, AlertCircle } from 'lucide-react';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { EmptyState } from './components/EmptyState';
import { cn } from '@/lib/utils';
import { CreateLinkDrawer } from './components/CreateLinkDrawer';
import { StatusBadge } from './components/StatusBadge';

import { useAuthToken } from '@/app/hooks/useAuthToken';

export default function DashboardPage() {
  const { authFetch } = useAuthToken();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    grossVolume: 0,
    pendingSettlements: 0,
    activeSubscribers: 0,
  });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Parallel fetching
        const [statsRes, paymentsRes] = await Promise.all([
          authFetch('/api/dashboard/stats'),
          authFetch('/api/dashboard/recent-payments')
        ]);

        const statsData = await statsRes.json();
        const paymentsData = await paymentsRes.json();

        setStats({
          grossVolume: parseFloat(statsData.totalRevenue) || 0,
          pendingSettlements: 0, // dynamic later
          activeSubscribers: 0, // dynamic later
        });

        setRecentPayments(paymentsData.payments || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        // Minimum loading time for smooth UX
        setTimeout(() => setLoading(false), 800);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Drawer */}
      <CreateLinkDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* 1. Greeting Area */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-medium tracking-tight text-white">Overview</h2>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 cursor-not-allowed hover:bg-zinc-800 transition-colors">
          <Calendar className="w-4 h-4" />
          <span>Last 7 Days</span>
        </div>
      </div>

      {/* 2. Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Gross Volume"
          value={stats.grossVolume}
          formattedValue={`$${stats.grossVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Pending Settlements"
          value={stats.pendingSettlements}
          formattedValue={`$${stats.pendingSettlements.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Clock}
        />
        <MetricCard
          title="Active Subscribers"
          value={stats.activeSubscribers}
          formattedValue={stats.activeSubscribers.toString()}
          icon={Users}
        />
      </div>

      {/* 3. Recent Activity Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-medium text-white">Recent Payments</h3>
        </div>

        {recentPayments.length === 0 ? (
          <EmptyState onAction={() => setIsDrawerOpen(true)} />
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium tracking-wider">Status</th>
                  <th className="px-6 py-3 font-medium tracking-wider">Amount</th>
                  <th className="px-6 py-3 font-medium tracking-wider">Customer</th>
                  <th className="px-6 py-3 font-medium tracking-wider">Date</th>
                  <th className="px-6 py-3 font-medium tracking-wider text-right">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="group hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-6 py-4 font-medium text-white tabular-nums">
                      {payment.amount}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {payment.customer || '—'}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 tabular-nums">
                      {payment.date}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      {payment.id.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, formattedValue, icon: Icon }: any) {
  return (
    <div className="group relative p-6 bg-[#111111] border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all duration-200">
      {/* Micro-interaction: glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-zinc-500">{title}</span>
        <Icon className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </div>
      <div className="text-2xl font-semibold text-white tracking-tight tabular-nums">
        {formattedValue}
      </div>
    </div>
  );
}
