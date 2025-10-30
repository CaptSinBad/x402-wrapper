import React, { useState } from 'react';
import { createPaymentHeader } from '../../../sdk/client/src/example';

export default function PayDemoPage() {
  const [status, setStatus] = useState<string>('idle');
  const [requirements, setRequirements] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);

  async function requestResource() {
    setStatus('requesting');
    setRequirements(null);
    setResponse(null);

    const res = await fetch('/api/paid/resource');
    if (res.status === 402) {
      const json = await res.json();
      setRequirements(json);
      setStatus('payment_required');
      return;
    }

    const json = await res.json();
    setResponse(json);
    setStatus('success');
  }

  async function simulatePayment() {
    if (!requirements) return;
    setStatus('simulating_payment');
    const header = createPaymentHeader(requirements);
    const res = await fetch('/api/paid/resource', { headers: { 'X-PAYMENT': header } });
    const json = await res.json();
    setResponse(json);
    setStatus(res.ok ? 'paid' : 'payment_failed');
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Pay-demo</h1>
      <p>Demonstrates the protected resource flow using the demo SDK.</p>

      <div style={{ marginBottom: 12 }}>
        <button onClick={requestResource}>Request protected resource</button>
        <button onClick={simulatePayment} disabled={!requirements} style={{ marginLeft: 8 }}>
          Simulate payment
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {status}
      </div>

      {requirements && (
        <div style={{ marginTop: 12 }}>
          <h3>Payment requirements (402 response)</h3>
          <pre style={{ background: '#f6f8fa', padding: 12 }}>{JSON.stringify(requirements, null, 2)}</pre>
        </div>
      )}

      {response && (
        <div style={{ marginTop: 12 }}>
          <h3>Response</h3>
          <pre style={{ background: '#f6f8fa', padding: 12 }}>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { createPaymentHeader } from '../../../sdk/client/src/example';

export default function PayDemoPage() {
  const [status, setStatus] = useState<string>('idle');
  const [requirements, setRequirements] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);

  async function requestResource() {
    setStatus('requesting');
    setRequirements(null);
    setResponse(null);

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
