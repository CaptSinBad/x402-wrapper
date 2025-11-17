"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { usePrivy } from '@privy-io/react-auth';

type SellerEndpoint = {
  id: string;
  endpoint_url: string;
  price: number;
  currency: string;
  scheme: string;
  network: string;
  facilitator_url: string;
  metadata: any;
  seller_wallet: string;
};

export default function SellerEndpointsList() {
  const { user } = usePrivy();
  const [endpoints, setEndpoints] = useState<SellerEndpoint[]>([]);

  useEffect(() => {
    const fetchEndpoints = async () => {
      if (!user?.wallet?.address) return;

      try {
        const resp = await fetch('/api/seller_endpoints', {
          method: 'GET',
          credentials: 'same-origin'
        });

        const result = await resp.json();
        if (!resp.ok) {
          console.error('Error fetching endpoints:', result?.error || resp.statusText);
        } else {
          setEndpoints(result.data as SellerEndpoint[]);
        }
      } catch (err) {
        console.error('Error fetching endpoints:', err);
      }
    };

    fetchEndpoints();
  }, [user?.wallet?.address]);

  if (!user?.wallet?.address) {
    return <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>Connect your wallet to view your endpoints.</p>;
  }

  if (endpoints.length === 0) {
    return <p style={{ color: '#666', fontSize: 14, marginTop: 8, padding: 12, background: '#f6f8fa', borderRadius: 6, borderLeft: '4px solid #ddd' }}>No endpoints registered yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {endpoints.map((ep) => (
        <div 
          key={ep.id} 
          style={{ 
            border: '1px solid #e1e4e8', 
            borderRadius: 6, 
            padding: 16, 
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <span style={{ display: 'block', fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Endpoint</span>
              <span style={{ fontSize: 14, fontFamily: 'monospace', color: '#0366d6' }}>{ep.endpoint_url}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Price</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{ep.price} {ep.currency}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Scheme</span>
              <span style={{ fontSize: 14, background: '#f0f4f8', padding: '2px 8px', borderRadius: 3, display: 'inline-block' }}>{ep.scheme}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Network</span>
              <span style={{ fontSize: 14, background: '#f0f4f8', padding: '2px 8px', borderRadius: 3, display: 'inline-block' }}>{ep.network}</span>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ display: 'block', fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Facilitator URL</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#666', wordBreak: 'break-all' }}>{ep.facilitator_url}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
