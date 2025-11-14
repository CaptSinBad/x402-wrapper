"use client";

import React, { useState } from 'react';

export default function DevSettleButton() {
  const [attemptId, setAttemptId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processNow, setProcessNow] = useState(true);
  const [result, setResult] = useState<any>(null);

  async function trigger() {
    setProcessing(true);
    setResult(null);
    try {
      const res = await fetch('/api/dev/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_attempt_id: attemptId, processNow }),
      });
      const json = await res.json();
      setResult({ status: res.status, body: json });
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{ marginTop: 16, marginBottom: 16, padding: 8, border: '1px dashed #ddd' }}>
      <h3 style={{ margin: 0 }}>Dev: Simulate Settlement</h3>
      <p style={{ margin: '8px 0' }}>Enter a <code>payment_attempt_id</code> to simulate a facilitator settlement for demo/testing.</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={attemptId} onChange={(e) => setAttemptId(e.target.value)} placeholder="attempt-123" />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={processNow} onChange={(e) => setProcessNow(e.target.checked)} /> Process now
        </label>
        <button onClick={trigger} disabled={processing || !attemptId}>
          {processing ? 'Running…' : 'Simulate'}
        </button>
      </div>
      {result && (
        <pre style={{ marginTop: 8, background: '#f6f8fa', padding: 8 }}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
