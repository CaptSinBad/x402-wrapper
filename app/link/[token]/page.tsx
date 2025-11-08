import React from 'react';

type Props = { params: { token: string } };

export default async function Page({ params }: Props) {
  const token = params.token;
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  try {
    const res = await fetch(`${base || ''}/api/link/${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (!res.ok) {
      return <div style={{ padding: 24 }}>Link not found or error ({res.status})</div>;
    }
    const { link } = await res.json();

    return (
      <div style={{ padding: 24 }}>
        <h1>Payment Link</h1>
        <p><strong>Token:</strong> {link.token}</p>
        {link.item_id && <p><strong>Item:</strong> {link.item_id}</p>}
        {link.endpoint_id && <p><strong>Endpoint:</strong> {link.endpoint_id}</p>}
        {link.price_cents != null && <p><strong>Price:</strong> ${(Number(link.price_cents) / 100).toFixed(2)} {link.currency || ''}</p>}
        <div style={{ marginTop: 16 }}>
          <button onClick={() => alert('Implement Pay flow using SDK / wallet')}>Pay (use buyer SDK)</button>
        </div>
      </div>
    );
  } catch (err) {
    return <div style={{ padding: 24 }}>Error loading link</div>;
  }
}
