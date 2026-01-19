'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, DollarSign, Users, Clock, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateLinkDrawer } from './components/CreateLinkDrawer';
import { StatusBadge } from './components/StatusBadge';
import { EmptyState } from './components/EmptyState';
import { useAuthToken } from '@/app/hooks/useAuthToken';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Skeleton } from '@/app/components/ui/skeleton';

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
        setTimeout(() => setLoading(false), 800);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 p-1">
      <CreateLinkDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* 1. Header Area */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-white text-balance">Overview</h2>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-zinc-400">
          <Calendar className="w-4 h-4" />
          <span>Last 7 Days</span>
        </div>
      </div>

      {/* 2. Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Gross Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tabular-nums">
              ${stats.grossVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Pending Settlements</CardTitle>
            <Clock className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tabular-nums">
              ${stats.pendingSettlements.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tabular-nums">
              {stats.activeSubscribers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Recent Activity Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-medium text-white">Recent Payments</h3>
          {recentPayments.length > 0 && (
            <Button variant="link" asChild className="text-blue-500 decoration-blue-500/30 hover:decoration-blue-500">
              <Link href="/dashboard/payments">View All <ArrowUpRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          )}
        </div>

        {recentPayments.length === 0 ? (
          <EmptyState onAction={() => setIsDrawerOpen(true)} />
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-900 border-zinc-800">
                <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Product</TableHead>
                  <TableHead className="text-zinc-400">Amount</TableHead>
                  <TableHead className="text-zinc-400">Customer</TableHead>
                  <TableHead className="text-zinc-400">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="font-medium text-zinc-100 max-w-[150px] truncate">
                      {payment.productName || 'Payment'}
                    </TableCell>
                    <TableCell className="font-medium text-white tabular-nums">
                      {payment.amount}
                    </TableCell>
                    <TableCell className="text-zinc-400 font-mono text-xs">
                      {payment.customer || '—'}
                    </TableCell>
                    <TableCell className="text-zinc-500 tabular-nums text-sm">
                      {payment.date}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-1">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32 bg-zinc-800" />
        <Skeleton className="h-8 w-32 bg-zinc-800" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl bg-zinc-800" />)}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-48 bg-zinc-800" />
        <Skeleton className="h-64 w-full rounded-xl bg-zinc-800" />
      </div>
    </div>
  );
}
