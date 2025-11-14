"use client";

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Props = {
  token: string;
  linkUrl: string;
  priceCents?: number | null;
  currency?: string | null;
};

export default function PosClient({ token, linkUrl, priceCents, currency }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let canceled = false;
    async function gen() {
      try {
        const url = linkUrl || `${window.location.origin}/link/${encodeURIComponent(token)}`;
        const data = await QRCode.toDataURL(url, { margin: 1, width: 300 });
        if (!canceled) setQrDataUrl(data);
      } catch (e) {
        console.error('qr gen error', e);
      }
    }
    gen();
    return () => { canceled = true; };
  }, [token, linkUrl]);

  async function onPay() {
    setProcessing(true);
    try {
      // Placeholder: call a buy API or trigger wallet flow. For now show a small alert.
      alert('Trigger buyer SDK / wallet flow here.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Point of Sale — {token}</h2>
      {priceCents != null && (
        <div style={{ marginBottom: 8 }}>Price: ${(Number(priceCents) / 100).toFixed(2)} {currency || ''}</div>
      )}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {qrDataUrl ? <img src={qrDataUrl} alt="QR" style={{ width: 300, height: 300 }} /> : <div>Generating QR…</div>}
        <div>
          <button onClick={onPay} disabled={processing} style={{ padding: '8px 12px' }}>
            {processing ? 'Processing…' : 'Pay (wallet)'}
          </button>
          <div style={{ marginTop: 12 }}>
            <small>Scan with a wallet or click Pay to trigger the buyer flow.</small>
          </div>
        </div>
      </div>
    </div>
  );
}
