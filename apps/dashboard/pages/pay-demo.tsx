"use client";

import React, { useState } from 'react';
import { createPaymentHeader } from '../../../sdk/client/src/example';
import { createSignedPaymentHeader } from '../../lib/payAndFetch';
import { usePrivy } from '@privy-io/react-auth';

const defaultFakeRequirements = {
  amount: 100,
  asset: 'USDC',
  network: 'testnet',
  seller: 'demo-seller',
};

const PayDemoPage: React.FC = () => {
  const [status, setStatus] = useState<string>('idle');
  const [requirements, setRequirements] = useState<any>(null);
  const [paymentAttempt, setPaymentAttempt] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);
  const [fakeMode, setFakeMode] = useState<boolean>(true);
  const [fakeReqInput, setFakeReqInput] = useState<string>(JSON.stringify(defaultFakeRequirements, null, 2));
  const [endpointUrl, setEndpointUrl] = useState<string>('/xlayer/test');
  const { user, authenticated } = usePrivy();

  async function requestResource() {
    setStatus('requesting');
    setRequirements(null);
    setResponse(null);
    setPaymentAttempt(null);

  if (fakeMode) {
      // Simulate a 402 response with editable requirements
      try {
        const parsed = JSON.parse(fakeReqInput);
        setRequirements(parsed);
        setStatus('payment_required (fake)');
      } catch (e: any) {
        setStatus('error');
        setResponse({ error: 'Invalid JSON in fake requirements' });
      }
      return;
    }

    try {
      // Try create_payment_session first (if an endpoint exists in DB)
      const createRes = await fetch('/api/create_payment_session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint_url: endpointUrl }) });
      if (createRes.status === 201) {
        const json = await createRes.json();
        setRequirements(json.paymentRequirements);
        setPaymentAttempt(json.paymentAttempt);
        setStatus('payment_required');
        return;
      }

      // Fallback: hit the protected resource to receive a 402 with requirements
      const res = await fetch('/api/paid/resource');
      if (res.status === 402) {
        const pr = await res.json();
        setRequirements(pr);
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
    setResponse(null);

    if (fakeMode) {
      // In fake mode simulate success/failure deterministically
      await new Promise((r) => setTimeout(r, 600));
      // Simple heuristic: if amount <= 0 fail, else succeed
      const ok = !requirements.amount || Number(requirements.amount) > 0;
      setResponse({ success: ok, settledAmount: requirements.amount ?? 0, note: 'Simulated by fake-mode' });
      setStatus(ok ? 'paid (fake)' : 'payment_failed (fake)');
      return;
    }

    try {
      // Live flow: sign using Privy/injected wallet and submit to server
      const walletAddress = (user as any)?.wallet?.address;
      if (!authenticated || !walletAddress) {
        setStatus('error');
        setResponse({ error: 'Please connect your wallet (Privy) to perform live payment' });
        return;
      }
      // requirement object is the first accept entry
      const requirement = requirements.accepts ? requirements.accepts[0] : requirements;

      const paymentPayload = await createSignedPaymentHeader({
        requirement,
        priceAtomic: requirement.maxAmountRequired ?? '0',
        walletAddress,
      });

      // include attempt id in requirements if present
      const requirementsWithAttempt = { ...requirements };
      if (paymentAttempt && paymentAttempt.id) requirementsWithAttempt.attempt_id = paymentAttempt.id;

      const headerObj = { paymentPayload, paymentRequirements: requirementsWithAttempt };
      const header = Buffer.from(JSON.stringify(headerObj), 'utf8').toString('base64');
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
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1>Pay-demo</h1>
      <p>Demonstrates the protected resource flow using the demo SDK. Use fake-mode to run locally without network calls.</p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 12 }}>
          <input type="checkbox" checked={fakeMode} onChange={(e) => setFakeMode(e.target.checked)} />{' '}
          Fake-mode (no network)
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button onClick={requestResource}>1) Request protected resource</button>
        <button onClick={simulatePayment} disabled={!requirements} style={{ marginLeft: 8 }}>
          2) Simulate / Submit payment
        </button>
        <button
          onClick={() => {
            setStatus('idle');
            setRequirements(null);
            setResponse(null);
          }}
          style={{ marginLeft: 8 }}
        >
          Reset
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {status}
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <div style={{ width: 300 }}>
          <label>Endpoint URL for demo</label>
          <input value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h3>Fake requirements (editable)</h3>
          <textarea
            value={fakeReqInput}
            onChange={(e) => setFakeReqInput(e.target.value)}
            rows={8}
            style={{ width: '100%', fontFamily: 'monospace' }}
          />
          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            Edit the simulated 402 response. Must be valid JSON. Example: amount, asset, network.
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {requirements && (
            <div>
              <h3>Payment requirements</h3>
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
      </div>
    </div>
  );
};

export default PayDemoPage;
