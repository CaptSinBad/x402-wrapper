"use client";

import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

type Payout = {
  id: string;
  amount_cents: number;
  currency: string;
  method: string;
  destination?: any;
  status: string;
  requested_at: string;
  processed_at?: string | null;
};

export default function PayoutsPanel() {
  const { user } = usePrivy();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('onchain');
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPayouts = async () => {
      if (!user?.wallet?.address) return;
      setLoading(true);
      try {
        const resp = await fetch('/api/payouts/list', { method: 'GET', credentials: 'same-origin' });
        const json = await resp.json();
        if (resp.ok) setPayouts(json.data || []);
        else console.error('Error fetching payouts', json);
      } catch (e) {
        console.error('Error fetching payouts', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPayouts();
  }, [user?.wallet?.address]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    try {
      const cents = Math.round(Number(amount) * 100);
      const resp = await fetch('/api/payouts/create', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount_cents: cents, method, currency: 'USDC', destination: { address: destination } }) });
      const json = await resp.json();
      if (resp.ok) {
        setPayouts(prev => [json.payout, ...prev]);
        setAmount('');
        setDestination('');
      } else {
        console.error('Error creating payout', json);
        alert(json.error || 'Error creating payout');
      }
    } catch (e) {
      console.error('Error creating payout', e);
      alert('Error creating payout');
    } finally { setSubmitting(false); }
  };

  if (!user?.wallet?.address) return <p className="text-gray-500">Connect your wallet to request payouts.</p>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Payouts</h2>
          <p className="text-sm text-gray-600">Request funds to be off‑ramped from your account.</p>
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div>
          <label className="block text-sm text-gray-700">Amount</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="0.00" />
        </div>

        <div>
          <label className="block text-sm text-gray-700">Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2">
            <option value="onchain">On‑chain (wallet)</option>
            <option value="bank">Bank transfer</option>
            <option value="stablecoin">Stablecoin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700">Destination (address / acct)</label>
          <input value={destination} onChange={e => setDestination(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="0x... or bank id" />
        </div>

        <div className="md:col-span-3">
          <button type="submit" className="mt-3 bg-blue-600 text-white px-4 py-2 rounded" disabled={submitting}>{submitting ? 'Requesting…' : 'Request Payout'}</button>
        </div>
      </form>

      <div>
        <h3 className="text-lg font-medium mb-2">Recent Payouts</h3>
        {loading ? <p>Loading…</p> : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="p-2">When</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Method</th>
                  <th className="p-2">Network</th>
                  <th className="p-2">Destination</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <tr><td className="p-2 text-gray-500" colSpan={6}>No payouts yet.</td></tr>
                ) : payouts.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 text-sm">{new Date(p.requested_at).toLocaleString()}</td>
                    <td className="p-2 text-sm">{(p.amount_cents/100).toFixed(2)} {p.currency}</td>
                    <td className="p-2 text-sm">{p.method}</td>
                    <td className="p-2 text-sm">{(p as any).metadata?.network ?? (p as any).network ?? '—'}</td>
                    <td className="p-2 text-sm">{(p as any).destination?.address ?? JSON.stringify((p as any).destination) ?? '—'}</td>
                    <td className="p-2 text-sm"><span className={`px-2 py-1 rounded text-sm ${p.status==='requested' ? 'bg-yellow-100 text-yellow-800' : p.status==='completed' ? 'bg-green-100 text-green-800' : p.status==='failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{p.status}</span></td>
                    <td className="p-2 text-sm">
                      {p.status === 'requested' && (
                        <div className="flex gap-2">
                          <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={async () => {
                            const tx = window.prompt('Optional tx hash (for on‑chain payouts), leave blank if not applicable');
                            try {
                              const resp = await fetch('/api/payouts/update', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: 'completed', tx_hash: tx || undefined }) });
                              const json = await resp.json();
                              if (resp.ok) setPayouts(prev => prev.map(x => x.id === p.id ? json.payout : x));
                              else alert(json.error || 'Failed to mark processed');
                            } catch (e) { console.error(e); alert('Error'); }
                          }}>Mark processed</button>
                          <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={async () => {
                            const reason = window.prompt('Reason for failure (optional)') || null;
                            try {
                              const resp = await fetch('/api/payouts/update', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: 'failed', metadata: { reason } }) });
                              const json = await resp.json();
                              if (resp.ok) setPayouts(prev => prev.map(x => x.id === p.id ? json.payout : x));
                              else alert(json.error || 'Failed to mark failed');
                            } catch (e) { console.error(e); alert('Error'); }
                          }}>Mark failed</button>
                        </div>
                      )}
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
