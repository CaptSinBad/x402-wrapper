import React from 'react';
import PosClient from './client';

type Params = Promise<{ token: string }>;
type Props = { params: Params };

export default async function Page({ params }: Props) {
  const { token } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  try {
    const res = await fetch(`${base || ''}/api/link/${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (!res.ok) {
      return <div style={{ padding: 24 }}>Link not found or error ({res.status})</div>;
    }
    const { link } = await res.json();

    const linkUrl = `${base || ''}/link/${encodeURIComponent(token)}`;

    return (
      <div style={{ padding: 24 }}>
        <PosClient token={token} linkUrl={linkUrl} priceCents={link.price_cents} currency={link.currency} />
      </div>
    );
  } catch (err) {
    return <div style={{ padding: 24 }}>Error loading link</div>;
  }
}
