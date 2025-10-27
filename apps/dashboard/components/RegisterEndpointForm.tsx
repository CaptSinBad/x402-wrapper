// components/RegisterEndpointForm.tsx

import { useState } from 'react';
import { supabase } from '../lib/supabase'; // your Supabase client
import { usePrivy } from '@privy-io/react-auth';

export default function RegisterEndpointForm() {
  const { user } = usePrivy();
  const [form, setForm] = useState({
    endpointUrl: '',
    price: '',
    currency: 'USDC',
    scheme: 'exact',
    network: 'base',
    facilitatorUrl: 'https://facilitator.cdp.coinbase.com',
    metadata: {}
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.wallet?.address) {
      alert('Connect your wallet first');
      return;
    }

    const { data, error } = await supabase.from('seller_endpoints').insert([
      {
        seller_wallet: user.wallet.address,
        endpoint_url: form.endpointUrl,
        price: parseFloat(form.price),
        currency: form.currency,
        scheme: form.scheme,
        network: form.network,
        facilitator_url: form.facilitatorUrl,
        metadata: form.metadata
      }
    ]);

    if (error) {
      console.error(error);
      alert('Failed to register endpoint');
    } else {
      console.log('Registered:', data);
      alert('Endpoint registered successfully');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="endpointUrl" type="text" placeholder="/api/data" onChange={handleChange} required />
      <input name="price" type="number" step="0.0001" placeholder="0.01" onChange={handleChange} required />
      <select name="scheme" onChange={handleChange}>
        <option value="exact">Exact</option>
        <option value="upto">Upto</option>
      </select>
      <button type="submit">Register Endpoint</button>
    </form>
  );
}
