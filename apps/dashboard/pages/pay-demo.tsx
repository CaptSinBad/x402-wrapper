import React, { useState } from 'react';
import { payAndFetch, createSignedPaymentHeader } from '../../lib/payAndFetch';

export default function PayDemoPage() {
  const [walletAddress, setWalletAddress] = useState('0xDEADBEEF00000000000000000000000000000000');
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Install a simple mock provider on window.privy.provider for the demo.
  const installMockProvider = () => {
    (window as any).privy = (window as any).privy || {};
    (window as any).privy.provider = {
      request: async ({ method, params }: any) => {
        // Return a deterministic fake signature for eth_signTypedData_v4
        if (method === 'eth_signTypedData_v4') {
          const payload = params?.[1] || '{}';
          return '0xDEMO_SIGNATURE_' + btoa(String(payload)).slice(0, 24);
        }
        throw new Error('unsupported_method');
      },
    };
  };

  async function runDemo() {
    setLoading(true);
    setOutput(null);
    try {
      installMockProvider();

      const res = await payAndFetch('/api/demo/resource', {}, {
        createPayload: async ({ requirement, priceAtomic, walletAddress: wa }) =>
          createSignedPaymentHeader({ requirement, priceAtomic, walletAddress: wa }),
        walletAddress,
      });

      const json = await res.json().catch(() => null);
      setOutput(JSON.stringify({ status: res.status, body: json }, null, 2));
    } catch (err: any) {
      setOutput(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Buyer SDK demo — payAndFetch</h1>
      <p>This demo simulates a wallet using a mock provider and calls a demo monetized resource.</p>

      <label>
        Wallet address:{' '}
        <input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} style={{ width: 480 }} />
      </label>

      <div style={{ marginTop: 12 }}>
        <button onClick={runDemo} disabled={loading}>
          {loading ? 'Running…' : 'Pay & fetch demo resource'}
        </button>
      </div>

      <pre style={{ marginTop: 16, background: '#f6f8fa', padding: 12 }}>{output ?? 'No result yet'}</pre>
    </div>
  );
}
