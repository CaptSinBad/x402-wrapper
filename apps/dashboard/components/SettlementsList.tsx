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
    <div>
      <h2>Settlements</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>tx_hash</th>
            <th>Last error</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: '1px solid #ddd' }}>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</td>
              <td>{r.status}</td>
              <td>{r.attempts ?? 0}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.tx_hash ?? '-'}</td>
              <td style={{ color: 'crimson' }}>{r.last_error ?? '-'}</td>
              <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
              <td>
                {r.status !== 'queued' && (
                  <button onClick={() => retryRow(r.id)} style={{ marginRight: 8 }}>
                    Retry
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
