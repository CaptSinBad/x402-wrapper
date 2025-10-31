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
    return <p className="text-gray-500">Connect your wallet to view your endpoints.</p>;
  }

  if (endpoints.length === 0) {
    return <p className="text-gray-500">No endpoints registered yet.</p>;
  }

  return (
    <div className="space-y-4">
      {endpoints.map((ep) => (
        <div key={ep.id} className="border p-4 rounded shadow">
          <p><strong>URL:</strong> {ep.endpoint_url}</p>
          <p><strong>Price:</strong> {ep.price} {ep.currency}</p>
          <p><strong>Scheme:</strong> {ep.scheme}</p>
          <p><strong>Network:</strong> {ep.network}</p>
          <p><strong>Facilitator:</strong> {ep.facilitator_url}</p>
        </div>
      ))}
    </div>
  );
}
