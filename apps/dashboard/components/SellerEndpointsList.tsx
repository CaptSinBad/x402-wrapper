// components/SellerEndpointsList.tsx

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePrivy } from '@privy-io/react-auth';

export default function SellerEndpointsList() {
  const { user } = usePrivy();
  const [endpoints, setEndpoints] = useState([]);

  useEffect(() => {
    const fetchEndpoints = async () => {
      if (!user?.wallet?.address) return;

      const { data, error } = await supabase
        .from('seller_endpoints')
        .select('*')
        .eq('seller_wallet', user.wallet.address);

      if (error) console.error(error);
      else setEndpoints(data);
    };

    fetchEndpoints();
  }, [user]);

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Your Registered Endpoints</h2>
      <ul className="space-y-2">
        {endpoints.map((ep) => (
          <li key={ep.id} className="border p-4 rounded">
            <div><strong>URL:</strong> {ep.endpoint_url}</div>
            <div><strong>Price:</strong> {ep.price} {ep.currency}</div>
            <div><strong>Scheme:</strong> {ep.scheme}</div>
            <div><strong>Network:</strong> {ep.network}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
