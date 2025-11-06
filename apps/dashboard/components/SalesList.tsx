"use client";

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

type Sale = {
  id: string;
  item_id: string | null;
  item_title?: string | null;
  reservation_id: string | null;
  payment_attempt_id: string | null;
  settlement_id: string | null;
  qty: number;
  amount_cents: number;
  currency: string;
  purchaser_address: string | null;
  created_at: string;
};

export default function SalesList() {
  const { user } = usePrivy();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSales = async () => {
      if (!user?.wallet?.address) return;
      setLoading(true);
      try {
        const resp = await fetch('/api/sales', { method: 'GET', credentials: 'same-origin' });
        const json = await resp.json();
        if (!resp.ok) {
          console.error('Error fetching sales', json?.error || resp.statusText);
        } else {
          setSales(json.data || []);
        }
      } catch (e) {
        console.error('Error fetching sales', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [user?.wallet?.address]);

  if (!user?.wallet?.address) return <p className="text-gray-500">Connect your wallet to view sales.</p>;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sales</h2>
        <div>
          <a href="/api/sales?export=csv" className="text-sm text-blue-600 hover:underline">Export CSV</a>
        </div>
      </div>

      {loading ? <p>Loading…</p> : (
        <div className="space-y-2">
          {sales.length === 0 ? <p className="text-gray-500">No sales yet.</p> : (
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="p-2">When</th>
                  <th className="p-2">Item</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Buyer</th>
                  
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2 text-sm">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="p-2 text-sm">{s.item_title ?? s.item_id ?? '—'}</td>
                    <td className="p-2 text-sm">{s.qty}</td>
                    <td className="p-2 text-sm">{(s.amount_cents/100).toFixed(2)} {s.currency}</td>
                    <td className="p-2 text-sm">{s.purchaser_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
