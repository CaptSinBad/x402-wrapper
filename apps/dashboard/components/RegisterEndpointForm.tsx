import { useState } from 'react';
import { supabase } from '../../lib/supabase'; // adjust path if needed
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      alert('Endpoint registered successfully');
      console.log('Registered:', data);
      setForm({
        endpointUrl: '',
        price: '',
        currency: 'USDC',
        scheme: 'exact',
        network: 'base',
        facilitatorUrl: 'https://facilitator.cdp.coinbase.com',
        metadata: {}
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        name="endpointUrl"
        type="text"
        placeholder="/api/data"
        value={form.endpointUrl}
        onChange={handleChange}
        required
        className="w-full border p-2"
      />
      <input
        name="price"
        type="number"
        step="0.0001"
        placeholder="0.01"
        value={form.price}
        onChange={handleChange}
        required
        className="w-full border p-2"
      />
      <select
        name="scheme"
        value={form.scheme}
        onChange={handleChange}
        className="w-full border p-2"
      >
        <option value="exact">Exact</option>
        <option value="upto">Upto</option>
      </select>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Register Endpoint
      </button>
    </form>
  );
}
