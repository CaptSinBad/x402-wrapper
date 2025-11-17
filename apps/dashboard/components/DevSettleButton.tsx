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
      
      let json;
      try {
        const text = await res.text();
        json = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        json = { error: `Failed to parse response (${res.status}): ${String(parseErr)}` };
      }
      
      setResult({ status: res.status, body: json, ok: res.ok });
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{ marginTop: 16, marginBottom: 16, padding: 20, border: '2px dashed #fdb913', borderRadius: 8, background: '#fffbf0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 24 }}>⚙️</div>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: '#d4940f' }}>Dev: Trigger Settlement</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
            Simulate a facilitator settlement webhook for a payment attempt to test the settlement flow.
          </p>
        </div>
      </div>

      <div style={{ background: '#fff9f0', padding: 12, borderRadius: 6, marginBottom: 16, borderLeft: '4px solid #fdb913' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 500, color: '#d4940f' }}>📋 How it works:</p>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#666' }}>
          <li>Enter a payment attempt ID from your sales list</li>
          <li>The system will simulate a facilitator settlement webhook</li>
          <li>Check "Process Now" to immediately process the settlement</li>
          <li>View the result below to see the settlement status</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#24292f' }}>
            Payment Attempt ID <span style={{ color: '#d1242f' }}>*</span>
          </label>
          <input 
            value={attemptId} 
            onChange={(e) => setAttemptId(e.target.value)} 
            placeholder="attempt-uuid or similar"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 13,
              fontFamily: 'monospace',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#0366d6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#ddd')}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}>
          <input 
            type="checkbox" 
            checked={processNow} 
            onChange={(e) => setProcessNow(e.target.checked)} 
            style={{ cursor: 'pointer', width: 16, height: 16 }} 
          /> 
          <span>Process immediately</span>
        </label>
        <button 
          onClick={trigger} 
          disabled={processing || !attemptId}
          style={{
            padding: '8px 14px',
            background: processing || !attemptId ? '#ccc' : '#d4940f',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: processing || !attemptId ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => { if (!processing && attemptId) e.currentTarget.style.background = '#c08809'; }}
          onMouseOut={(e) => { if (!processing && attemptId) e.currentTarget.style.background = '#d4940f'; }}
        >
          {processing ? 'Processing...' : '→ Trigger'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 16, borderTop: '1px solid #f0e0d0', paddingTop: 16 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: '#24292f' }}>
            {result.ok ? '✅ Settlement Triggered' : '❌ Error'}
          </h4>
          <pre style={{ 
            margin: 0, 
            padding: 12, 
            background: '#f6f8fa', 
            borderRadius: 4, 
            overflow: 'auto', 
            fontSize: 11, 
            border: `1px solid ${result.ok ? '#28a745' : '#d1242f'}`,
            maxHeight: 250,
            fontFamily: 'monospace',
            color: '#24292f',
            lineHeight: 1.4
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
