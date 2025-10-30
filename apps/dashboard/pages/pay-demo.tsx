import React, { useState } from 'react';
import { createPaymentHeader } from '../../../sdk/client/src/example';

const PayDemoPage: React.FC = () => {
  const [status, setStatus] = useState<string>('idle');
  const [requirements, setRequirements] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);

  async function requestResource() {
    setStatus('requesting');
    setRequirements(null);
    setResponse(null);

    try {
      const res = await fetch('/api/paid/resource');
      if (res.status === 402) {
        const json = await res.json();
        setRequirements(json);
        setStatus('payment_required');
        return;
      }

      const json = await res.json().catch(() => null);
      setResponse(json);
      setStatus(res.ok ? 'success' : 'error');
    } catch (err: any) {
      setResponse({ error: String(err) });
      setStatus('error');
    }
  }

  async function simulatePayment() {
    if (!requirements) return;
    setStatus('simulating_payment');
    try {
      const header = createPaymentHeader(requirements);
      const res = await fetch('/api/paid/resource', { headers: { 'X-PAYMENT': header } });
      const json = await res.json().catch(() => null);
      setResponse(json);
      setStatus(res.ok ? 'paid' : 'payment_failed');
    } catch (err: any) {
      setResponse({ error: String(err) });
      setStatus('payment_failed');
    }
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
};

export default PayDemoPage;
