"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { usePrivy } from '@privy-io/react-auth';

export default function RegisterEndpointForm() {
  const { user, authenticated } = usePrivy();
  const [form, setForm] = useState({
    endpointUrl: '',
    price: '',
    currency: 'USDC',
    scheme: 'exact',
    network: 'base',
    facilitatorUrl: 'https://facilitator.cdp.coinbase.com',
    metadata: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!authenticated || !user?.wallet?.address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);

    try {
      // Post to server-side API which uses the Supabase service key and verifies the user.
      const resp = await fetch('/api/seller_endpoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // ensure cookies (privy id token) are sent for same-origin requests
        credentials: 'same-origin',
        body: JSON.stringify({
          endpointUrl: form.endpointUrl,
          price: form.price,
          currency: form.currency,
          scheme: form.scheme,
          network: form.network,
          facilitatorUrl: form.facilitatorUrl,
          metadata: form.metadata
        })
      });

      const result = await resp.json();

      if (!resp.ok) {
        const msg = result?.error || 'Failed to register endpoint';
        throw new Error(msg);
      }

      alert('Endpoint registered successfully! ✅');

      // Reset form
      setForm({
        endpointUrl: '',
        price: '',
        currency: 'USDC',
        scheme: 'exact',
        network: 'base',
        facilitatorUrl: 'https://facilitator.cdp.coinbase.com',
        metadata: {}
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to register endpoint');
    } finally {
      setLoading(false);
    }
  };

  const walletAddress = user?.wallet?.address;

  if (!authenticated) {
    return (
      <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">Please connect your wallet to register endpoints</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Endpoint URL</label>
        <input
          name="endpointUrl"
          type="text"
          placeholder="/api/data"
          value={form.endpointUrl}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Price (USDC)</label>
        <input
          name="price"
          type="number"
          step="0.0001"
          placeholder="0.01"
          value={form.price}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Payment Scheme</label>
        <select
          name="scheme"
          value={form.scheme}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="exact">Exact</option>
          <option value="upto">Up To</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Registering...' : 'Register Endpoint'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Connected: {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
      </p>
    </form>
  );
}