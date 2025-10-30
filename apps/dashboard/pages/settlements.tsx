import React from 'react';
import SettlementsList from '../components/SettlementsList';

export default function Page() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Settlement Queue</h1>
      <p>View queued/failed settlements and manually retry them.</p>
      <SettlementsList />
    </div>
  );
}
