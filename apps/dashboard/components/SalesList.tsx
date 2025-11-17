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

  if (!user?.wallet?.address) return <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>Connect your wallet to view sales.</p>;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#24292f' }}>Sales</h3>
        <div>
          <a 
            href="/api/sales?export=csv" 
            style={{ fontSize: 13, color: '#0366d6', textDecoration: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            Export CSV
          </a>
        </div>
      </div>

      {loading ? <p style={{ color: '#666' }}>Loading…</p> : (
        <div>
          {sales.length === 0 ? (
            <p style={{ color: '#666', fontSize: 14, padding: 12, background: '#f6f8fa', borderRadius: 6 }}>No sales yet.</p>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e1e4e8', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f6f8fa', borderBottom: '1px solid #e1e4e8' }}>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>When</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Item</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Qty</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Buyer</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e1e4e8', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: 12, fontSize: 13, color: '#24292f' }}>{new Date(s.created_at).toLocaleString()}</td>
                      <td style={{ padding: 12, fontSize: 13, color: '#24292f', fontFamily: 'monospace' }}>{s.item_title ?? s.item_id ?? '—'}</td>
                      <td style={{ padding: 12, fontSize: 13, color: '#24292f', textAlign: 'center' }}>{s.qty}</td>
                      <td style={{ padding: 12, fontSize: 13, color: '#24292f', fontWeight: 600 }}>{(s.amount_cents/100).toFixed(2)} {s.currency}</td>
                      <td style={{ padding: 12, fontSize: 13, color: '#24292f', fontFamily: 'monospace' }}>{s.purchaser_address ? `${s.purchaser_address.slice(0, 6)}...${s.purchaser_address.slice(-4)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
