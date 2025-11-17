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
      <div style={{ padding: 16, background: '#fff8f0', border: '1px solid #f2ad6e', borderRadius: 6, textAlign: 'center' }}>
        <p style={{ color: '#8b4513', margin: 0, fontSize: 14 }}>Please connect your wallet to register endpoints</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Help Info Section */}
      <div style={{ background: '#f0f9ff', border: '1px solid #74c0fc', borderRadius: 8, padding: 14, marginBottom: 4 }}>
        <div style={{ fontSize: 13, color: '#1971c2', lineHeight: 1.5 }}>
          <strong>📋 What's an Endpoint URL?</strong><br/>
          An endpoint URL is the path to a protected resource on your server. When buyers request it, they'll need to pay using x402 protocol.
          <br/><br/>
          <strong>Examples:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li><code style={{background: '#fff', padding: '2px 6px', borderRadius: 2, fontFamily: 'monospace', fontSize: 12}}>/api/data/export</code> - API endpoint that exports data</li>
            <li><code style={{background: '#fff', padding: '2px 6px', borderRadius: 2, fontFamily: 'monospace', fontSize: 12}}>/premium/reports</code> - Premium report resource</li>
            <li><code style={{background: '#fff', padding: '2px 6px', borderRadius: 2, fontFamily: 'monospace', fontSize: 12}}>/content/analysis</code> - AI analysis results</li>
          </ul>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee', border: '1px solid #f77', borderRadius: 6, padding: 12, color: '#c33', fontSize: 14 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#24292f' }}>
          Endpoint URL <span style={{ color: '#d1242f' }}>*</span>
        </label>
        <input
          name="endpointUrl"
          type="text"
          placeholder="/api/data"
          value={form.endpointUrl}
          onChange={handleChange}
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 14,
            fontFamily: 'monospace',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#0366d6')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
        />
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          The path to your protected resource. This is the URL suffix that buyers will pay to access.
          <br/>Examples: <code style={{background: '#f0f4f8', padding: '2px 4px', borderRadius: 2}}>/api/data</code>, <code style={{background: '#f0f4f8', padding: '2px 4px', borderRadius: 2}}>/premium/reports</code>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#24292f' }}>
          Price (USDC) <span style={{ color: '#d1242f' }}>*</span>
        </label>
        <input
          name="price"
          type="number"
          step="0.0001"
          placeholder="0.01"
          value={form.price}
          onChange={handleChange}
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 14,
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#0366d6')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
        />
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Amount in USDC to charge per request</div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#24292f' }}>
          Payment Scheme <span style={{ color: '#d1242f' }}>*</span>
        </label>
        <select
          name="scheme"
          value={form.scheme}
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 14,
            boxSizing: 'border-box',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#0366d6')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
        >
          <option value="exact">Exact amount</option>
          <option value="upto">Up to this amount</option>
        </select>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Whether payment is exact or has a maximum</div>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '10px 16px',
          background: loading ? '#ccc' : '#0366d6',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          marginTop: 4,
        }}
        onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = '#0256c7'; }}
        onMouseOut={(e) => { if (!loading) e.currentTarget.style.background = '#0366d6'; }}
      >
        {loading ? 'Registering...' : 'Register Endpoint'}
      </button>

      <div style={{ fontSize: 12, color: '#666', textAlign: 'center', paddingTop: 8, borderTop: '1px solid #eee' }}>
        <strong>Wallet:</strong> {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
      </div>
    </form>
  );
}