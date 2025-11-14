"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LinkPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [link, setLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchLink = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/link/${token}`);
        const json = await resp.json();
        if (resp.ok) setLink(json.link);
        else setMessage(json.error || 'Failed to load link');
      } catch (e) {
        setMessage('Network error');
      } finally { setLoading(false); }
    };
    fetchLink();
  }, [token]);

  const doPay = async () => {
    if (!link) return;
    setPaying(true);
    setMessage(null);
    try {
      const resp = await fetch(`/api/link/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `link-${token}-${Date.now()}` }, body: JSON.stringify({}) });
      const json = await resp.json();
      if (resp.ok) {
        setMessage('Payment attempt created. Use dev-settle to complete the sale in development.');
        // optional: navigate to a wait/receipt page
        // router.push(`/receipt/${json.attempt.id}`);
      } else {
        setMessage(json.error || 'Failed to create payment attempt');
      }
    } catch (e) {
      setMessage('Network error');
    } finally { setPaying(false); }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Payment Link</h1>
      {loading ? <p>Loading…</p> : (
        link ? (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-lg font-medium">{link.item?.title ?? 'Purchase'}</h2>
            <p className="text-sm text-gray-600">Merchant: {link.seller_id ?? '—'}</p>
            <div className="mt-4 mb-4">
              <div className="text-xl font-bold">{(link.price_cents ? (link.price_cents/100).toFixed(2) : '—')} {link.currency ?? 'USDC'}</div>
              <div className="text-sm text-gray-500">Network: {link.network ?? '—'}</div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded" disabled={paying} onClick={doPay}>{paying ? 'Creating…' : 'Pay'}</button>
            {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
          </div>
        ) : (
          <p className="text-red-600">Link not found or expired.</p>
        )
      )}
    </div>
  );
}

