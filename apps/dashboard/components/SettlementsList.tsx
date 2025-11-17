"use client";

import React, { useEffect, useState } from 'react';

type Settlement = {
  id: string;
  status: string;
  attempts?: number;
  last_error?: string | null;
  tx_hash?: string | null;
  created_at?: string;
  updated_at?: string;
  facilitator_request?: any;
  facilitator_response?: any;
};

export default function SettlementsList() {
  const [rows, setRows] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRows() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settlements');
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setRows(json.data || []);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
    const id = setInterval(fetchRows, 10000);
    return () => clearInterval(id);
  }, []);

  async function retryRow(id: string) {
    try {
      const res = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', id }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
    } catch (err) {
      alert('Retry failed: ' + String(err));
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#24292f' }}>Settlements</h2>
      {loading && <div style={{ color: '#666', fontSize: 14, padding: 12 }}>Loading...</div>}
      {error && <div style={{ color: '#d1242f', background: '#fee', padding: 12, borderRadius: 6, borderLeft: '4px solid #d1242f', fontSize: 14, marginBottom: 12 }}>{error}</div>}
      <div style={{ overflowX: 'auto', border: '1px solid #e1e4e8', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f6f8fa', borderBottom: '1px solid #e1e4e8' }}>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>ID</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Attempts</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>TX Hash</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Last Error</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Created</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #e1e4e8', transition: 'background-color 0.2s' }}>
                <td style={{ fontFamily: 'monospace', fontSize: 12, padding: 12, color: '#0366d6' }}>{r.id}</td>
                <td style={{ padding: 12, fontSize: 13 }}>
                  <span style={{ 
                    background: r.status === 'confirmed' ? '#d4edda' : r.status === 'failed' ? '#f8d7da' : '#fff3cd', 
                    color: r.status === 'confirmed' ? '#155724' : r.status === 'failed' ? '#721c24' : '#856404',
                    padding: '2px 8px',
                    borderRadius: 3,
                    fontSize: 12,
                    fontWeight: 500
                  }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: 12, fontSize: 13, textAlign: 'center' }}>{r.attempts ?? 0}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12, padding: 12, color: '#666' }}>{r.tx_hash ?? '-'}</td>
                <td style={{ padding: 12, fontSize: 12, color: '#d1242f', fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 200 }}>{r.last_error ?? '-'}</td>
                <td style={{ padding: 12, fontSize: 13 }}>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                <td style={{ padding: 12 }}>
                  {r.status !== 'queued' && (
                    <button 
                      onClick={() => retryRow(r.id)} 
                      style={{ 
                        padding: '6px 12px',
                        background: '#0366d6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#0256c7')}
                      onMouseOut={(e) => (e.currentTarget.style.background = '#0366d6')}
                    >
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
