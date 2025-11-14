import React from 'react';
import dynamic from 'next/dynamic';

const PayoutsPanel = dynamic(() => import('../components/PayoutsPanel'), { ssr: false });

export default function Page() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Payouts</h1>
      <p>Request and review your payout requests.</p>
      <div style={{ marginTop: 16 }}>
        <PayoutsPanel />
      </div>
    </div>
  );
}
