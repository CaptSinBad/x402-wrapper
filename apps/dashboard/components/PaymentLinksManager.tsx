import React, { useEffect, useState } from 'react';

interface PaymentLink {
  id: string;
  token: string;
  seller_id: string;
  price_cents: number | null;
  currency: string | null;
  network: string | null;
  metadata: any;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function PaymentLinksManager() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number | null>(null);
  const [editCurrency, setEditCurrency] = useState<string>('USDC');

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/payment_links/list');
      if (!res.ok) throw new Error('Failed to fetch links');
      const data = await res.json();
      setLinks(data.links || []);
    } catch (err) {
      console.error('fetch links error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpire = async (id: string) => {
    if (!confirm('Expire this payment link?')) return;
    try {
      const res = await fetch('/api/payment_links/expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to expire link');
      await fetchLinks();
    } catch (err) {
      console.error('expire error', err);
    }
  };

  const handleUpdate = async (id: string) => {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    try {
      const res = await fetch('/api/payment_links/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          price_cents: editPrice,
          currency: editCurrency,
        }),
      });
      if (!res.ok) throw new Error('Failed to update link');
      setEditingId(null);
      await fetchLinks();
    } catch (err) {
      console.error('update error', err);
    }
  };

  const startEdit = (link: PaymentLink) => {
    setEditingId(link.id);
    setEditPrice(link.price_cents);
    setEditCurrency(link.currency || 'USDC');
  };

  if (loading) return <div>Loading payment links...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Payment Links</h2>
      {links.length === 0 ? (
        <p>No payment links yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>Token</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Price</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Currency</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Network</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Expires</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>
                  <code>{link.token}</code>
                </td>
                <td style={{ padding: '10px' }}>
                  {editingId === link.id ? (
                    <input
                      type="number"
                      value={editPrice ?? ''}
                      onChange={(e) => setEditPrice(e.target.value ? parseInt(e.target.value, 10) : null)}
                      style={{ width: '80px' }}
                    />
                  ) : (
                    link.price_cents || '-'
                  )}
                </td>
                <td style={{ padding: '10px' }}>
                  {editingId === link.id ? (
                    <input
                      type="text"
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      style={{ width: '80px' }}
                    />
                  ) : (
                    link.currency || '-'
                  )}
                </td>
                <td style={{ padding: '10px' }}>{link.network || '-'}</td>
                <td style={{ padding: '10px' }}>
                  {link.expires_at ? new Date(link.expires_at).toLocaleDateString() : 'Never'}
                </td>
                <td style={{ padding: '10px' }}>
                  {editingId === link.id ? (
                    <>
                      <button onClick={() => handleUpdate(link.id)}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ marginLeft: '5px' }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(link)}>Edit</button>
                      <button onClick={() => handleExpire(link.id)} style={{ marginLeft: '5px', color: 'red' }}>
                        Expire
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
